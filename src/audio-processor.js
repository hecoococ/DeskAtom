class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = []
    this.targetSampleRate = 16000
    this.inputSampleRate = sampleRate
    this.ratio = this.inputSampleRate / this.targetSampleRate
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const data = input[0]

    // ↓ 降采样
    const downsampled = []
    for (let i = 0; i < data.length; i += this.ratio) {
      downsampled.push(data[Math.floor(i)])
    }

    // ↓ Float32 → Int16
    for (let i = 0; i < downsampled.length; i++) {
      const s = Math.max(-1, Math.min(1, downsampled[i]))
      this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff)
    }

    // ↓ 每 1600 samples 发一次
    while (this.buffer.length >= 1600) {
      const chunk = new Int16Array(this.buffer.slice(0, 1600))
      this.buffer = this.buffer.slice(1600)

      this.port.postMessage(chunk.buffer, [chunk.buffer])
    }

    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)