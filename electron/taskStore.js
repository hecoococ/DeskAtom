import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

const TASKS_FILE_NAME = 'tasks.json'

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

function normalizeTask(rawTask) {
  if (!rawTask || typeof rawTask !== 'object') return null

  const id = Number(rawTask.id)
  const text = typeof rawTask.text === 'string' ? rawTask.text.trim() : ''

  if (!Number.isFinite(id) || text.length === 0) return null

  return {
    id,
    text,
    completed: Boolean(rawTask.completed)
  }
}

export function normalizeTasks(rawTasks) {
  if (typeof rawTasks === 'string') {
    try {
      rawTasks = JSON.parse(rawTasks)
    } catch {
      return []
    }
  }

  if (!Array.isArray(rawTasks)) return []

  const seenIds = new Set()
  const tasks = []

  for (const rawTask of rawTasks) {
    const task = normalizeTask(rawTask)
    if (!task || seenIds.has(task.id)) continue
    seenIds.add(task.id)
    tasks.push(task)
  }

  return tasks
}

async function ensureDataDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export async function readTasks(options = {}) {
  const filePath = options.filePath || getTasksFilePath(options.dataDir)

  try {
    const content = await fs.readFile(filePath, 'utf8')
    return normalizeTasks(JSON.parse(content))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    if (error instanceof SyntaxError) {
      throw new Error('任务数据文件不是有效 JSON，请检查或备份后重置 tasks.json。')
    }
    throw error
  }
}

export async function writeTasks(tasks, options = {}) {
  const filePath = options.filePath || getTasksFilePath(options.dataDir)
  const normalizedTasks = normalizeTasks(tasks)
  const tempFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await ensureDataDir(filePath)
  await fs.writeFile(tempFilePath, `${JSON.stringify(normalizedTasks, null, 2)}\n`, 'utf8')
  await fs.rename(tempFilePath, filePath)
  return normalizedTasks
}

function createTaskId(tasks) {
  const now = Date.now()
  const maxId = tasks.reduce((max, task) => Math.max(max, Number(task.id) || 0), 0)
  return Math.max(now, maxId + 1)
}

export function getTaskSummary(tasks) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.completed).length
  const pending = total - completed
  return { total, completed, pending }
}

export async function addTask(text, options = {}) {
  const trimmedText = typeof text === 'string' ? text.trim() : ''
  if (!trimmedText) {
    throw new Error('任务文本不能为空，请提供 text。')
  }

  const tasks = await readTasks(options)
  const task = {
    id: createTaskId(tasks),
    text: trimmedText,
    completed: false
  }
  const nextTasks = [task, ...tasks]
  await writeTasks(nextTasks, options)
  return { task, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

export async function addTasks(texts, options = {}) {
  if (!Array.isArray(texts)) {
    throw new Error('tasks 必须是任务文本数组。')
  }

  const trimmedTexts = texts
    .map((text) => (typeof text === 'string' ? text.trim() : ''))
    .filter(Boolean)

  if (trimmedTexts.length === 0) {
    throw new Error('请至少提供一个非空任务文本。')
  }

  const tasks = await readTasks(options)
  let nextId = createTaskId(tasks)
  const addedTasks = trimmedTexts.map((text) => ({
    id: nextId++,
    text,
    completed: false
  }))
  const nextTasks = [...addedTasks, ...tasks]
  await writeTasks(nextTasks, options)
  return { added: addedTasks, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

export async function updateTask(id, updates, options = {}) {
  const taskId = Number(id)
  if (!Number.isFinite(taskId)) {
    throw new Error('任务 id 必须是数字。')
  }

  const hasText = Object.prototype.hasOwnProperty.call(updates || {}, 'text')
  const hasCompleted = Object.prototype.hasOwnProperty.call(updates || {}, 'completed')

  if (!hasText && !hasCompleted) {
    throw new Error('请至少提供 text 或 completed 中的一个字段。')
  }

  const tasks = await readTasks(options)
  const index = tasks.findIndex((task) => task.id === taskId)
  if (index === -1) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  const updatedTask = { ...tasks[index] }

  if (hasText) {
    const trimmedText = typeof updates.text === 'string' ? updates.text.trim() : ''
    if (!trimmedText) {
      throw new Error('任务文本不能为空，请提供非空 text。')
    }
    updatedTask.text = trimmedText
  }

  if (hasCompleted) {
    updatedTask.completed = Boolean(updates.completed)
  }

  const nextTasks = tasks.slice()
  nextTasks[index] = updatedTask
  await writeTasks(nextTasks, options)
  return { task: updatedTask, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

function normalizeTaskId(id) {
  const taskId = Number(id)
  if (!Number.isFinite(taskId)) {
    throw new Error('任务 id 必须是数字。')
  }
  return taskId
}

function assertUniqueIds(ids) {
  const seenIds = new Set()
  for (const id of ids) {
    if (seenIds.has(id)) {
      throw new Error(`重复的任务 id: ${id}。`)
    }
    seenIds.add(id)
  }
}

function applyTaskUpdates(task, updates) {
  const hasText = Object.prototype.hasOwnProperty.call(updates || {}, 'text')
  const hasCompleted = Object.prototype.hasOwnProperty.call(updates || {}, 'completed')

  if (!hasText && !hasCompleted) {
    throw new Error(`任务 ${task.id} 没有可更新字段，请提供 text 或 completed。`)
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

  return updatedTask
}

export async function updateTasks(updatesList, options = {}) {
  if (!Array.isArray(updatesList) || updatesList.length === 0) {
    throw new Error('updates 必须是非空数组。')
  }

  const normalizedUpdates = updatesList.map((updates) => ({
    ...updates,
    id: normalizeTaskId(updates?.id)
  }))
  assertUniqueIds(normalizedUpdates.map((updates) => updates.id))

  const tasks = await readTasks(options)
  const taskIndexes = new Map(tasks.map((task, index) => [task.id, index]))
  const missingIds = normalizedUpdates
    .map((updates) => updates.id)
    .filter((id) => !taskIndexes.has(id))

  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const nextTasks = tasks.slice()
  const updatedTasks = []

  for (const updates of normalizedUpdates) {
    const index = taskIndexes.get(updates.id)
    const updatedTask = applyTaskUpdates(nextTasks[index], updates)
    nextTasks[index] = updatedTask
    updatedTasks.push(updatedTask)
  }

  await writeTasks(nextTasks, options)
  return { updated: updatedTasks, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

export async function setTasksCompleted(ids, completed, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueIds(normalizedIds)

  return updateTasks(
    normalizedIds.map((id) => ({ id, completed: Boolean(completed) })),
    options
  )
}

export async function toggleTask(id, options = {}) {
  const taskId = Number(id)
  const tasks = await readTasks(options)
  const task = tasks.find((item) => item.id === taskId)
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
  assertUniqueIds(normalizedIds)

  const tasks = await readTasks(options)
  const taskIndexes = new Map(tasks.map((task, index) => [task.id, index]))
  const missingIds = normalizedIds.filter((id) => !taskIndexes.has(id))

  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const nextTasks = tasks.slice()
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

  await writeTasks(nextTasks, options)
  return { updated: updatedTasks, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

export async function deleteTask(id, options = {}) {
  const taskId = Number(id)
  const tasks = await readTasks(options)
  const index = tasks.findIndex((task) => task.id === taskId)
  if (index === -1) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  const [deletedTask] = tasks.splice(index, 1)
  await writeTasks(tasks, options)
  return { task: deletedTask, tasks, summary: getTaskSummary(tasks) }
}

export async function deleteTasks(ids, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids 必须是非空任务 id 数组。')
  }

  const normalizedIds = ids.map(normalizeTaskId)
  assertUniqueIds(normalizedIds)

  const tasks = await readTasks(options)
  const existingIds = new Set(tasks.map((task) => task.id))
  const missingIds = normalizedIds.filter((id) => !existingIds.has(id))

  if (missingIds.length > 0) {
    throw new Error(`找不到这些任务 id: ${missingIds.join(', ')}。`)
  }

  const deleteIds = new Set(normalizedIds)
  const deletedTasks = tasks.filter((task) => deleteIds.has(task.id))
  const nextTasks = tasks.filter((task) => !deleteIds.has(task.id))
  await writeTasks(nextTasks, options)
  return { deleted: deletedTasks, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

export async function clearTasks(filter = 'completed', options = {}) {
  if (!['all', 'completed'].includes(filter)) {
    throw new Error("filter 只能是 'all' 或 'completed'。")
  }

  const tasks = await readTasks(options)
  const nextTasks = filter === 'all' ? [] : tasks.filter((task) => !task.completed)
  const cleared = tasks.length - nextTasks.length
  await writeTasks(nextTasks, options)
  return { cleared, tasks: nextTasks, summary: getTaskSummary(nextTasks) }
}

export async function reorderTask(id, placement, options = {}) {
  const taskId = Number(id)
  const beforeId = placement?.before_id == null ? null : Number(placement.before_id)
  const afterId = placement?.after_id == null ? null : Number(placement.after_id)

  if ((beforeId == null && afterId == null) || (beforeId != null && afterId != null)) {
    throw new Error('请提供 before_id 或 after_id 二选一。')
  }

  const tasks = await readTasks(options)
  const currentIndex = tasks.findIndex((task) => task.id === taskId)
  if (currentIndex === -1) {
    throw new Error(`找不到 id 为 ${taskId} 的任务。`)
  }

  const targetId = beforeId ?? afterId
  if (targetId === taskId) {
    throw new Error('不能将任务移动到自己前后。')
  }

  const [movingTask] = tasks.splice(currentIndex, 1)
  const targetIndex = tasks.findIndex((task) => task.id === targetId)
  if (targetIndex === -1) {
    throw new Error(`找不到目标任务 id ${targetId}。`)
  }

  const insertIndex = beforeId != null ? targetIndex : targetIndex + 1
  tasks.splice(insertIndex, 0, movingTask)
  await writeTasks(tasks, options)
  return { task: movingTask, tasks, summary: getTaskSummary(tasks) }
}
