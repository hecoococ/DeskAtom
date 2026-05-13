<template>
  <button @click="toggleRecording"
    :class="['voice-btn', { recording: isRecording, disabled: !isConfigured || isConnecting }]"
    :disabled="!isConfigured || isConnecting" :title="buttonTitle">
    <svg v-if="!isRecording" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" />
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" />
      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  </button>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['result', 'error', 'start', 'end', 'autoAdd'])

const TARGET_SAMPLE_RATE = 16000
const FRAME_SAMPLES = 1600 // 1600 samples @ 16kHz = 100ms, 3200 bytes

const isRecording = ref(false)
const isConnecting = ref(false)
const isConfigured = ref(false)

let voiceWorker = null
let lastRecognizedText = ''

let mediaStream = null
let audioContext = null
let mediaSourceNode = null
let audioProcessor = null
let resumeInterval = null

let canSendAudio = false
let pendingAudioBuffers = []
let beepContext = null

function playBeep(type = 'start') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'start') {
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } else {
      osc.frequency.value = 1320
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.12)
    }

    setTimeout(() => { try { ctx.close() } catch (_) {} }, 500)
  } catch (_) {}
}

const buttonTitle = computed(() => {
  if (!isConfigured.value) return '请先配置阿里云语音服务'
  if (isConnecting.value) return '正在连接...'
  return isRecording.value ? '点击停止录音' : '点击开始语音输入'
})

function generateUUID32() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate === inputSampleRate) {
    return buffer
  }

  if (outputSampleRate > inputSampleRate) {
    throw new Error('outputSampleRate 必须小于等于 inputSampleRate')
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate
  const newLength = Math.round(buffer.length / sampleRateRatio)
  const result = new Float32Array(newLength)

  let offsetResult = 0
  let offsetBuffer = 0

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0
    let count = 0

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }

    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }

  return result
}

function clearAudioQueue() {
  pendingAudioBuffers = []
}

function flushPendingAudio() {
  if (!voiceWorker || !canSendAudio) return

  while (pendingAudioBuffers.length > 0 && voiceWorker) {
    const ab = pendingAudioBuffers.shift()
    if (!ab) break
    voiceWorker.postMessage({ type: 'audio', data: ab }, [ab])
  }
}

function enqueueAudioBuffer(arrayBuffer) {
  if (canSendAudio && voiceWorker) {
    voiceWorker.postMessage({ type: 'audio', data: arrayBuffer }, [arrayBuffer])
  } else {
    pendingAudioBuffers.push(arrayBuffer)
  }
}

function initVoiceWorker() {
  if (voiceWorker) {
    voiceWorker.terminate()
    voiceWorker = null
  }

  canSendAudio = false
  clearAudioQueue()

  voiceWorker = new Worker(
    new URL('../workers/voiceWorker.js', import.meta.url),
    { type: 'module' }
  )

  voiceWorker.onmessage = (e) => {
    const { type, data } = e.data

    switch (type) {
      case 'connected':
        console.log('Worker: WebSocket 已连接')
        break

      case 'started':
        console.log('Worker: 语音识别已开始')
        isConnecting.value = false
        isRecording.value = true
        canSendAudio = true
        flushPendingAudio()
        playBeep('start')
        emit('start')
        break

      case 'result':
        lastRecognizedText = data
        emit('result', data, false)
        break

      case 'completed':
        console.log('Worker: 识别完成')
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        canSendAudio = false
        clearAudioQueue()
        if (lastRecognizedText.trim()) {
          emit('autoAdd', lastRecognizedText.trim())
          lastRecognizedText = ''
        }
        emit('end')
        break
      case 'autoStop':
        console.log('UI: 自动停止录音')
        playBeep('stop')
        stopMediaRecorder()
        isRecording.value = false
        isConnecting.value = false
        if (lastRecognizedText.trim()) {
          emit('autoAdd', lastRecognizedText.trim())
          lastRecognizedText = ''
        }
        emit('end')
        break
      case 'closed':
        console.log('Worker: 连接已关闭')
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        canSendAudio = false
        clearAudioQueue()
        emit('end')
        break

      case 'error':
        console.error('Worker: 错误:', data)
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        canSendAudio = false
        clearAudioQueue()
        emit('error', data)
        emit('end')
        break
    }
  }

  voiceWorker.onerror = (err) => {
    console.error('Worker 错误:', err)
    playBeep('stop')
    stopMicCapture()
    isRecording.value = false
    isConnecting.value = false
    canSendAudio = false
    clearAudioQueue()
    emit('error', 'Worker 错误')
    emit('end')
  }
}

let workletNode = null

async function startMicCapture() {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  })

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  audioContext = new AudioContextClass()

  await audioContext.audioWorklet.addModule('/audio-processor.js')

  const source = audioContext.createMediaStreamSource(mediaStream)

  workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')

  // 接收 PCM 数据
  workletNode.port.onmessage = (e) => {
    const pcmBuffer = e.data

    if (voiceWorker) {
      voiceWorker.postMessage(
        { type: 'audio', data: e.data },
        [e.data] // ⚠️ transfer，避免拷贝
      )
    }
  }

  source.connect(workletNode)

  // ⚠️ 不接 destination（不会崩）
  console.log('AudioWorklet 已启动')
}
function stopMicCapture() {
  try {
    if (workletNode) {
      workletNode.disconnect()
      workletNode = null
    }
  } catch (e) { }

  try {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }
  } catch (e) { }

  try {
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
  } catch (e) { }

  clearAudioQueue()
}

async function startRecording() {
  if (!window.electronAPI) {
    emit('error', 'electronAPI 不可用')
    return
  }

  try {
    isConnecting.value = true
    canSendAudio = false
    clearAudioQueue()

    const saved = localStorage.getItem('voice-settings')
    if (!saved) {
      emit('error', '请先配置阿里云语音服务')
      isConnecting.value = false
      return
    }

    const config = JSON.parse(saved)
    if (!config.accessKeyId || !config.accessKeySecret || !config.appkey) {
      emit('error', '请先配置阿里云语音服务')
      isConnecting.value = false
      return
    }

    console.log('获取 Token...')
    const tokenResult = await window.electronAPI.getVoiceToken(config)
    if (!tokenResult.success) {
      emit('error', tokenResult.error || '获取 Token 失败')
      isConnecting.value = false
      return
    }

    initVoiceWorker()

    voiceWorker.postMessage({
      type: 'config',
      data: {
        url: 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1',
        appkey: config.appkey,
        token: tokenResult.token,

      }
    })

    // 先开始采集，音频先缓存；等 started 后再真正发送，避免开口即丢字
    await startMicCapture()

    voiceWorker.postMessage({ type: 'start' })
  } catch (error) {
    console.error('启动失败:', error)
    stopMicCapture()
    isConnecting.value = false
    isRecording.value = false
    canSendAudio = false
    clearAudioQueue()
    emit('error', error?.message || '启动失败')
  }
}

function stopRecording() {
  console.log('停止录音')
  playBeep('stop')

  isRecording.value = false
  isConnecting.value = false
  canSendAudio = false
  clearAudioQueue()

  stopMicCapture()

  if (voiceWorker) {
    try {
      voiceWorker.postMessage({ type: 'stop' })
    } catch (e) { }

    // 给服务端一点时间返回 completed，再兜底 terminate
    setTimeout(() => {
      if (voiceWorker) {
        voiceWorker.terminate()
        voiceWorker = null
      }
    }, 800)
  }
}

async function toggleRecording() {
  if (!isConfigured.value) return

  if (isRecording.value || isConnecting.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

async function checkVoiceConfig() {
  if (!window.electronAPI) return false

  const saved = localStorage.getItem('voice-settings')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      if (config.accessKeyId && config.accessKeySecret && config.appkey) {
        isConfigured.value = true
        return true
      }
    } catch (e) {
      console.error('加载语音配置失败:', e)
    }
  }
  isConfigured.value = false
  return false
}

onMounted(async () => {
  await checkVoiceConfig()
})

onUnmounted(() => {
  stopRecording()
})

defineExpose({
  checkConfig: checkVoiceConfig
})
</script>

<style scoped>
.voice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-on-color, var(--theme-color));
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.voice-btn:hover:not(.disabled) {
  background: var(--theme-color-light);
  transform: scale(1.05);
}

.voice-btn:active:not(.disabled) {
  transform: scale(0.95);
}

.voice-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.voice-btn.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
}
</style>