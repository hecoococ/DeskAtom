---
name: electron-voice-recognition-aliyun
description: Implement real-time voice recognition in Electron apps using Alibaba Cloud NLS WebSocket API with AudioWorklet. Handles PCM audio processing, strict protocol control, and common pitfalls like window disappearing and IDLE_TIMEOUT errors.
---

# Electron 实时语音识别（阿里云 WebSocket + AudioWorklet）

This skill provides the complete architecture and implementation guide for real-time speech-to-text in Electron desktop applications using Alibaba Cloud NLS (Intelligent Speech Interaction) via WebSocket streaming.

## When to Use This Skill

Use this skill when:
- Building Electron desktop apps with voice input
- Implementing real-time streaming ASR (not one-shot recognition)
- Using Alibaba Cloud NLS or similar WebSocket-based speech services
- Encountering issues like "window disappears", "IDLE_TIMEOUT", or "no recognition results"

## Architecture Overview

```
Mic (getUserMedia)
  ↓
AudioWorklet (Float32 → Int16 PCM)
  ↓
Main Thread (forwarding)
  ↓
Web Worker (protocol control)
  ↓
WebSocket (cloud)
  ↓
ASR Service (Alibaba Cloud)
  ↓
Recognition results returned
```

## Core Module Implementation

### 1. AudioWorklet Processor

File: `src/audio-processor.js`

```javascript
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input.length > 0) {
      const channelData = input[0]

      // Float32 to Int16 PCM conversion
      const int16 = new Int16Array(channelData.length)
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      // Transfer ownership to avoid copy
      this.port.postMessage(int16.buffer, [int16.buffer])
    }
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
```

Load this file using the assets template: `assets/audio-processor.js`

### 2. Microphone Capture (VoiceInput.vue)

```javascript
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

  // Required for Electron
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  // ⚠️ Must use this format for build compatibility
  const workletUrl = new URL('../audio-processor.js', import.meta.url)
  await audioContext.audioWorklet.addModule(workletUrl)

  const source = audioContext.createMediaStreamSource(mediaStream)
  workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')

  workletNode.port.onmessage = (e) => {
    voiceWorker.postMessage(
      { type: 'audio', data: e.data },
      [e.data]
    )
  }

  source.connect(workletNode)
  // ❗ Never connect to destination
}
```

See full template: `assets/VoiceInput.vue`

### 3. Web Worker (WebSocket Control)

File: `src/workers/voiceWorker.js`

Key logic:
```javascript
// Only send audio after started
if (ws && isRecording && ws.readyState === WebSocket.OPEN) {
  ws.send(data)
}
```

Full implementation: `assets/voiceWorker.js`

### 4. Alibaba Cloud Protocol

Start command:
```json
{
  "header": {
    "namespace": "SpeechTranscriber",
    "name": "StartTranscription",
    "message_id": "32-char-uuid-no-dashes",
    "task_id": "32-char-uuid-no-dashes"
  },
  "payload": {
    "format": "pcm",
    "sample_rate": 16000,
    "enable_intermediate_result": true,
    "enable_punctuation_prediction": false
  }
}
```

### 5. State Control

```javascript
let isRecording = false

// Only set true after receiving this event
// TranscriptionStarted → isRecording = true
```

## 10 Critical Rules

### ❌ 1. Never Use MediaRecorder
- Outputs opus/webm format ❌
- Alibaba Cloud requires PCM ❌

### ❌ 2. Never Connect audioContext.destination
```javascript
// ❌ source.connect(destination)
// Causes:
// - Electron window disappears
// - GPU composition errors
```

### ✅ 3. Must Use AudioWorklet
- Only low-latency + controllable PCM solution

### ✅ 4. Worklet Path Must Use URL Constructor
```javascript
new URL('../audio-processor.js', import.meta.url)
```

### ❌ 5. Never Use Absolute Paths
```javascript
// ❌ '/audio-processor.js'
```

### ❌ 6. Never Place in public Directory
- Not accessible after Electron build

### ✅ 7. Must Wait for TranscriptionStarted
- Otherwise: "Empty audio data" error

### ✅ 8. message_id Must Be 32-char UUID
- No dashes, hexadecimal only

### ✅ 9. Check WebSocket readyState
```javascript
if (ws.readyState === WebSocket.OPEN)
```

### ✅ 10. No Audio = Everything Normal But No Results
Typical symptoms:
- ✔ Connected
- ✔ Started
- ❌ No recognition
→ Root cause: Not sending audio

## Debugging Methods

### 1. Verify Worklet Loaded
```javascript
console.log('Worklet loaded')
```

### 2. Verify Audio Stream
```javascript
console.log('PCM size:', e.data.byteLength)
```

### 3. Verify Sending
```javascript
console.log('sending audio...')
```

### 4. Verify Server Response
```
TranscriptionStarted ✔
ResultChanged ✔
```

## Error Quick Reference

| Symptom | Cause |
|---------|-------|
| IDLE_TIMEOUT | Not sending audio |
| Window disappears | Connected to destination |
| Worklet load fails | Path error |
| DOMException abort | Permission / path issue |
| No recognition | PCM format error |
| ROUTING_ERROR | Multiple connections |
| Empty audio | Sending before started |

## Advanced Extensions

### 1. Voice Activity Detection (VAD)
Auto-stop after 2 seconds of silence

### 2. Resampling (Required Optimization)
48kHz → 16kHz conversion

### 3. Flow Control
Prevent ws.send() backlog

### 4. Offline Fallback
sherpa-onnx for offline recognition

## Summary

The only correct path for stable voice recognition in Electron:

**AudioWorklet + Worker + WebSocket + Strict Protocol Control + No Audio Output Chain**

## Bundled Resources

- `assets/audio-processor.js` - AudioWorklet processor template
- `assets/VoiceInput.vue` - Main component template
- `assets/voiceWorker.js` - Web Worker template
