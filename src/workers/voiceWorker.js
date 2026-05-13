let ws = null
let taskId = null
let config = null

let isStarted = false
let isConnected = false

let reconnectTimer = null
let audioQueue = []
let silenceStartTime = null
const SILENCE_THRESHOLD = 500   // 静音阈值（和你VAD一致）
const SILENCE_TIMEOUT = 2000    // 2秒

function uuid() {
  return crypto.randomUUID().replace(/-/g, '')
}

// 🔌 连接
function connect() {
  const url = `${config.url}?token=${config.token}`

  ws = new WebSocket(url)

  ws.onopen = () => {
    isConnected = true
    self.postMessage({ type: 'connected' })
    startTranscription()
  }

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)

    if (!msg.header) return

    const name = msg.header.name

    if (name === 'TranscriptionStarted') {
      isStarted = true
      self.postMessage({ type: 'started' })

      // flush 缓存音频
      flushAudioQueue()
    }

    else if (name === 'TranscriptionResultChanged') {
      self.postMessage({
        type: 'result',
        data: msg.payload?.result || '',
        isFinal: false
      })
    }

    else if (name === 'SentenceEnd') {
      self.postMessage({
        type: 'result',
        data: msg.payload?.result || '',
        isFinal: true
      })
    }

    else if (name === 'TranscriptionCompleted') {
      self.postMessage({ type: 'completed' })
      cleanup()
    }

    else if (name === 'TaskFailed') {
      self.postMessage({ type: 'error', data: msg.header.status_text })
      cleanup()
    }
  }

  ws.onclose = () => {
    isConnected = false
    isStarted = false

    self.postMessage({ type: 'closed' })

    // 🔁 自动重连（如果还在录音）
    if (config && config.autoReconnect) {
      reconnect()
    }
  }

  ws.onerror = () => {
    self.postMessage({ type: 'error', data: 'WebSocket error' })
  }
}

// ▶️ 开始识别
function startTranscription() {
  taskId = uuid()

  ws.send(JSON.stringify({
    header: {
      appkey: config.appkey,
      message_id: uuid(),
      task_id: taskId,
      namespace: 'SpeechTranscriber',
      name: 'StartTranscription',
    },
    payload: {
      format: 'pcm',
      sample_rate: 16000,
      enable_intermediate_result: true
    }
  }))
}

// ⏹️ 停止
function stop() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      header: {
        appkey: config.appkey,
        message_id: uuid(),
        task_id: taskId,
        namespace: 'SpeechTranscriber',
        name: 'StopTranscription',
      },
      payload: {}
    }))
  }
}

// 🔁 重连
function reconnect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    connect()
  }, 1000)
}

// 🧠 音频缓存（避免 started 前丢音）
function enqueueAudio(data) {
  if (isStarted && ws?.readyState === 1) {
    ws.send(data)
  } else {
    audioQueue.push(data)
  }
}

function flushAudioQueue() {
  while (audioQueue.length > 0) {
    ws.send(audioQueue.shift())
  }
}

// 🧹 清理
function cleanup() {
  isStarted = false
  audioQueue = []
}

// 📩 消息入口
self.onmessage = (e) => {
  const { type, data } = e.data

  switch (type) {
    case 'config':
      config = data
      break

    case 'start':
      connect()
      break

    case 'stop':
      stop()
      break

    case 'audio': {
  const silent = isSilent(data)

  if (!silent) {
    // 🎤 有声音
    silenceStartTime = null
    enqueueAudio(data)
  } else {
    // 🔇 静音
    if (!silenceStartTime) {
      silenceStartTime = Date.now()
    }

    const duration = Date.now() - silenceStartTime

    if (duration > SILENCE_TIMEOUT) {
      console.log('🛑 静音超时，自动停止')

      self.postMessage({ type: 'autoStop' }) // 通知UI
      stop()
      silenceStartTime = null
    }
  }

  break
}
  }
}

// 🔇 简单 VAD（能省 60% 流量）
function isSilent(buffer) {
  const view = new Int16Array(buffer)
  let sum = 0
  for (let i = 0; i < view.length; i++) {
    sum += Math.abs(view[i])
  }
  const avg = sum / view.length
  return avg < 500 // 阈值可调
}