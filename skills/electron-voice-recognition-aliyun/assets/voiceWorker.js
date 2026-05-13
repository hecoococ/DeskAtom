/**
 * Web Worker for WebSocket Voice Recognition Control
 * Handles Alibaba Cloud NLS protocol and audio streaming
 */

let ws = null
let taskId = null
let config = null

let isStarted = false
let isConnected = false

let reconnectTimer = null
let audioQueue = []
let silenceStartTime = null
const SILENCE_THRESHOLD = 500
const SILENCE_TIMEOUT = 2000

function uuid() {
  return crypto.randomUUID().replace(/-/g, '')
}

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
  }

  ws.onerror = (err) => {
    self.postMessage({ type: 'error', data: 'WebSocket error' })
  }
}

function startTranscription() {
  taskId = uuid()

  const startMsg = {
    header: {
      message_id: uuid(),
      task_id: taskId,
      namespace: 'SpeechTranscriber',
      name: 'StartTranscription',
      appkey: config.appkey
    },
    payload: {
      format: 'pcm',
      sample_rate: 16000,
      enable_intermediate_result: true,
      enable_punctuation_prediction: false
    }
  }

  ws.send(JSON.stringify(startMsg))
}

function stop() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  const stopMsg = {
    header: {
      message_id: uuid(),
      task_id: taskId,
      namespace: 'SpeechTranscriber',
      name: 'StopTranscription',
      appkey: config.appkey
    }
  }

  ws.send(JSON.stringify(stopMsg))

  setTimeout(() => {
    if (ws) {
      ws.close()
      ws = null
    }
    cleanup()
  }, 500)
}

function enqueueAudio(data) {
  if (ws && isStarted && ws.readyState === WebSocket.OPEN) {
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

function cleanup() {
  isStarted = false
  audioQueue = []
}

function isSilent(buffer) {
  const view = new Int16Array(buffer)
  let sum = 0
  for (let i = 0; i < view.length; i++) {
    sum += Math.abs(view[i])
  }
  const avg = sum / view.length
  return avg < SILENCE_THRESHOLD
}

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
        silenceStartTime = null
        enqueueAudio(data)
      } else {
        if (!silenceStartTime) {
          silenceStartTime = Date.now()
        }

        const duration = Date.now() - silenceStartTime

        if (duration > SILENCE_TIMEOUT) {
          console.log('Silence timeout, auto stop')
          self.postMessage({ type: 'autoStop' })
          stop()
          silenceStartTime = null
        }
      }
      break
    }
  }
}
