#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  addTask,
  addTasks,
  clearTasks,
  deleteTask,
  deleteTasks,
  getTaskSummary,
  readTasks,
  reorderTask,
  setTasksCompleted,
  toggleTask,
  toggleTasks,
  updateTask,
  updateTasks
} from './taskStore.js'

const CHARACTER_LIMIT = 25000

const ResponseFormatSchema = z.enum(['markdown', 'json'])
const TaskFilterSchema = z.enum(['all', 'pending', 'completed'])

const ListTasksSchema = z.object({
  filter: TaskFilterSchema.default('all').describe("Filter tasks by status: 'all', 'pending', or 'completed'."),
  limit: z.number().int().min(1).max(100).default(20).describe('Maximum tasks to return.'),
  offset: z.number().int().min(0).default(0).describe('Number of matching tasks to skip.'),
  response_format: ResponseFormatSchema.default('markdown').describe("Return 'markdown' for reading or 'json' for structured processing.")
}).strict()

const AddTaskSchema = z.object({
  text: z.string().min(1).max(1000).describe('Task text to add. Whitespace is trimmed.')
}).strict()

const AddTasksSchema = z.object({
  tasks: z.array(z.string().min(1).max(1000)).min(1).max(100).describe('Task texts to add in one call. Whitespace is trimmed.')
}).strict()

const TaskStatsSchema = z.object({
  response_format: ResponseFormatSchema.default('markdown').describe("Return 'markdown' for reading or 'json' for structured processing.")
}).strict()

const UpdateTaskSchema = z.object({
  id: z.number().int().describe('Task id to update.'),
  text: z.string().min(1).max(1000).optional().describe('New task text. Whitespace is trimmed.'),
  completed: z.boolean().optional().describe('Set whether the task is completed.')
}).strict()

const UpdateTasksSchema = z.object({
  updates: z.array(z.object({
    id: z.number().int().describe('Task id to update.'),
    text: z.string().min(1).max(1000).optional().describe('New task text. Whitespace is trimmed.'),
    completed: z.boolean().optional().describe('Set whether the task is completed.')
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

const ClearTasksSchema = z.object({
  filter: z.enum(['all', 'completed']).default('completed').describe("Clear 'completed' tasks by default, or pass 'all' to clear everything.")
}).strict()

const ReorderTaskSchema = z.object({
  id: z.number().int().describe('Task id to move.'),
  before_id: z.number().int().optional().describe('Move the task before this task id. Mutually exclusive with after_id.'),
  after_id: z.number().int().optional().describe('Move the task after this task id. Mutually exclusive with before_id.')
}).strict()

function filterTasks(tasks, filter) {
  if (filter === 'pending') return tasks.filter((task) => !task.completed)
  if (filter === 'completed') return tasks.filter((task) => task.completed)
  return tasks
}

function taskStatus(task) {
  return task.completed ? 'completed' : 'pending'
}

function formatTask(task) {
  return {
    id: task.id,
    text: task.text,
    completed: task.completed,
    status: taskStatus(task)
  }
}

function formatMarkdownList({ tasks, total, count, offset, has_more, next_offset, summary, filter }) {
  const lines = [
    `# DeskAtom Tasks (${filter})`,
    '',
    `Total: ${summary.total} | Pending: ${summary.pending} | Completed: ${summary.completed}`,
    `Showing ${count} of ${total} matching tasks from offset ${offset}.`,
    ''
  ]

  if (tasks.length === 0) {
    lines.push('No tasks matched this request.')
  } else {
    for (const task of tasks) {
      lines.push(`- [${task.completed ? 'x' : ' '}] ${task.text} (id: ${task.id})`)
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

function mutationResponse(action, result) {
  const payload = {
    action,
    task: result.task ? formatTask(result.task) : undefined,
    added: result.added ? result.added.map(formatTask) : undefined,
    updated: result.updated ? result.updated.map(formatTask) : undefined,
    deleted: result.deleted ? result.deleted.map(formatTask) : undefined,
    cleared: result.cleared,
    summary: result.summary,
    tasks: result.tasks.map(formatTask)
  }
  return okText(jsonText(payload))
}

const server = new McpServer({
  name: 'deskatom-mcp-server',
  version: '1.0.0'
})

server.registerTool(
  'deskatom_list_tasks',
  {
    title: 'List DeskAtom Tasks',
    description: `List DeskAtom tasks from the local task store.

Use this tool to inspect current tasks before modifying them. Supports status filtering, pagination, and markdown or JSON output.`,
    inputSchema: ListTasksSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const tasks = await readTasks()
      const matchingTasks = filterTasks(tasks, params.filter)
      const pagedTasks = matchingTasks.slice(params.offset, params.offset + params.limit)
      const response = {
        total: matchingTasks.length,
        count: pagedTasks.length,
        offset: params.offset,
        has_more: params.offset + pagedTasks.length < matchingTasks.length,
        next_offset: params.offset + pagedTasks.length < matchingTasks.length ? params.offset + pagedTasks.length : null,
        filter: params.filter,
        summary: getTaskSummary(tasks),
        tasks: pagedTasks.map(formatTask)
      }

      if (params.response_format === 'json') {
        return okText(jsonText(response))
      }

      return okText(formatMarkdownList(response))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_get_task_stats',
  {
    title: 'Get DeskAtom Task Stats',
    description: 'Return a lightweight count summary of all DeskAtom tasks: total, pending, completed, and completion percentage.',
    inputSchema: TaskStatsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const tasks = await readTasks()
      const summary = getTaskSummary(tasks)
      const completion_percentage = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100)
      const response = { ...summary, completion_percentage }

      if (params.response_format === 'json') {
        return okText(jsonText(response))
      }

      return okText([
        '# DeskAtom Task Stats',
        '',
        `- Total: ${response.total}`,
        `- Pending: ${response.pending}`,
        `- Completed: ${response.completed}`,
        `- Completion: ${response.completion_percentage}%`
      ].join('\n'))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_add_task',
  {
    title: 'Add DeskAtom Task',
    description: 'Add a new DeskAtom task to the top of the list. Returns the created task and updated summary.',
    inputSchema: AddTaskSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('added', await addTask(params.text))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_add_tasks',
  {
    title: 'Add Multiple DeskAtom Tasks',
    description: 'Add multiple DeskAtom tasks in one call. New tasks are inserted at the top in the same order as provided.',
    inputSchema: AddTasksSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('added_many', await addTasks(params.tasks))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_update_task',
  {
    title: 'Update DeskAtom Task',
    description: 'Update a task text, completion state, or both. Provide at least one of text or completed.',
    inputSchema: UpdateTaskSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const updates = {}
      if (Object.prototype.hasOwnProperty.call(params, 'text')) updates.text = params.text
      if (Object.prototype.hasOwnProperty.call(params, 'completed')) updates.completed = params.completed
      return mutationResponse('updated', await updateTask(params.id, updates))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_update_tasks',
  {
    title: 'Update Multiple DeskAtom Tasks',
    description: 'Update multiple tasks in one atomic batch. Each item can change text, completed state, or both.',
    inputSchema: UpdateTasksSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('updated_many', await updateTasks(params.updates))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_set_tasks_completed',
  {
    title: 'Set Multiple DeskAtom Tasks Completed',
    description: 'Set many tasks to completed or pending in one batch. Use this when many task statuses should become the same final state.',
    inputSchema: SetTasksCompletedSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('set_completed_many', await setTasksCompleted(params.ids, params.completed))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_toggle_task',
  {
    title: 'Toggle DeskAtom Task',
    description: 'Toggle one task between pending and completed. Use update_task if you need an explicit final state.',
    inputSchema: TaskIdSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('toggled', await toggleTask(params.id))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_toggle_tasks',
  {
    title: 'Toggle Multiple DeskAtom Tasks',
    description: 'Toggle many tasks between pending and completed in one batch. Use set_tasks_completed for an explicit final state.',
    inputSchema: TaskIdsSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('toggled_many', await toggleTasks(params.ids))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_delete_task',
  {
    title: 'Delete DeskAtom Task',
    description: 'Delete a single DeskAtom task by id. List tasks first if you need to find the id.',
    inputSchema: TaskIdSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('deleted', await deleteTask(params.id))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_delete_tasks',
  {
    title: 'Delete Multiple DeskAtom Tasks',
    description: 'Delete multiple DeskAtom tasks by id in one atomic batch. List tasks first if you need to find ids.',
    inputSchema: TaskIdsSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('deleted_many', await deleteTasks(params.ids))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_clear_tasks',
  {
    title: 'Clear DeskAtom Tasks',
    description: "Clear completed tasks by default. Pass filter='all' only when the user explicitly wants every task removed.",
    inputSchema: ClearTasksSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('cleared', await clearTasks(params.filter))
    } catch (error) {
      return errorText(error)
    }
  }
)

server.registerTool(
  'deskatom_reorder_task',
  {
    title: 'Reorder DeskAtom Task',
    description: 'Move a task before or after another task. Provide exactly one of before_id or after_id.',
    inputSchema: ReorderTaskSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      return mutationResponse('reordered', await reorderTask(params.id, {
        before_id: params.before_id,
        after_id: params.after_id
      }))
    } catch (error) {
      return errorText(error)
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('DeskAtom MCP server running via stdio')
}

main().catch((error) => {
  console.error('DeskAtom MCP server failed:', error)
  process.exit(1)
})
