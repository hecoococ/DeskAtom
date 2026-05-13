<template>
  <button
    @click="toggleRecording"
    :class="['voice-btn', { recording: isRecording, disabled: !isConfigured || isConnecting }]"
    :disabled="!isConfigured || isConnecting"
    :title="buttonTitle"
  >
    <svg v-if="!isRecording" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M19 10v2a7 7 0 0 1-14 0v-2"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  </button>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['result', 'error', 'start', 'end', 'autoAdd'])

const isRecording = ref(false)
const isConnecting = ref(false)
const isConfigured = ref(false)

let voiceWorker = null
let lastRecognizedText = ''

let mediaStream = null
let audioContext = null
let workletNode = null

const buttonTitle = computed(() => {
  if (!isConfigured.value) return 'Please configure voice service first'
  if (isConnecting.value) return 'Connecting...'
  return isRecording.value ? 'Click to stop' : 'Click to start voice input'
})

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

    setTimeout(() => {
      try {
        ctx.close()
      } catch (_) {}
    }, 500)
  } catch (_) {}
}

function initVoiceWorker() {
  if (voiceWorker) {
    voiceWorker.terminate()
    voiceWorker = null
  }

  voiceWorker = new Worker(
    new URL('../workers/voiceWorker.js', import.meta.url),
    { type: 'module' }
  )

  voiceWorker.onmessage = (e) => {
    const { type, data } = e.data

    switch (type) {
      case 'connected':
        console.log('Worker: WebSocket connected')
        break

      case 'started':
        console.log('Worker: Recognition started')
        isConnecting.value = false
        isRecording.value = true
        playBeep('start')
        emit('start')
        break

      case 'result':
        lastRecognizedText = data
        emit('result', data, false)
        break

      case 'completed':
        console.log('Worker: Recognition completed')
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        if (lastRecognizedText.trim()) {
          emit('autoAdd', lastRecognizedText.trim())
          lastRecognizedText = ''
        }
        emit('end')
        break

      case 'autoStop':
        console.log('Worker: Auto stop (silence)')
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        if (lastRecognizedText.trim()) {
          emit('autoAdd', lastRecognizedText.trim())
          lastRecognizedText = ''
        }
        emit('end')
        break

      case 'closed':
        console.log('Worker: Connection closed')
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        emit('end')
        break

      case 'error':
        console.error('Worker: Error:', data)
        playBeep('stop')
        stopMicCapture()
        isRecording.value = false
        isConnecting.value = false
        emit('error', data)
        emit('end')
        break
    }
  }

  voiceWorker.onerror = (err) => {
    console.error('Worker error:', err)
    playBeep('stop')
    stopMicCapture()
    isRecording.value = false
    isConnecting.value = false
    emit('error', 'Worker error')
    emit('end')
  }
}

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

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  // ⚠️ Must use this format for build compatibility
  const workletUrl = new URL('../audio-processor.js', import.meta.url)
  await audioContext.audioWorklet.addModule(workletUrl)

  const source = audioContext.createMediaStreamSource(mediaStream)
  workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')

  workletNode.port.onmessage = (e) => {
    if (voiceWorker) {
      voiceWorker.postMessage(
        { type: 'audio', data: e.data },
        [e.data]
      )
    }
  }

  source.connect(workletNode)
  // ❗ Never connect to destination
}

function stopMicCapture() {
  try {
    if (workletNode) {
      workletNode.disconnect()
      workletNode = null
    }
  } catch (e) {}

  try {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }
  } catch (e) {}

  try {
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
  } catch (e) {}
}

async function startRecording() {
  try {
    isConnecting.value = true
    lastRecognizedText = ''

    // Load config from localStorage or props
    const saved = localStorage.getItem('voice-settings')
    if (!saved) {
      emit('error', 'Please configure voice service first')
      isConnecting.value = false
      return
    }

    const config = JSON.parse(saved)

    initVoiceWorker()

    voiceWorker.postMessage({
      type: 'config',
      data: {
        url: 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1',
        appkey: config.appkey,
        token: config.token
      }
    })

    await startMicCapture()
    voiceWorker.postMessage({ type: 'start' })
  } catch (error) {
    console.error('Start failed:', error)
    stopMicCapture()
    isConnecting.value = false
    isRecording.value = false
    emit('error', error?.message || 'Start failed')
  }
}

function stopRecording() {
  console.log('Stop recording')
  playBeep('stop')

  isRecording.value = false
  isConnecting.value = false

  stopMicCapture()

  if (voiceWorker) {
    try {
      voiceWorker.postMessage({ type: 'stop' })
    } catch (e) {}

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
  const saved = localStorage.getItem('voice-settings')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      if (config.appkey && config.token) {
        isConfigured.value = true
        return true
      }
    } catch (e) {
      console.error('Load config failed:', e)
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
