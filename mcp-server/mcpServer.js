#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  addTask,
  addTasks,
  addTasksToGroups,
  clearTasks,
  createGroup,
  createGroups,
  deleteGroup,
  deleteGroups,
  deleteTask,
  deleteTasks,
  filterTasksByGroup,
  getGroupSummaries,
  getTaskSummary,
  readTaskData,
  readTasks,
  removeTasksFromGroups,
  reorderGroup,
  reorderTask,
  setTasksCompleted,
  setTasksGroups,
  toggleTask,
  toggleTasks,
  updateGroup,
  updateGroups,
  updateTask,
  updateTasks,
  ALL_GROUP_ID
} from './taskStore.js'
import { splitTaskText } from './aiService.js'

const CHARACTER_LIMIT = 25000

const ResponseFormatSchema = z.enum(['markdown', 'json'])
const TaskFilterSchema = z.enum(['all', 'pending', 'completed'])
const GroupIdsSchema = z.array(z.string().min(1).max(100)).min(1).max(20)

const ListTasksSchema = z.object({
  filter: TaskFilterSchema.default('all').describe("Filter tasks by status: 'all', 'pending', or 'completed'."),
  group_id: z.string().min(1).max(100).default(ALL_GROUP_ID).describe("Group id to inspect, or 'all' for every task."),
  limit: z.number().int().min(1).max(100).default(20).describe('Maximum tasks to return.'),
  offset: z.number().int().min(0).default(0).describe('Number of matching tasks to skip.'),
  response_format: ResponseFormatSchema.default('markdown').describe("Return 'markdown' for reading or 'json' for structured processing.")
}).strict()

const AddTaskSchema = z.object({
  text: z.string().min(1).max(1000).describe('Task text to add. Whitespace is trimmed.'),
  group_ids: GroupIdsSchema.optional().describe('Groups for the new task. Defaults to inbox.')
}).strict()

const AddTasksSchema = z.object({
  tasks: z.array(z.union([
    z.string().min(1).max(1000),
    z.object({
      text: z.string().min(1).max(1000),
      group_ids: GroupIdsSchema.optional()
    }).strict()
  ])).min(1).max(100).describe('Task texts or task objects to add.'),
  group_ids: GroupIdsSchema.optional().describe('Default groups for every item that does not specify group_ids.')
}).strict()

const TaskStatsSchema = z.object({
  group_id: z.string().min(1).max(100).default(ALL_GROUP_ID).describe("Group id to summarize, or 'all'."),
  response_format: ResponseFormatSchema.default('markdown').describe("Return 'markdown' for reading or 'json'.")
}).strict()

const UpdateTaskSchema = z.object({
  id: z.number().int().describe('Task id to update.'),
  text: z.string().min(1).max(1000).optional().describe('New task text. Whitespace is trimmed.'),
  completed: z.boolean().optional().describe('Set whether the task is completed.'),
  group_ids: GroupIdsSchema.optional().describe('Replace the task group ids.')
}).strict()

const UpdateTasksSchema = z.object({
  updates: z.array(z.object({
    id: z.number().int().describe('Task id to update.'),
    text: z.string().min(1).max(1000).optional().describe('New task text. Whitespace is trimmed.'),
    completed: z.boolean().optional().describe('Set whether the task is completed.'),
    group_ids: GroupIdsSchema.optional().describe('Replace the task group ids.')
  }).strict()).min(1).max(100).describe('Updates to apply in one atomic batch.')
}).strict()

const TaskIdSchema = z.object({
  id: z.number().int().describe('Task id.')
}).strict()

const TaskIdsSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(100).describe('Task ids to modify in one batch.')
}).strict()

const SetTasksCompletedSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(100).describe('Task ids to set to the same completion state.'),
  completed: z.boolean().describe('Final completion state for all listed tasks.')
}).strict()

const SetTasksGroupsSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(100).describe('Task ids to update.'),
  group_ids: GroupIdsSchema.describe('Final group ids for all listed tasks.')
}).strict()

const AddRemoveTaskGroupsSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(100).describe('Task ids to update.'),
  group_ids: GroupIdsSchema.describe('Group ids to add or remove.')
}).strict()

const ClearTasksSchema = z.object({
  filter: z.enum(['all', 'completed']).default('completed').describe("Clear 'completed' tasks by default, or pass 'all' to clear everything."),
  group_id: z.string().min(1).max(100).default(ALL_GROUP_ID).describe("Limit clearing to one group, or 'all'.")
}).strict()

const ReorderTaskSchema = z.object({
  id: z.number().int().describe('Task id to move.'),
  before_id: z.number().int().optional().describe('Move the task before this task id. Mutually exclusive with after_id.'),
  after_id: z.number().int().optional().describe('Move the task after this task id. Mutually exclusive with before_id.')
}).strict()

const ListGroupsSchema = z.object({
  response_format: ResponseFormatSchema.default('markdown').describe("Return 'markdown' for reading or 'json'.")
}).strict()

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100).describe('Group name.')
}).strict()

const CreateGroupsSchema = z.object({
  names: z.array(z.string().min(1).max(100)).min(1).max(50).describe('Group names to create.')
}).strict()

const UpdateGroupSchema = z.object({
  id: z.string().min(1).max(100).describe('Group id.'),
  name: z.string().min(1).max(100).describe('New group name.')
}).strict()

const UpdateGroupsSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100)
  }).strict()).min(1).max(50).describe('Group renames to apply.')
}).strict()

const DeleteGroupSchema = z.object({
  id: z.string().min(1).max(100).describe('Group id.'),
  mode: z.enum(['move_tasks_to_inbox', 'delete_tasks']).default('move_tasks_to_inbox').describe('How to handle tasks that only belong to the deleted group.')
}).strict()

const DeleteGroupsSchema = z.object({
  ids: z.array(z.string().min(1).max(100)).min(1).max(50).describe('Group ids.'),
  mode: z.enum(['move_tasks_to_inbox', 'delete_tasks']).default('move_tasks_to_inbox').describe('How to handle tasks that only belong to deleted groups.')
}).strict()

const ReorderGroupSchema = z.object({
  id: z.string().min(1).max(100).describe('Group id to move.'),
  before_id: z.string().min(1).max(100).optional().describe('Move before this group id.'),
  after_id: z.string().min(1).max(100).optional().describe('Move after this group id.')
}).strict()

const AISplitTextSchema = z.object({
  text: z.string().min(1).max(10000).describe('Complex text or one existing task text to split into actionable tasks.'),
  supplement: z.string().max(4000).optional().describe('Additional constraints or corrections when regenerating a split preview.'),
  count_mode: z.enum(['none', 'approx', 'exact']).default('none').describe('Whether task count is unconstrained, approximate, or exact.'),
  task_count: z.number().int().min(1).max(30).default(8).describe('Exact desired task count for count_mode=exact.'),
  task_count_min: z.number().int().min(1).max(30).default(5).describe('Lower bound for count_mode=approx.'),
  task_count_max: z.number().int().min(1).max(30).default(10).describe('Upper bound for count_mode=approx.'),
  context_group_id: z.string().min(1).max(100).optional().describe("Optional group id for context. Use 'all' or omit for global context."),
  max_tasks: z.number().int().min(1).max(30).default(30).describe('Maximum tasks to return in the preview.'),
  response_format: ResponseFormatSchema.default('json').describe("Return 'json' for structured processing or 'markdown' for reading.")
}).strict()

const ApplySplitTasksSchema = z.object({
  tasks: z.array(z.string().min(1).max(1000)).min(1).max(30).describe('Previewed task texts to write into DeskAtom.'),
  target_mode: z.enum(['new_group', 'existing_group']).describe('Create a new target group or add tasks to an existing group.'),
  group_name: z.string().min(1).max(100).optional().describe('Required for target_mode=new_group. Duplicate names get a numeric suffix.'),
  group_id: z.string().min(1).max(100).optional().describe('Required for target_mode=existing_group.'),
  complete_source_task_id: z.number().int().optional().describe('Optional source task id to mark completed after adding split tasks.')
}).strict()

function filterTasks(tasks, filter) {
  if (filter === 'pending') return tasks.filter((task) => !task.completed)
  if (filter === 'completed') return tasks.filter((task) => task.completed)
  return tasks
}

function taskStatus(task) {
  return task.completed ? 'completed' : 'pending'
}

function groupNameMap(groups) {
  return new Map(groups.map((group) => [group.id, group.name]))
}

function formatTask(task, groups = []) {
  const names = groupNameMap(groups)
  return {
    id: task.id,
    text: task.text,
    completed: task.completed,
    status: taskStatus(task),
    group_ids: task.groupIds,
    group_names: task.groupIds.map((groupId) => names.get(groupId)).filter(Boolean)
  }
}

function formatGroup(group, tasks) {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt,
    summary: getTaskSummary(tasks, group.id)
  }
}

function formatMarkdownList({ tasks, total, count, offset, has_more, next_offset, summary, filter, group_id, groups }) {
  const names = groupNameMap(groups)
  const groupLabel = group_id === ALL_GROUP_ID ? 'all groups' : `${names.get(group_id) || group_id} (${group_id})`
  const lines = [
    `# DeskAtom Tasks (${filter})`,
    '',
    `Group: ${groupLabel}`,
    `Total: ${summary.total} | Pending: ${summary.pending} | Completed: ${summary.completed}`,
    `Showing ${count} of ${total} matching tasks from offset ${offset}.`,
    ''
  ]

  if (tasks.length === 0) {
    lines.push('No tasks matched this request.')
  } else {
    for (const task of tasks) {
      const groupNames = task.groupIds.map((groupId) => names.get(groupId) || groupId).join(', ')
      lines.push(`- [${task.completed ? 'x' : ' '}] ${task.text} (id: ${task.id}; groups: ${groupNames})`)
    }
  }

  if (has_more) {
    lines.push('', `More tasks are available. Request offset ${next_offset} to continue.`)
  }

  return lines.join('\n')
}

function truncateResult(text) {
  if (text.length <= CHARACTER_LIMIT) return text
  return `${text.slice(0, CHARACTER_LIMIT)}\n\nResponse truncated. Use a smaller limit or a narrower filter.`
}

function jsonText(value) {
  return JSON.stringify(value, null, 2)
}

function okText(text) {
  return {
    content: [{ type: 'text', text: truncateResult(text) }]
  }
}

function errorText(error) {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: `Error: ${error instanceof Error ? error.message : String(error)}`
    }]
  }
}

function normalizeUpdatePayload(updates) {
  const payload = {}
  if (Object.prototype.hasOwnProperty.call(updates, 'text')) payload.text = updates.text
  if (Object.prototype.hasOwnProperty.call(updates, 'completed')) payload.completed = updates.completed
  if (Object.prototype.hasOwnProperty.call(updates, 'group_ids')) payload.groupIds = updates.group_ids
  return payload
}

function normalizeAddItems(items) {
  return items.map((item) => typeof item === 'string'
    ? item
    : { text: item.text, groupIds: item.group_ids }
  )
}

function normalizeSplitTasks(tasks) {
  const seen = new Set()
  const normalized = []

  for (const task of tasks) {
    const text = String(task || '').trim()
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    normalized.push(text)
  }

  return normalized.slice(0, 30)
}

function uniqueGroupName(baseName, groups) {
  const cleanName = String(baseName || '').trim()
  if (!cleanName) throw new Error('group_name is required when target_mode is new_group.')

  const existingNames = new Set(groups.map((group) => group.name.trim().toLowerCase()))
  if (!existingNames.has(cleanName.toLowerCase())) return cleanName

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${cleanName} ${index}`
    if (!existingNames.has(candidate.toLowerCase())) return candidate
  }

  return `${cleanName} ${Date.now()}`
}

function formatAISplitMarkdown(payload) {
  const lines = [
    '# DeskAtom AI Split Preview',
    '',
    `Suggested group: ${payload.group_name || 'Untitled'}`,
    payload.explanation ? `Explanation: ${payload.explanation}` : '',
    ''
  ].filter(Boolean)

  payload.tasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${task}`)
  })

  return lines.join('\n')
}

function mutationResponse(action, result) {
  const groups = result.groups || []
  const payload = {
    action,
    task: result.task ? formatTask(result.task, groups) : undefined,
    group: result.group ? formatGroup(result.group, result.tasks) : undefined,
    added: result.added ? result.added.map((task) => formatTask(task, groups)) : undefined,
    updated: result.updated ? result.updated.map((task) => formatTask(task, groups)) : undefined,
    deleted: result.deleted ? result.deleted.map((item) => item.text ? formatTask(item, groups) : formatGroup(item, result.tasks)) : undefined,
    created: result.created ? result.created.map((group) => formatGroup(group, result.tasks)) : undefined,
    deleted_tasks: result.deletedTasks ? result.deletedTasks.map((task) => formatTask(task, groups)) : undefined,
    cleared: result.cleared,
    summary: result.summary,
    groups: groups.map((group) => formatGroup(group, result.tasks)),
    tasks: result.tasks.map((task) => formatTask(task, groups))
  }
  return okText(jsonText(payload))
}

const server = new McpServer({
  name: 'deskatom-mcp-server',
  version: '1.0.0'
})

server.registerTool('deskatom_list_tasks', {
  title: 'List DeskAtom Tasks',
  description: 'List DeskAtom tasks with status filtering, optional group filtering, pagination, and markdown or JSON output.',
  inputSchema: ListTasksSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    const taskData = await readTaskData()
    const groupedTasks = filterTasksByGroup(taskData.tasks, params.group_id)
    const matchingTasks = filterTasks(groupedTasks, params.filter)
    const pagedTasks = matchingTasks.slice(params.offset, params.offset + params.limit)
    const response = {
      total: matchingTasks.length,
      count: pagedTasks.length,
      offset: params.offset,
      has_more: params.offset + pagedTasks.length < matchingTasks.length,
      next_offset: params.offset + pagedTasks.length < matchingTasks.length ? params.offset + pagedTasks.length : null,
      filter: params.filter,
      group_id: params.group_id,
      summary: getTaskSummary(groupedTasks),
      groups: taskData.groups.map((group) => formatGroup(group, taskData.tasks)),
      tasks: pagedTasks.map((task) => formatTask(task, taskData.groups))
    }
    return okText(params.response_format === 'json' ? jsonText(response) : formatMarkdownList({ ...response, groups: taskData.groups }))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_list_groups', {
  title: 'List DeskAtom Groups',
  description: 'List task groups and their task counts.',
  inputSchema: ListGroupsSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    const taskData = await readTaskData()
    const groups = taskData.groups.map((group) => formatGroup(group, taskData.tasks))
    if (params.response_format === 'json') return okText(jsonText({ groups }))
    return okText(['# DeskAtom Groups', '', ...groups.map((group) => `- ${group.name} (${group.id}) - ${group.summary.pending}/${group.summary.total} pending/total`)].join('\n'))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_get_task_stats', {
  title: 'Get DeskAtom Task Stats',
  description: 'Return task counts globally or for one group, including per-group summaries.',
  inputSchema: TaskStatsSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    const taskData = await readTaskData()
    const tasks = filterTasksByGroup(taskData.tasks, params.group_id)
    const summary = getTaskSummary(tasks)
    const response = {
      ...summary,
      group_id: params.group_id,
      completion_percentage: summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100),
      groups: getGroupSummaries(taskData)
    }
    if (params.response_format === 'json') return okText(jsonText(response))
    return okText([
      '# DeskAtom Task Stats',
      '',
      `- Group: ${params.group_id}`,
      `- Total: ${response.total}`,
      `- Pending: ${response.pending}`,
      `- Completed: ${response.completed}`,
      `- Completion: ${response.completion_percentage}%`
    ].join('\n'))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_ai_split_text', {
  title: 'AI Split DeskAtom Text',
  description: 'Use the configured OpenAI-compatible AI service to split complex text into actionable DeskAtom task previews. This does not write tasks.',
  inputSchema: AISplitTextSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true }
}, async (params) => {
  try {
    const taskData = await readTaskData()
    let contextGroupName = ''
    if (params.context_group_id && params.context_group_id !== ALL_GROUP_ID) {
      const group = taskData.groups.find((item) => item.id === params.context_group_id)
      if (!group) throw new Error(`Group not found: ${params.context_group_id}`)
      contextGroupName = group.name
    }

    const result = await splitTaskText({
      text: params.text,
      supplement: params.supplement,
      countMode: params.count_mode,
      taskCount: params.task_count,
      taskCountMin: params.task_count_min,
      taskCountMax: params.task_count_max,
      contextGroupName,
      groups: taskData.groups.map((group) => ({ id: group.id, name: group.name })),
      language: 'zh-CN',
      maxTasks: params.count_mode === 'exact' ? params.task_count : params.max_tasks
    })

    const response = {
      group_name: result.groupName,
      tasks: result.tasks,
      explanation: result.explanation,
      count: result.tasks.length,
      count_mode: params.count_mode,
      task_count: params.task_count,
      task_count_min: params.task_count_min,
      task_count_max: params.task_count_max,
      context_group_id: params.context_group_id || ALL_GROUP_ID
    }

    return okText(params.response_format === 'markdown' ? formatAISplitMarkdown(response) : jsonText(response))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_apply_split_tasks', {
  title: 'Apply AI Split DeskAtom Tasks',
  description: 'Write previewed AI split tasks into a new or existing DeskAtom group, optionally completing the source task.',
  inputSchema: ApplySplitTasksSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    const taskTexts = normalizeSplitTasks(params.tasks)
    if (taskTexts.length === 0) throw new Error('At least one non-empty task is required.')

    const taskData = await readTaskData()
    let targetGroup = null

    if (params.target_mode === 'new_group') {
      const groupName = uniqueGroupName(params.group_name, taskData.groups)
      const createdResult = await createGroup(groupName)
      targetGroup = createdResult.group
    } else {
      if (!params.group_id) throw new Error('group_id is required when target_mode is existing_group.')
      targetGroup = taskData.groups.find((group) => group.id === params.group_id)
      if (!targetGroup) throw new Error(`Group not found: ${params.group_id}`)
    }

    const addResult = await addTasks(taskTexts, { groupIds: [targetGroup.id] })
    let sourceTask = null
    let finalData = addResult

    if (params.complete_source_task_id != null) {
      const updateResult = await updateTask(params.complete_source_task_id, { completed: true })
      sourceTask = updateResult.task
      finalData = updateResult
    }

    const groups = finalData.groups || addResult.groups || []
    const tasks = finalData.tasks || addResult.tasks || []
    const response = {
      action: 'applied_ai_split',
      target_group: formatGroup(targetGroup, tasks),
      added: addResult.added.map((task) => formatTask(task, groups)),
      completed_source_task: sourceTask ? formatTask(sourceTask, groups) : null,
      summary: getTaskSummary(tasks, targetGroup.id),
      groups: groups.map((group) => formatGroup(group, tasks)),
      tasks: tasks.map((task) => formatTask(task, groups))
    }

    return okText(jsonText(response))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_add_task', {
  title: 'Add DeskAtom Task',
  description: 'Add a new task to the top of the list. Optionally assign it to one or more groups.',
  inputSchema: AddTaskSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('added', await addTask(params.text, { groupIds: params.group_ids }))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_add_tasks', {
  title: 'Add Multiple DeskAtom Tasks',
  description: 'Add multiple tasks in one call. Use group_ids as defaults or per item for individual grouping.',
  inputSchema: AddTasksSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('added_many', await addTasks(normalizeAddItems(params.tasks), { groupIds: params.group_ids }))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_update_task', {
  title: 'Update DeskAtom Task',
  description: 'Update a task text, completion state, groups, or any combination.',
  inputSchema: UpdateTaskSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('updated', await updateTask(params.id, normalizeUpdatePayload(params)))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_update_tasks', {
  title: 'Update Multiple DeskAtom Tasks',
  description: 'Update multiple tasks in one atomic batch, including text, completion state, and groups.',
  inputSchema: UpdateTasksSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('updated_many', await updateTasks(params.updates.map((updates) => ({ ...normalizeUpdatePayload(updates), id: updates.id }))))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_set_tasks_completed', {
  title: 'Set Multiple DeskAtom Tasks Completed',
  description: 'Set many tasks to completed or pending in one batch.',
  inputSchema: SetTasksCompletedSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('set_completed_many', await setTasksCompleted(params.ids, params.completed))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_set_tasks_groups', {
  title: 'Set Multiple DeskAtom Tasks Groups',
  description: 'Replace the groups for many tasks in one atomic batch.',
  inputSchema: SetTasksGroupsSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('set_groups_many', await setTasksGroups(params.ids, params.group_ids))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_add_tasks_to_groups', {
  title: 'Add Multiple Tasks To Groups',
  description: 'Add one or more groups to many tasks without removing existing groups.',
  inputSchema: AddRemoveTaskGroupsSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('added_tasks_to_groups', await addTasksToGroups(params.ids, params.group_ids))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_remove_tasks_from_groups', {
  title: 'Remove Multiple Tasks From Groups',
  description: 'Remove one or more groups from many tasks. Tasks left with no groups move to inbox.',
  inputSchema: AddRemoveTaskGroupsSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('removed_tasks_from_groups', await removeTasksFromGroups(params.ids, params.group_ids))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_toggle_task', {
  title: 'Toggle DeskAtom Task',
  description: 'Toggle one task between pending and completed.',
  inputSchema: TaskIdSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('toggled', await toggleTask(params.id))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_toggle_tasks', {
  title: 'Toggle Multiple DeskAtom Tasks',
  description: 'Toggle many tasks between pending and completed in one batch.',
  inputSchema: TaskIdsSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('toggled_many', await toggleTasks(params.ids))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_delete_task', {
  title: 'Delete DeskAtom Task',
  description: 'Delete a single task by id.',
  inputSchema: TaskIdSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('deleted', await deleteTask(params.id))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_delete_tasks', {
  title: 'Delete Multiple DeskAtom Tasks',
  description: 'Delete multiple tasks by id in one atomic batch.',
  inputSchema: TaskIdsSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('deleted_many', await deleteTasks(params.ids))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_clear_tasks', {
  title: 'Clear DeskAtom Tasks',
  description: "Clear completed tasks by default. Pass filter='all' only when explicitly requested. Can be limited to one group.",
  inputSchema: ClearTasksSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('cleared', await clearTasks(params.filter, { groupId: params.group_id }))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_reorder_task', {
  title: 'Reorder DeskAtom Task',
  description: 'Move a task before or after another task.',
  inputSchema: ReorderTaskSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('reordered', await reorderTask(params.id, { before_id: params.before_id, after_id: params.after_id }))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_create_group', {
  title: 'Create DeskAtom Group',
  description: 'Create one task group.',
  inputSchema: CreateGroupSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('created_group', await createGroup(params.name))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_create_groups', {
  title: 'Create Multiple DeskAtom Groups',
  description: 'Create multiple task groups in one batch.',
  inputSchema: CreateGroupsSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('created_groups', await createGroups(params.names))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_update_group', {
  title: 'Update DeskAtom Group',
  description: 'Rename one task group. The inbox group cannot be renamed.',
  inputSchema: UpdateGroupSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('updated_group', await updateGroup(params.id, { name: params.name }))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_update_groups', {
  title: 'Update Multiple DeskAtom Groups',
  description: 'Rename multiple task groups in one atomic batch.',
  inputSchema: UpdateGroupsSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('updated_groups', await updateGroups(params.updates))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_delete_group', {
  title: 'Delete DeskAtom Group',
  description: 'Delete one group. Use mode to move exclusive tasks to inbox or delete exclusive tasks.',
  inputSchema: DeleteGroupSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('deleted_group', await deleteGroup(params.id, params.mode))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_delete_groups', {
  title: 'Delete Multiple DeskAtom Groups',
  description: 'Delete multiple groups in one batch. Multi-group tasks only lose deleted groups; exclusive tasks follow mode.',
  inputSchema: DeleteGroupsSchema,
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('deleted_groups', await deleteGroups(params.ids, params.mode))
  } catch (error) {
    return errorText(error)
  }
})

server.registerTool('deskatom_reorder_group', {
  title: 'Reorder DeskAtom Group',
  description: 'Move a group before or after another group. Inbox stays first.',
  inputSchema: ReorderGroupSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (params) => {
  try {
    return mutationResponse('reordered_group', await reorderGroup(params.id, { before_id: params.before_id, after_id: params.after_id }))
  } catch (error) {
    return errorText(error)
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('DeskAtom MCP server running via stdio')
}

main().catch((error) => {
  console.error('DeskAtom MCP server failed:', error)
  process.exit(1)
})
