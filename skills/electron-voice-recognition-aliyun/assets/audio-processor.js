/**
 * AudioWorklet Processor for PCM Audio Capture
 * Converts Float32 audio to Int16 PCM for WebSocket streaming
 * 
 * Usage in main thread:
 * const workletUrl = new URL('../audio-processor.js', import.meta.url)
 * await audioContext.audioWorklet.addModule(workletUrl)
 * workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')
 */

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
