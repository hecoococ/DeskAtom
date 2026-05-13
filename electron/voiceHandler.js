import { ipcMain } from 'electron'
import WebSocket from 'ws'

let ws = null
let isRecording = false
let isStarting = false
let currentToken = null
let tokenExpireTime = null
let taskId = null
let mainWindowRef = null

const NLS_CONFIG = {
  url: 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1',
  appkey: '',
  accessKeyId: '',
  accessKeySecret: ''
}

function generateUUID() {
  const uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
  return uuid
}

function safeSendToRenderer(channel, data) {
  try {
    if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.webContents && !mainWindowRef.webContents.isDestroyed()) {
      mainWindowRef.webContents.send(channel, data)
    }
  } catch (e) {
    console.error('发送消息到渲染进程失败:', e)
  }
}

async function createToken() {
  try {
    const RPCClient = (await import('@alicloud/pop-core')).default

    const client = new RPCClient({
      accessKeyId: NLS_CONFIG.accessKeyId,
      accessKeySecret: NLS_CONFIG.accessKeySecret,
      endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
      apiVersion: '2019-02-28'
    })

    const result = await client.request('CreateToken')
    console.log('Token 创建成功:', result)

    if (result.Token && result.Token.Id) {
      currentToken = result.Token.Id
      tokenExpireTime = result.Token.ExpireTime
      return { success: true, token: currentToken, expireTime: tokenExpireTime }
    }

    return { success: false, error: 'Token 创建失败：无效的响应' }
  } catch (error) {
    console.error('创建 Token 失败:', error)
    return { success: false, error: error.message || '创建 Token 失败' }
  }
}

async function ensureValidToken() {
  const now = Math.floor(Date.now() / 1000)

  if (currentToken && tokenExpireTime && tokenExpireTime - now > 300) {
    console.log('Token 仍然有效，无需重新创建')
    return { success: true, token: currentToken }
  }

  console.log('Token 已过期或不存在，需要重新创建')
  return await createToken()
}

function setNlsConfig(config) {
  if (config.accessKeyId) NLS_CONFIG.accessKeyId = config.accessKeyId
  if (config.accessKeySecret) NLS_CONFIG.accessKeySecret = config.accessKeySecret
  if (config.appkey) NLS_CONFIG.appkey = config.appkey
  if (config.url) NLS_CONFIG.url = config.url
}

function closeExistingConnection() {
  if (ws) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    } catch (e) {
      console.error('关闭旧连接失败:', e)
    }
    ws = null
  }
}

function connectWebSocket(token) {
  return new Promise((resolve, reject) => {
    const url = `${NLS_CONFIG.url}?token=${token}`
    console.log('连接 WebSocket:', url.replace(token, '***'))

    closeExistingConnection()

    ws = new WebSocket(url)

    ws.on('open', () => {
      console.log('WebSocket 已连接')
      resolve()
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        console.log('收到消息:', JSON.stringify(msg))

        if (msg.header) {
          if (msg.header.name === 'TranscriptionStarted') {
            console.log('实时语音识别已开始')
            isRecording = true
            isStarting = false
            safeSendToRenderer('voice-started')
          } else if (msg.header.name === 'TranscriptionResultChanged') {
            if (msg.payload && msg.payload.result) {
              console.log('中间结果:', msg.payload.result)
              safeSendToRenderer('voice-changed', msg.payload.result)
            }
          } else if (msg.header.name === 'SentenceBegin') {
            console.log('句子开始')
          } else if (msg.header.name === 'SentenceEnd') {
            if (msg.payload && msg.payload.result) {
              console.log('句子结束:', msg.payload.result)
              safeSendToRenderer('voice-sentence-end', msg.payload.result)
            }
          } else if (msg.header.name === 'TranscriptionCompleted') {
            console.log('实时语音识别完成')
            isRecording = false
            isStarting = false
            safeSendToRenderer('voice-completed')
          } else if (msg.header.name === 'TaskFailed') {
            console.error('识别失败:', msg.header.status_text)
            isRecording = false
            isStarting = false
            safeSendToRenderer('voice-error', msg.header.status_text)
          }
        }
      } catch (e) {
        console.error('解析消息失败:', e)
      }
    })

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error)
      isStarting = false
      reject(error)
    })

    ws.on('close', () => {
      console.log('WebSocket 已关闭')
      isRecording = false
      isStarting = false
      safeSendToRenderer('voice-closed')
    })
  })
}

function sendStartTranscription() {
  taskId = generateUUID()

  const message = {
    header: {
      appkey: NLS_CONFIG.appkey,
      message_id: generateUUID(),
      task_id: taskId,
      namespace: 'SpeechTranscriber',
      name: 'StartTranscription',
    },
    payload: {
      format: 'pcm',
      sample_rate: 16000,
      enable_intermediate_result: true,
      enable_punctuation_prediction: false,
      enable_inverse_text_normalization: true,
      enable_semantic_sentence_detection: false
    }
  }

  console.log('发送开始识别:', JSON.stringify(message))
  ws.send(JSON.stringify(message))
}

function sendStopTranscription() {
  if (!taskId) return

  const message = {
    header: {
      appkey: NLS_CONFIG.appkey,
      message_id: generateUUID(),
      task_id: taskId,
      namespace: 'SpeechTranscriber',
      name: 'StopTranscription',
    },
    payload: {}
  }

  console.log('发送停止识别')
  ws.send(JSON.stringify(message))
}

async function startVoiceRecognition(mainWindow) {
  if (isRecording || isStarting) {
    console.log('语音识别已在运行或正在启动')
    return { success: false, error: '已经在录音中' }
  }

  if (!NLS_CONFIG.accessKeyId || !NLS_CONFIG.accessKeySecret) {
    console.error('阿里云配置不完整')
    safeSendToRenderer('voice-error', '请先配置阿里云访问密钥')
    return { success: false, error: '请先配置阿里云访问密钥(AccessKey)' }
  }

  if (!NLS_CONFIG.appkey) {
    console.error('AppKey 未配置')
    safeSendToRenderer('voice-error', '请先配置 AppKey')
    return { success: false, error: '请先配置 AppKey' }
  }

  mainWindowRef = mainWindow
  isStarting = true

  try {
    const tokenResult = await ensureValidToken()
    if (!tokenResult.success) {
      isStarting = false
      safeSendToRenderer('voice-error', tokenResult.error)
      return { success: false, error: tokenResult.error }
    }

    await connectWebSocket(tokenResult.token)

    sendStartTranscription()

    console.log('阿里云连接已建立，等待音频数据...')
    return { success: true }

  } catch (error) {
    console.error('启动语音识别失败:', error)
    isRecording = false
    isStarting = false
    safeSendToRenderer('voice-error', error.message || '启动失败')
    return { success: false, error: error.message }
  }
}

function sendAudioData(audioData) {
  if (ws && isRecording && ws.readyState === WebSocket.OPEN) {
    try {
      const buffer = Buffer.alloc(audioData.length * 2)
      for (let i = 0; i < audioData.length; i++) {
        buffer.writeInt16LE(audioData[i], i * 2)
      }
      ws.send(buffer)
    } catch (e) {
      console.error('发送音频数据失败:', e)
    }
  }
}

function stopVoiceRecognition() {
  return new Promise((resolve) => {
    isRecording = false
    isStarting = false

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        sendStopTranscription()
        setTimeout(() => {
          if (ws) {
            ws.close()
            ws = null
          }
          resolve({ success: true })
        }, 500)
      } catch (error) {
        console.error('停止语音识别失败:', error)
        resolve({ success: false, error: error.message })
      }
    } else {
      if (ws) {
        ws.close()
        ws = null
      }
      resolve({ success: true })
    }
  })
}

function setupVoiceIpcHandlers(mainWindow) {
  ipcMain.handle('voice-config', async (event, config) => {
    console.log('收到语音配置:', config)
    setNlsConfig(config)
    return { success: true }
  })

  ipcMain.handle('get-voice-token', async (event, config) => {
    console.log('获取语音 Token...')
    setNlsConfig(config)
    return await createToken()
  })

  ipcMain.handle('voice-start', async () => {
    console.log('收到语音开始请求')
    return await startVoiceRecognition(mainWindow)
  })

  ipcMain.handle('voice-stop', async () => {
    console.log('收到语音停止请求')
    return await stopVoiceRecognition()
  })

  ipcMain.handle('voice-status', () => {
    return { isRecording }
  })

  ipcMain.on('voice-send-audio', (event, audioData) => {
    sendAudioData(audioData)
  })
}

export { setupVoiceIpcHandlers }
