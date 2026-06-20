import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const AI_CONFIG_FILE_NAME = 'ai-settings.json'
const DEFAULT_AI_CONFIG = {
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini'
}

function getDefaultDataDir() {
  if (process.env.DESKATOM_DATA_DIR) return process.env.DESKATOM_DATA_DIR
  if (process.env.APPDATA) return path.join(process.env.APPDATA, 'DeskAtom')
  return path.join(os.homedir(), '.deskatom')
}

export function getAIConfigFilePath(dataDir = getDefaultDataDir()) {
  return path.join(dataDir, AI_CONFIG_FILE_NAME)
}

function normalizeAIConfig(config = {}) {
  return {
    baseURL: String(config.baseURL || DEFAULT_AI_CONFIG.baseURL).trim().replace(/\/+$/, '') || DEFAULT_AI_CONFIG.baseURL,
    apiKey: String(config.apiKey || '').trim(),
    model: String(config.model || DEFAULT_AI_CONFIG.model).trim() || DEFAULT_AI_CONFIG.model
  }
}

async function ensureDataDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export async function readAIConfig(options = {}) {
  const filePath = options.filePath || getAIConfigFilePath(options.dataDir)
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return normalizeAIConfig(JSON.parse(content))
  } catch (error) {
    if (error?.code === 'ENOENT') return { ...DEFAULT_AI_CONFIG }
    throw new Error(`读取 AI 配置失败: ${error.message}`)
  }
}

export async function writeAIConfig(config, options = {}) {
  const filePath = options.filePath || getAIConfigFilePath(options.dataDir)
  const normalizedConfig = normalizeAIConfig(config)
  await ensureDataDir(filePath)
  await fs.writeFile(filePath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8')
  return normalizedConfig
}

function getChatCompletionsUrl(baseURL) {
  const normalizedBaseURL = String(baseURL || DEFAULT_AI_CONFIG.baseURL).trim().replace(/\/+$/, '')
  return normalizedBaseURL.endsWith('/chat/completions')
    ? normalizedBaseURL
    : `${normalizedBaseURL}/chat/completions`
}

function extractJson(text) {
  const content = String(text || '').trim()
  if (!content) throw new Error('AI 没有返回内容。')

  try {
    return JSON.parse(content)
  } catch {
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (codeBlock) return JSON.parse(codeBlock[1].trim())

    const objectStart = content.indexOf('{')
    const objectEnd = content.lastIndexOf('}')
    if (objectStart !== -1 && objectEnd > objectStart) {
      return JSON.parse(content.slice(objectStart, objectEnd + 1))
    }
    throw new Error('AI 返回内容不是有效 JSON。')
  }
}

function normalizeSplitResult(rawResult, maxTasks = 30) {
  const groupName = String(rawResult?.groupName || rawResult?.group_name || 'AI 拆分任务').trim().slice(0, 100)
  const explanation = String(rawResult?.explanation || rawResult?.summary || '').trim().slice(0, 300)
  const seenTexts = new Set()
  const tasks = []

  for (const rawTask of Array.isArray(rawResult?.tasks) ? rawResult.tasks : []) {
    const text = typeof rawTask === 'string' ? rawTask.trim() : String(rawTask?.text || '').trim()
    if (!text || seenTexts.has(text)) continue
    seenTexts.add(text)
    tasks.push(text.slice(0, 1000))
    if (tasks.length >= maxTasks) break
  }

  if (!groupName) throw new Error('AI 返回的分组名称为空。')
  if (tasks.length === 0) throw new Error('AI 没有拆分出有效任务。')

  return { groupName, tasks, explanation }
}

function buildCountRequirement({ countMode, taskCount, taskCountMin, taskCountMax, maxTasks }) {
  if (countMode === 'exact') return `必须拆分为正好 ${taskCount} 条任务。`
  if (countMode === 'approx') return `请尽量拆分为 ${taskCountMin} 到 ${taskCountMax} 条任务，除非内容明显不适合，否则不要超出这个范围。`
  return `任务数量无硬性要求，但最多不要超过 ${maxTasks} 条。`
}

function buildSplitPrompt({ text, supplement, contextGroupName, groups, language, maxTasks, countMode, taskCount, taskCountMin, taskCountMax }) {
  const groupNames = Array.isArray(groups)
    ? groups.map((group) => group?.name).filter(Boolean).slice(0, 30).join('、')
    : ''
  const outputLanguage = language === 'en' ? 'English' : '简体中文'
  const countRequirement = buildCountRequirement({ countMode, taskCount, taskCountMin, taskCountMax, maxTasks })

  return [
    '你是 DeskAtom 的任务拆分助手。请把用户输入的一段复杂事项拆成普通待办任务。',
    `输出语言: ${outputLanguage}`,
    `数量要求: ${countRequirement}`,
    contextGroupName ? `当前上下文分组: ${contextGroupName}` : '',
    groupNames ? `已有分组名称: ${groupNames}` : '',
    supplement ? `用户补充信息/修正意见:\n${supplement}` : '',
    '',
    '要求:',
    '- 只输出 JSON，不要 Markdown，不要解释性前后缀。',
    '- JSON 结构必须是 {"groupName":"...","tasks":["..."],"explanation":"..."}。',
    '- groupName 要短，适合作为任务分组名称。',
    '- tasks 必须是具体、可执行、彼此不重复的短任务标题。',
    '- 每条任务尽量控制在 8 个汉字以内，最多一句话。',
    '- 每条任务只写动作和对象，例如“整理资料”“联系老师”“购买材料”。',
    '- 不要写原因、背景、备注、时间推测、负责人推测或多个动作。',
    '- 不要凭空补充用户没有提供的事实；缺失信息请体现在 explanation 中，而不是编造到任务里。',
    '- 如果用户补充信息指出之前结果不准确，请优先按补充信息修正。',
    '- 不要生成多层子任务，不要包含编号前缀。',
    '',
    `用户输入:\n${text}`
  ].filter(Boolean).join('\n')
}

async function requestChatCompletion(config, messages, { responseFormat = true } = {}) {
  const response = await fetch(getChatCompletionsUrl(config.baseURL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
      ...(responseFormat ? { response_format: { type: 'json_object' } } : {})
    })
  })

  const rawText = await response.text()
  let body = null
  try {
    body = rawText ? JSON.parse(rawText) : null
  } catch {
    body = null
  }

  if (!response.ok) {
    const detail = body?.error?.message || rawText || response.statusText
    throw new Error(`AI 请求失败 (${response.status}): ${detail}`)
  }

  return body?.choices?.[0]?.message?.content || ''
}

export async function splitTaskText(payload = {}, options = {}) {
  const text = String(payload.text || '').trim()
  if (!text) throw new Error('请提供需要拆分的文本。')

  const countMode = ['none', 'approx', 'exact'].includes(payload.countMode || payload.count_mode)
    ? (payload.countMode || payload.count_mode)
    : 'none'
  const taskCount = Math.max(1, Math.min(Number(payload.taskCount || payload.task_count || 8), 30))
  const rawTaskCountMin = Math.max(1, Math.min(Number(payload.taskCountMin || payload.task_count_min || 5), 30))
  const rawTaskCountMax = Math.max(1, Math.min(Number(payload.taskCountMax || payload.task_count_max || 10), 30))
  const taskCountMin = Math.min(rawTaskCountMin, rawTaskCountMax)
  const taskCountMax = Math.max(rawTaskCountMin, rawTaskCountMax)
  const maxTasks = Math.max(1, Math.min(Number(payload.maxTasks || payload.max_tasks || (countMode === 'exact' ? taskCount : 30)), 30))
  const config = normalizeAIConfig(options.config || await readAIConfig(options))
  if (!config.apiKey) throw new Error('请先在设置中配置 AI API Key。')
  if (!config.model) throw new Error('请先在设置中配置 AI 模型名称。')

  const messages = [
    {
      role: 'system',
      content: '你擅长把模糊、复杂、冗长的事项拆成清晰可执行的短任务标题，并严格返回 JSON。'
    },
    {
      role: 'user',
      content: buildSplitPrompt({
        text,
        supplement: payload.supplement,
        contextGroupName: payload.contextGroupName || payload.context_group_name,
        groups: payload.groups,
        language: payload.language || 'zh',
        maxTasks,
        countMode,
        taskCount,
        taskCountMin,
        taskCountMax
      })
    }
  ]

  let content
  try {
    content = await requestChatCompletion(config, messages, { responseFormat: true })
  } catch (error) {
    if (!String(error?.message || '').includes('response_format')) throw error
    content = await requestChatCompletion(config, messages, { responseFormat: false })
  }

  return normalizeSplitResult(extractJson(content), maxTasks)
}
