<template>
  <div class="color-picker" :class="{ 'dark-mode': darkMode }">
    <!-- 颜色预览和输入 -->
    <div class="color-preview-section">
      <div class="color-preview" :style="previewStyle"></div>
      <div class="color-values">
        <div class="color-input-group">
          <label>HEX</label>
          <input 
            type="text" 
            :value="hexValue" 
            @input="updateFromHex"
            maxlength="7"
            class="hex-input"
          >
        </div>
      </div>
    </div>

    <!-- 饱和度/色相选择区域 -->
    <div class="color-area-section">
      <div 
        class="color-area" 
        ref="colorArea"
        @mousedown="startColorAreaDrag"
        @touchstart="startColorAreaDrag"
      >
        <div class="color-area-bg" :style="colorAreaBgStyle"></div>
        <div class="color-area-overlay"></div>
        <div 
          class="color-picker-thumb" 
          :style="colorThumbStyle"
        ></div>
      </div>
      
      <!-- 亮度滑块 -->
      <div 
        class="brightness-slider"
        ref="brightnessSlider"
        @mousedown="startBrightnessDrag"
        @touchstart="startBrightnessDrag"
      >
        <div class="brightness-gradient" :style="brightnessGradientStyle"></div>
        <div class="brightness-thumb" :style="brightnessThumbStyle"></div>
      </div>
    </div>

    <!-- RGB 输入 -->
    <div class="rgb-inputs">
      <div class="rgb-input-group">
        <label class="rgb-label red">R</label>
        <input 
          type="number" 
          min="0" 
          max="255" 
          :value="localColor.r"
          @input="updateRed"
          class="rgb-input"
        >
      </div>
      <div class="rgb-input-group">
        <label class="rgb-label green">G</label>
        <input 
          type="number" 
          min="0" 
          max="255" 
          :value="localColor.g"
          @input="updateGreen"
          class="rgb-input"
        >
      </div>
      <div class="rgb-input-group">
        <label class="rgb-label blue">B</label>
        <input 
          type="number" 
          min="0" 
          max="255" 
          :value="localColor.b"
          @input="updateBlue"
          class="rgb-input"
        >
      </div>
    </div>

    <!-- 预设颜色 -->
    <div class="preset-colors">
      <div 
        v-for="(color, index) in presetColors" 
        :key="index"
        class="preset-color"
        :style="{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }"
        @click="selectPreset(color)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ r: 255, g: 140, b: 0 })
  },
  darkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 本地颜色状态
const localColor = ref({ ...props.modelValue })
const hue = ref(30) // 色相 0-360
const saturation = ref(100) // 饱和度 0-100
const brightness = ref(100) // 亮度 0-100

// DOM 引用
const colorArea = ref(null)
const brightnessSlider = ref(null)

// 是否正在拖拽
let isDraggingColor = false
let isDraggingBrightness = false

// 预设颜色
const presetColors = [
  { r: 255, g: 140, b: 0 },   // 橙色
  { r: 255, g: 107, b: 107 }, // 红色
  { r: 255, g: 193, b: 7 },   // 黄色
  { r: 76, g: 175, b: 80 },   // 绿色
  { r: 33, g: 150, b: 243 },  // 蓝色
  { r: 156, g: 39, b: 176 },  // 紫色
  { r: 233, g: 30, b: 99 },   // 粉色
  { r: 96, g: 125, b: 139 },  // 蓝灰
]

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal && !isDraggingColor && !isDraggingBrightness) {
    localColor.value = { ...newVal }
    updateHSVFromRGB()
  }
}, { deep: true })

// RGB 转 HSV
const rgbToHsv = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  let s = max === 0 ? 0 : diff / max
  let v = max

  if (diff !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / diff + 2) / 6
        break
      case b:
        h = ((r - g) / diff + 4) / 6
        break
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    v: v * 100
  }
}

// HSV 转 RGB
const hsvToRgb = (h, s, v) => {
  h /= 360
  s /= 100
  v /= 100

  let r, g, b

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

// 从 RGB 更新 HSV
const updateHSVFromRGB = () => {
  const hsv = rgbToHsv(localColor.value.r, localColor.value.g, localColor.value.b)
  hue.value = hsv.h
  saturation.value = hsv.s
  brightness.value = hsv.v
}

// 从 HSV 更新 RGB
const updateRGBFromHSV = () => {
  const rgb = hsvToRgb(hue.value, saturation.value, brightness.value)
  localColor.value = rgb
  emit('update:modelValue', { ...rgb })
}

// HEX 值
const hexValue = computed(() => {
  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(localColor.value.r)}${toHex(localColor.value.g)}${toHex(localColor.value.b)}`.toUpperCase()
})

// 预览样式
const previewStyle = computed(() => ({
  backgroundColor: `rgb(${localColor.value.r}, ${localColor.value.g}, ${localColor.value.b})`
}))

// 颜色区域背景（根据色相）
// 颜色区域背景 - 固定彩虹渐变（水平方向所有色相）
const colorAreaBgStyle = computed(() => ({
  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
}))

// 颜色选择器 thumb 位置（X轴是色相，Y轴是饱和度）
const colorThumbStyle = computed(() => ({
  left: `${(hue.value / 360) * 100}%`,
  top: `${100 - saturation.value}%`
}))

// 亮度渐变
const brightnessGradientStyle = computed(() => ({
  background: `linear-gradient(to bottom, 
    rgb(${hsvToRgb(hue.value, saturation.value, 100).r}, ${hsvToRgb(hue.value, saturation.value, 100).g}, ${hsvToRgb(hue.value, saturation.value, 100).b}),
    black)`
}))

// 亮度 thumb 位置
const brightnessThumbStyle = computed(() => ({
  top: `${100 - brightness.value}%`
}))

// 颜色区域拖拽
const startColorAreaDrag = (e) => {
  isDraggingColor = true
  handleColorAreaMove(e)
  
  const handleMove = (e) => {
    if (isDraggingColor) {
      handleColorAreaMove(e)
    }
  }
  
  const handleEnd = () => {
    isDraggingColor = false
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
  }
  
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove)
  document.addEventListener('touchend', handleEnd)
}

const handleColorAreaMove = (e) => {
  if (!colorArea.value) return
  
  const rect = colorArea.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
  
  // 标准色相/饱和度色板：
  // X轴是色相（0-360度），Y轴是饱和度（100%-0%，从上到下）
  hue.value = x * 360
  saturation.value = (1 - y) * 100
  brightness.value = 100 // 保持亮度100%
  
  updateRGBFromHSV()
}

// 亮度滑块拖拽
const startBrightnessDrag = (e) => {
  isDraggingBrightness = true
  handleBrightnessMove(e)
  
  const handleMove = (e) => {
    if (isDraggingBrightness) {
      handleBrightnessMove(e)
    }
  }
  
  const handleEnd = () => {
    isDraggingBrightness = false
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
  }
  
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove)
  document.addEventListener('touchend', handleEnd)
}

const handleBrightnessMove = (e) => {
  if (!brightnessSlider.value) return
  
  const rect = brightnessSlider.value.getBoundingClientRect()
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
  brightness.value = (1 - y) * 100
  
  updateRGBFromHSV()
}

// 从 HEX 更新
const updateFromHex = (e) => {
  const hex = e.target.value.replace('#', '')
  if (hex.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    localColor.value = { r, g, b }
    updateHSVFromRGB()
    emit('update:modelValue', { ...localColor.value })
  }
}

// 更新 RGB 输入
const updateRed = (e) => {
  const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
  localColor.value.r = val
  updateHSVFromRGB()
  emit('update:modelValue', { ...localColor.value })
}

const updateGreen = (e) => {
  const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
  localColor.value.g = val
  updateHSVFromRGB()
  emit('update:modelValue', { ...localColor.value })
}

const updateBlue = (e) => {
  const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
  localColor.value.b = val
  updateHSVFromRGB()
  emit('update:modelValue', { ...localColor.value })
}

// 选择预设颜色
const selectPreset = (color) => {
  localColor.value = { ...color }
  updateHSVFromRGB()
  emit('update:modelValue', { ...color })
}

// 初始化
updateHSVFromRGB()
</script>

<style scoped>
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 颜色预览区域 */
.color-preview-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.color-preview {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-values {
  flex: 1;
}

.color-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-input-group label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.hex-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', 'DejaVu Sans Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hex-input:focus {
  outline: none;
  border-color: #ff8c00;
}

/* 颜色选择区域 */
.color-area-section {
  display: flex;
  gap: 12px;
  height: 160px;
}

.color-area {
  flex: 1;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: crosshair;
}

.color-area-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.color-area-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, #ffffff 100%);
}

.color-picker-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 亮度滑块 */
.brightness-slider {
  width: 28px;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  cursor: ns-resize;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.brightness-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.brightness-thumb {
  position: absolute;
  left: 50%;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  background: transparent;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translateY(-50%);
  pointer-events: none;
}

/* RGB 输入 */
.rgb-inputs {
  display: flex;
  gap: 12px;
}

.rgb-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rgb-label {
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.rgb-label.red { background: #ef4444; }
.rgb-label.green { background: #22c55e; }
.rgb-label.blue { background: #3b82f6; }

.rgb-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  text-align: center;
}

.rgb-input:focus {
  outline: none;
  border-color: #ff8c00;
}

/* 预设颜色 - 根据容器宽度动态调整 */
.preset-colors {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: clamp(4px, 1.5vw, 10px);
  width: 100%;
}

.preset-color {
  aspect-ratio: 1;
  width: 100%;
  height: auto;
  border-radius: clamp(4px, 1.2vw, 8px);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.preset-color:hover {
  transform: scale(1.1);
  border-color: #cbd5e1;
}

.preset-color:active {
  transform: scale(0.95);
}

/* 小屏幕时改为4列，限制最大宽度避免色块过大 */
@media (max-width: 480px) {
  .color-area-section {
    height: 140px;
  }
  
  .preset-colors {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(6px, 2vw, 12px);
    max-width: 280px;
    margin: 0 auto;
  }
  
  .preset-color {
    border-radius: clamp(4px, 1.2vw, 8px);
    max-width: 50px;
    max-height: 50px;
    margin: 0 auto;
  }
  
  .color-preview {
    width: 48px;
    height: 48px;
  }
}

/* 暗夜模式样式 */
.dark-mode .color-preview {
  border-color: #475569;
}

.dark-mode .color-input-group label {
  color: #94a3b8;
}

.dark-mode .hex-input {
  background: #334155;
  border-color: #475569;
  color: #f1f5f9;
}

.dark-mode .hex-input:focus {
  border-color: var(--theme-color, #ff8c00);
}

.dark-mode .rgb-input {
  background: #334155;
  border-color: #475569;
  color: #f1f5f9;
}

.dark-mode .rgb-input:focus {
  border-color: var(--theme-color, #ff8c00);
}

.dark-mode .preset-color:hover {
  border-color: #54667a;
}
</style>

