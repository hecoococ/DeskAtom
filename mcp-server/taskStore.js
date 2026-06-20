import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

const TASKS_FILE_NAME = 'tasks.json'
export const TASK_SCHEMA_VERSION = 2
export const INBOX_GROUP_ID = 'inbox'
export const ALL_GROUP_ID = 'all'

function getDefaultDataDir() {
  if (process.env.DESKATOM_DATA_DIR) {
    return process.env.DESKATOM_DATA_DIR
  }

  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'DeskAtom')
  }

  return path.join(os.homedir(), '.deskatom')
}

export function getTasksFilePath(dataDir = getDefaultDataDir()) {
  return path.join(dataDir, TASKS_FILE_NAME)
}

export function createInboxGroup() {
  return {
    id: INBOX_GROUP_ID,
    name: '收件箱',
    createdAt: 0
  }
}

function normalizeGroupName(name) {
  return typeof name === 'string' ? name.trim() : ''
}

function createGroupId(name, existingIds = new Set()) {
  const base = normalizeGroupName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'group'

  let id = base
  let index = 2
  while (existingIds.has(id) || id === ALL_GROUP_ID) {
    id = `${base}-${index++}`
  }
  return id
}

function normalizeGroup(rawGroup, existingIds) {
  if (!rawGroup || typeof rawGroup !== 'object') return null
  const name = normalizeGroupName(rawGroup.name)
  if (!name) return null

  const rawId = typeof rawGroup.id === 'string' ? rawGroup.id.trim() : ''
  const id = rawId && rawId !== ALL_GROUP_ID && !existingIds.has(rawId)
    ? rawId
    : createGroupId(name, existingIds)

  existingIds.add(id)
  return {
    id,
    name,
    createdAt: Number.isFinite(Number(rawGroup.createdAt)) ? Number(rawGroup.createdAt) : Date.now()
  }
}

function normalizeGroups(rawGroups) {
  const groups = []
  const existingIds = new Set()
  const inbox = createInboxGroup()
  groups.push(inbox)
  existingIds.add(inbox.id)

  if (Array.isArray(rawGroups)) {
    for (const rawGroup of rawGroups) {
      if (rawGroup?.id === INBOX_GROUP_ID) {
        const name = normalizeGroupName(rawGroup.name)
        groups[0] = {
          ...inbox,
          name: name || inbox.name,
          createdAt: Number.isFinite(Number(rawGroup.createdAt)) ? Number(rawGroup.createdAt) : inbox.createdAt
        }
        continue
      }

      const group = normalizeGroup(rawGroup, existingIds)
      if (group) groups.push(group)
    }
  }

  return groups
}

function normalizeGroupIds(rawGroupIds, validGroupIds) {
  const ids = Array.isArray(rawGroupIds) ? rawGroupIds : []
  const normalizedIds = []
  const seenIds = new Set()

  for (const rawId of ids) {
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    if (!id || !validGroupIds.has(id) || seenIds.has(id)) continue
    seenIds.add(id)
    normalizedIds.push(id)
  }

  return normalizedIds.length > 0 ? normalizedIds : [INBOX_GROUP_ID]
}

function normalizeTask(rawTask, validGroupIds) {
  if (!rawTask || typeof rawTask !== 'object') return null

  const id = Number(rawTask.id)
  const text = typeof rawTask.text === 'string' ? rawTask.text.trim() : ''

  if (!Number.isFinite(id) || text.length === 0) return null

  return {
    id,
    text,
    completed: Boolean(rawTask.completed),
    groupIds: normalizeGroupIds(rawTask.groupIds, validGroupIds)
  }
}

export function normalizeTaskData(rawData) {
  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData)
    } catch {
      rawData = {}
    }
  }

  const legacyTasks = Array.isArray(rawData)
  const rawGroups = legacyTasks ? [] : rawData?.groups
  const rawTasks = legacyTasks ? rawData : rawData?.tasks
  const groups = normalizeGroups(rawGroups)
  const validGroupIds = new Set(groups.map((group) => group.id))
  const tasks = []
  const seenTaskIds = new Set()

  if (Array.isArray(rawTasks)) {
    for (const rawTask of rawTasks) {
      const task = normalizeTask(rawTask, validGroupIds)
      if (!task || seenTaskIds.has(task.id)) continue
      seenTaskIds.add(task.id)
      tasks.push(task)
    }
  }

  return {
    schemaVersion: TASK_SCHEMA_VERSION,
    groups,
    tasks
  }
}

export function normalizeTasks(rawTasks) {
  return normalizeTaskData(rawTasks).tasks
}

async function ensureDataDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export async function readTaskData(options = {}) {
  const filePath = options.filePath || getTasksFilePath(options.dataDir)

  try {
    const content = await fs.readFile(filePath, 'utf8')
    return normalizeTaskData(JSON.parse(content))
  } catch (error) {
    if (error.code === 'ENOENT') return normalizeTaskData({})
    if (error instanceof SyntaxError) {
      throw new Error('任务数据文件不是有效 JSON，请检查或备份后重置 tasks.json。')
    }
    throw error
  }
}

export async function writeTaskData(taskData, options = {}) {
  const filePath = options.filePath || getTasksFilePath(options.dataDir)
  const normalizedData = normalizeTaskData(taskData)
  const tempFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await ensureDataDir(filePath)
  await fs.writeFile(tempFilePath, `${JSON.stringify(normalizedData, null, 2)}\n`, 'utf8')
  await fs.rename(tempFilePath, filePath)
  return normalizedData
}

export async function readTasks(options = {}) {
  return (await readTaskData(options)).tasks
}

export async function writeTasks(tasks, options = {}) {
  const currentData = await readTaskData(options)
  const taskData = await writeTaskData({
    ...currentData,
    tasks
  }, options)
  return taskData.tasks
}

function createTaskId(tasks) {
  const now = Date.now()
  const maxId = tasks.reduce((max, task) => Math.max(max, Number(task.id) || 0), 0)
  return Math.max(now, maxId + 1)
}

export function getTaskSummary(tasks, groupId = ALL_GROUP_ID) {
  const matchingTasks = filterTasksByGroup(tasks, groupId)
  const total = matchingTasks.length
  const completed = matchingTasks.filter((task) => task.completed).length
  const pending = total - completed
  return { total, completed, pending }
}

export function getGroupSummaries(taskData) {
  const data = normalizeTaskData(taskData)
  return data.groups.map((group) => ({
    ...group,
    summary: getTaskSummary(data.tasks, group.id)
  }))
}

export function filterTasksByGroup(tasks, groupId = ALL_GROUP_ID) {
  if (!groupId || groupId === ALL_GROUP_ID) return tasks
  return tasks.filter((task) => Array.isArray(task.groupIds) && task.groupIds.includes(groupId))
}

function assertGroupExists(taskData, groupId) {
  if (groupId === ALL_GROUP_ID) {
    throw new Error(`group_id 不能是虚拟分组 '${ALL_GROUP_ID}'。`)
  }
  if (!taskData.groups.some((group) => group.id === groupId)) {
    throw new Error(`找不到 id 为 ${groupId} 的分组。`)
  }
}

function normalizeRequestedGroupIds(groupIds, taskData) {
  const ids = groupIds == null ? [INBOX_GROUP_ID] : groupIds
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('group_ids 必须是非空分组 id 数组。')
  }

  const normalizedIds = []
  const seenIds = new Set()
  for (const rawId of ids) {
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    if (!id) throw new Error('group_ids 中不能包含空分组 id。')
    assertGroupExists(taskData, id)
    if (!seenIds.has(id)) {
      seenIds.add(id)
      normalizedIds.push(id)
    }
  }

  return normalizedIds
}

function normalizeTaskId(id) {
  const taskId = Number(id)
  if (!Number.isFinite(taskId)) {
    throw new Error('任务 id 必须是数字。')
  }
  return taskId
}

function assertUniqueValues(values, label) {
  const seenValues = new Set()
  for (const value of values) {
    if (seenValues.has(value)) {
      throw new Error(`重复的${label}: ${value}。`)
    }
    seenValues.add(value)
  }
}

function createTaskResult(taskData, extra = {}) {
  return {
    ...extra,
    groups: taskData.groups,
    tasks: taskData.tasks,
    summary: getTaskSummary(taskData.tasks)
  }
}

export async function addTask(text, options = {}) {
  const trimmedText = typeof text === 'string' ? text.trim() : ''
  if (!trimmedText) {
    throw new Error('任务文本不能为空，请提供 text。')
  }

  const taskData = await readTaskData(options)
  const groupIds = normalizeRequestedGroupIds(options.groupIds, taskData)
  const task = {
    id: createTaskId(taskData.tasks),
    text: trimmedText,
    completed: false,
    groupIds
  }
  const nextTaskData = await writeTaskData({
    ...taskData,
    tasks: [task, ...taskData.tasks]
  }, options)
  return createTaskResult(nextTaskData, { task })
}

function normalizeAddTaskInputs(items, taskData, defaultGroupIds) {
  if (!Array.isArray(items)) {
    throw new Error('tasks 必须是任务文本数组或任务对象数组。')
  }

  const normalized = []
  for (const item of items) {
    const text = typeof item === 'string' ? item.trim() : (typeof item?.text === 'string' ? item.text.trim() : '')
    if (!text) continue
    const groupIds = normalizeRequestedGroupIds(
      typeof item === 'object' && item !== null && Object.prototype.hasOwnProperty.call(item, 'groupIds')
        ? item.groupIds
        : defaultGroupIds,
      taskData
    )
    normalized.push({ text, groupIds })
  }

  if (normalized.length === 0) {
    throw new Error('请至少提供一个非空任务文本。')
  }

  return normalized
}

export async function addTasks(items, options = {}) {
  const taskData = await readTaskData(options)
  const normalizedItems = normalizeAddTaskInputs(items, taskData, options.groupIds)
  let nextId = createTaskId(taskData.tasks)
  const addedTasks = normalizedItems.map((item) => ({
    id: nextId++,
    text: item.text,
    completed: false,
    groupIds: item.groupIds
  }))
  const nextTaskData = await writeTaskData({
    ...taskData,
    tasks: [...addedTasks, ...taskData.tasks]
  }, options)
  return createTaskResult(nextTaskData, { added: addedTasks })
}

function applyTaskUpdates(task, updates, taskData) {
  const hasText = Object.prototype.hasOwnProperty.call(updates || {}, 'text')
  const hasCompleted = Object.prototype.hasOwnProperty.call(updates || {}, 'completed')
  const hasGroupIds = Object.prototype.hasOwnProperty.call(updates || {}, 'groupIds')

  if (!hasText && !hasCompleted && !hasGroupIds) {
    throw new Error(`任务 ${task.id} 没有可更新字段，请提供 text、completed 或 groupIds。`)
  }

  const updatedTask = { ...task }

  if (hasText) {
    const trimmedText = typeof updates.text === 'string' ? updates.text.trim() : ''
    if (!trimmedText) {
      throw new Error(`任务 ${task.id} 的 text 不能为空。`)
    }
    updatedTask.text = trimmedText
  }

  if (hasCompleted) {
    updatedTask.completed = Boolean(updates.completed)
  }

  if (hasGroupIds) {
    updatedTask.groupIds = normalizeRequestedGroupIds(updates.groupIds, taskData)
  }

  return updatedTask
}

export async function updateTask(id, updates, options = {}) {
  const taskId = normalizeTaskId(id)
  const taskData = await readTaskData(options)
  const index = taskData.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  const updatedTask = applyTaskUpdates(taskData.tasks[index], updates, taskData)
  const nextTasks = taskData.tasks.slice()
  nextTasks[index] = updatedTask
  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { task: updatedTask })
}

export async function updateTasks(updatesList, options = {}) {
  if (!Array.isArray(updatesList) || updatesList.length === 0) {
    throw new Error('updates 必须是非空数组。')
  }

  const normalizedUpdates = updatesList.map((updates) => ({
    ...updates,
    id: normalizeTaskId(updates?.id)
  }))
  assertUniqueValues(normalizedUpdates.map((updates) => updates.id), '任务 id')

  const taskData = await readTaskData(options)
  const taskIndexes = new Map(taskData.tasks.map((task, index) => [task.id, index]))
  const missingIds = normalizedUpdates
    .map((updates) => updates.id)
    .filter((id) => !taskIndexes.has(id))

  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const nextTasks = taskData.tasks.slice()
  const updatedTasks = []

  for (const updates of normalizedUpdates) {
    const index = taskIndexes.get(updates.id)
    const updatedTask = applyTaskUpdates(nextTasks[index], updates, taskData)
    nextTasks[index] = updatedTask
    updatedTasks.push(updatedTask)
  }

  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { updated: updatedTasks })
}

export async function setTasksCompleted(ids, completed, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueValues(normalizedIds, '任务 id')

  return updateTasks(
    normalizedIds.map((id) => ({ id, completed: Boolean(completed) })),
    options
  )
}

export async function setTasksGroups(ids, groupIds, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueValues(normalizedIds, '任务 id')

  return updateTasks(
    normalizedIds.map((id) => ({ id, groupIds })),
    options
  )
}

export async function addTasksToGroups(ids, groupIds, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueValues(normalizedIds, '任务 id')

  const taskData = await readTaskData(options)
  const requestedGroupIds = normalizeRequestedGroupIds(groupIds, taskData)
  const taskIndexes = new Map(taskData.tasks.map((task, index) => [task.id, index]))
  const missingIds = normalizedIds.filter((id) => !taskIndexes.has(id))
  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const nextTasks = taskData.tasks.slice()
  const updatedTasks = []
  for (const id of normalizedIds) {
    const index = taskIndexes.get(id)
    const nextGroupIds = Array.from(new Set([...nextTasks[index].groupIds, ...requestedGroupIds]))
    nextTasks[index] = { ...nextTasks[index], groupIds: nextGroupIds }
    updatedTasks.push(nextTasks[index])
  }

  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { updated: updatedTasks })
}

export async function removeTasksFromGroups(ids, groupIds, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueValues(normalizedIds, '任务 id')

  const taskData = await readTaskData(options)
  const requestedGroupIds = normalizeRequestedGroupIds(groupIds, taskData)
  const removeIds = new Set(requestedGroupIds)
  const taskIndexes = new Map(taskData.tasks.map((task, index) => [task.id, index]))
  const missingIds = normalizedIds.filter((id) => !taskIndexes.has(id))
  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const nextTasks = taskData.tasks.slice()
  const updatedTasks = []
  for (const id of normalizedIds) {
    const index = taskIndexes.get(id)
    const nextGroupIds = nextTasks[index].groupIds.filter((groupId) => !removeIds.has(groupId))
    nextTasks[index] = {
      ...nextTasks[index],
      groupIds: nextGroupIds.length > 0 ? nextGroupIds : [INBOX_GROUP_ID]
    }
    updatedTasks.push(nextTasks[index])
  }

  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { updated: updatedTasks })
}

export async function toggleTask(id, options = {}) {
  const taskId = normalizeTaskId(id)
  const taskData = await readTaskData(options)
  const task = taskData.tasks.find((item) => item.id === taskId)
  if (!task) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  return updateTask(taskId, { completed: !task.completed }, options)
}

export async function toggleTasks(ids, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueValues(normalizedIds, '任务 id')

  const taskData = await readTaskData(options)
  const taskIndexes = new Map(taskData.tasks.map((task, index) => [task.id, index]))
  const missingIds = normalizedIds.filter((id) => !taskIndexes.has(id))

  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const nextTasks = taskData.tasks.slice()
  const updatedTasks = []

  for (const id of normalizedIds) {
    const index = taskIndexes.get(id)
    const updatedTask = {
      ...nextTasks[index],
      completed: !nextTasks[index].completed
    }
    nextTasks[index] = updatedTask
    updatedTasks.push(updatedTask)
  }

  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { updated: updatedTasks })
}

export async function deleteTask(id, options = {}) {
  const taskId = normalizeTaskId(id)
  const taskData = await readTaskData(options)
  const index = taskData.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  const nextTasks = taskData.tasks.slice()
  const [deletedTask] = nextTasks.splice(index, 1)
  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { task: deletedTask })
}

export async function deleteTasks(ids, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueValues(normalizedIds, '任务 id')

  const taskData = await readTaskData(options)
  const existingIds = new Set(taskData.tasks.map((task) => task.id))
  const missingIds = normalizedIds.filter((id) => !existingIds.has(id))

  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const deleteIds = new Set(normalizedIds)
  const deletedTasks = taskData.tasks.filter((task) => deleteIds.has(task.id))
  const nextTasks = taskData.tasks.filter((task) => !deleteIds.has(task.id))
  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { deleted: deletedTasks })
}

export async function clearTasks(filter = 'completed', options = {}) {
  if (!['all', 'completed'].includes(filter)) {
    throw new Error("filter 只能是 'all' 或 'completed'。")
  }

  const groupId = options.groupId || ALL_GROUP_ID
  const taskData = await readTaskData(options)
  const nextTasks = taskData.tasks.filter((task) => {
    const inGroup = groupId === ALL_GROUP_ID || task.groupIds.includes(groupId)
    if (!inGroup) return true
    return filter === 'completed' ? !task.completed : false
  })
  const cleared = taskData.tasks.length - nextTasks.length
  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { cleared })
}

export async function reorderTask(id, placement, options = {}) {
  const taskId = normalizeTaskId(id)
  const beforeId = placement?.before_id == null ? null : Number(placement.before_id)
  const afterId = placement?.after_id == null ? null : Number(placement.after_id)

  if ((beforeId == null && afterId == null) || (beforeId != null && afterId != null)) {
    throw new Error('请提供 before_id 或 after_id 二选一。')
  }

  const taskData = await readTaskData(options)
  const currentIndex = taskData.tasks.findIndex((task) => task.id === taskId)
  if (currentIndex === -1) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  const targetId = beforeId ?? afterId
  if (targetId === taskId) {
    throw new Error('不能将任务移动到自己前后。')
  }

  const nextTasks = taskData.tasks.slice()
  const [movingTask] = nextTasks.splice(currentIndex, 1)
  const targetIndex = nextTasks.findIndex((task) => task.id === targetId)
  if (targetIndex === -1) {
    throw new Error(`找不到目标任务 id ${targetId}。`)
  }

  const insertIndex = beforeId != null ? targetIndex : targetIndex + 1
  nextTasks.splice(insertIndex, 0, movingTask)
  const nextTaskData = await writeTaskData({ ...taskData, tasks: nextTasks }, options)
  return createTaskResult(nextTaskData, { task: movingTask })
}

export async function createGroup(name, options = {}) {
  const groupName = normalizeGroupName(name)
  if (!groupName) {
    throw new Error('分组名称不能为空。')
  }

  const taskData = await readTaskData(options)
  if (taskData.groups.some((group) => group.name === groupName)) {
    throw new Error(`已存在名为 ${groupName} 的分组。`)
  }

  const group = {
    id: createGroupId(groupName, new Set(taskData.groups.map((item) => item.id))),
    name: groupName,
    createdAt: Date.now()
  }
  const nextTaskData = await writeTaskData({
    ...taskData,
    groups: [...taskData.groups, group]
  }, options)
  return createTaskResult(nextTaskData, { group })
}

export async function createGroups(names, options = {}) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error('names 必须是非空分组名称数组。')
  }

  const normalizedNames = names.map(normalizeGroupName).filter(Boolean)
  if (normalizedNames.length === 0) {
    throw new Error('请至少提供一个非空分组名称。')
  }
  assertUniqueValues(normalizedNames, '分组名称')

  const taskData = await readTaskData(options)
  const existingNames = new Set(taskData.groups.map((group) => group.name))
  const duplicatedNames = normalizedNames.filter((name) => existingNames.has(name))
  if (duplicatedNames.length > 0) {
    throw new Error(`已存在这些分组名称: ${duplicatedNames.join(', ')}。`)
  }

  const existingIds = new Set(taskData.groups.map((group) => group.id))
  const createdGroups = normalizedNames.map((name) => {
    const id = createGroupId(name, existingIds)
    existingIds.add(id)
    return { id, name, createdAt: Date.now() }
  })
  const nextTaskData = await writeTaskData({
    ...taskData,
    groups: [...taskData.groups, ...createdGroups]
  }, options)
  return createTaskResult(nextTaskData, { created: createdGroups })
}

export async function updateGroup(id, updates, options = {}) {
  const groupId = typeof id === 'string' ? id.trim() : ''
  if (!groupId) throw new Error('分组 id 不能为空。')
  if (groupId === INBOX_GROUP_ID) throw new Error('不能重命名默认收件箱分组。')

  const taskData = await readTaskData(options)
  const index = taskData.groups.findIndex((group) => group.id === groupId)
  if (index === -1) throw new Error(`找不到 id 为 ${groupId} 的分组。`)

  const name = normalizeGroupName(updates?.name)
  if (!name) throw new Error('分组名称不能为空。')
  if (taskData.groups.some((group) => group.id !== groupId && group.name === name)) {
    throw new Error(`已存在名为 ${name} 的分组。`)
  }

  const nextGroups = taskData.groups.slice()
  const group = { ...nextGroups[index], name }
  nextGroups[index] = group
  const nextTaskData = await writeTaskData({ ...taskData, groups: nextGroups }, options)
  return createTaskResult(nextTaskData, { group })
}

export async function updateGroups(updatesList, options = {}) {
  if (!Array.isArray(updatesList) || updatesList.length === 0) {
    throw new Error('updates 必须是非空分组更新数组。')
  }

  const ids = updatesList.map((updates) => (typeof updates?.id === 'string' ? updates.id.trim() : ''))
  if (ids.some((id) => !id)) throw new Error('每个分组更新都必须提供 id。')
  assertUniqueValues(ids, '分组 id')

  const taskData = await readTaskData(options)
  const groupIndexes = new Map(taskData.groups.map((group, index) => [group.id, index]))
  const missingIds = ids.filter((id) => !groupIndexes.has(id))
  if (missingIds.length > 0) throw new Error(`找不到这些分组 id: ${missingIds.join(', ')}。`)
  if (ids.includes(INBOX_GROUP_ID)) throw new Error('不能重命名默认收件箱分组。')

  const nextGroups = taskData.groups.slice()
  const updatedGroups = []
  for (const updates of updatesList) {
    const name = normalizeGroupName(updates.name)
    if (!name) throw new Error(`分组 ${updates.id} 的名称不能为空。`)
    const duplicate = nextGroups.find((group) => group.id !== updates.id && group.name === name)
    if (duplicate) throw new Error(`已存在名为 ${name} 的分组。`)
    const index = groupIndexes.get(updates.id)
    nextGroups[index] = { ...nextGroups[index], name }
    updatedGroups.push(nextGroups[index])
  }

  const nextTaskData = await writeTaskData({ ...taskData, groups: nextGroups }, options)
  return createTaskResult(nextTaskData, { updated: updatedGroups })
}

function deleteGroupsFromTaskData(taskData, groupIds, mode) {
  if (groupIds.includes(INBOX_GROUP_ID)) {
    throw new Error('不能删除默认收件箱分组。')
  }
  if (groupIds.includes(ALL_GROUP_ID)) {
    throw new Error(`不能删除虚拟分组 '${ALL_GROUP_ID}'。`)
  }

  const deleteIds = new Set(groupIds)
  const missingIds = groupIds.filter((id) => !taskData.groups.some((group) => group.id === id))
  if (missingIds.length > 0) throw new Error(`找不到这些分组 id: ${missingIds.join(', ')}。`)

  const deletedGroups = taskData.groups.filter((group) => deleteIds.has(group.id))
  const nextGroups = taskData.groups.filter((group) => !deleteIds.has(group.id))
  const deletedTasks = []
  const nextTasks = []

  for (const task of taskData.tasks) {
    const remainingGroupIds = task.groupIds.filter((groupId) => !deleteIds.has(groupId))
    const onlyDeletedGroups = remainingGroupIds.length === 0

    if (mode === 'delete_tasks' && onlyDeletedGroups) {
      deletedTasks.push(task)
      continue
    }

    nextTasks.push({
      ...task,
      groupIds: onlyDeletedGroups ? [INBOX_GROUP_ID] : remainingGroupIds
    })
  }

  return {
    deletedGroups,
    deletedTasks,
    taskData: {
      ...taskData,
      groups: nextGroups,
      tasks: nextTasks
    }
  }
}

export async function deleteGroup(id, mode = 'move_tasks_to_inbox', options = {}) {
  const groupId = typeof id === 'string' ? id.trim() : ''
  if (!groupId) throw new Error('分组 id 不能为空。')
  return deleteGroups([groupId], mode, options)
}

export async function deleteGroups(ids, mode = 'move_tasks_to_inbox', options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空分组 id 数组。')
  }
  if (!['move_tasks_to_inbox', 'delete_tasks'].includes(mode)) {
    throw new Error("mode 只能是 'move_tasks_to_inbox' 或 'delete_tasks'。")
  }

  const groupIds = ids.map((id) => (typeof id === 'string' ? id.trim() : ''))
  if (groupIds.some((id) => !id)) throw new Error('分组 id 不能为空。')
  assertUniqueValues(groupIds, '分组 id')

  const taskData = await readTaskData(options)
  const result = deleteGroupsFromTaskData(taskData, groupIds, mode)
  const nextTaskData = await writeTaskData(result.taskData, options)
  return createTaskResult(nextTaskData, {
    deleted: result.deletedGroups,
    deletedTasks: result.deletedTasks
  })
}

export async function reorderGroup(id, placement, options = {}) {
  const groupId = typeof id === 'string' ? id.trim() : ''
  const beforeId = placement?.before_id == null ? null : String(placement.before_id).trim()
  const afterId = placement?.after_id == null ? null : String(placement.after_id).trim()

  if (!groupId) throw new Error('分组 id 不能为空。')
  if (groupId === INBOX_GROUP_ID) throw new Error('默认收件箱分组不能重排。')
  if ((beforeId == null && afterId == null) || (beforeId != null && afterId != null)) {
    throw new Error('请提供 before_id 或 after_id 二选一。')
  }

  const taskData = await readTaskData(options)
  const nextGroups = taskData.groups.slice()
  const currentIndex = nextGroups.findIndex((group) => group.id === groupId)
  if (currentIndex === -1) throw new Error(`找不到 id 为 ${groupId} 的分组。`)

  const targetId = beforeId ?? afterId
  if (targetId === groupId) throw new Error('不能将分组移动到自己前后。')
  if (targetId === INBOX_GROUP_ID && beforeId != null) throw new Error('不能将分组移动到收件箱之前。')

  const [movingGroup] = nextGroups.splice(currentIndex, 1)
  const targetIndex = nextGroups.findIndex((group) => group.id === targetId)
  if (targetIndex === -1) throw new Error(`找不到目标分组 id ${targetId}。`)

  const insertIndex = Math.max(1, beforeId != null ? targetIndex : targetIndex + 1)
  nextGroups.splice(insertIndex, 0, movingGroup)
  const nextTaskData = await writeTaskData({ ...taskData, groups: nextGroups }, options)
  return createTaskResult(nextTaskData, { group: movingGroup })
}
