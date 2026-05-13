<template>
  <div class="glass-blur-slider-container" :class="{ 'dark-mode': darkMode }">
    <!-- 模糊度预览 - 模仿图片样式 -->
    <div class="glass-blur-preview-section">
      <div class="glass-blur-preview-wrapper">
        <!-- 背景装饰圆形 -->
        <div class="bg-circle circle-1"></div>
        <div class="bg-circle circle-2"></div>
        <!-- 毛玻璃卡片 -->
        <div 
          class="glass-blur-preview-card" 
          :style="previewStyle"
        >
          <span class="preview-text">毛玻璃效果</span>
        </div>
      </div>
      <div class="glass-blur-value">
        <span class="value">{{ localBlur }}</span>
        <span class="unit">px</span>
      </div>
    </div>

    <!-- 滑块 -->
    <div 
      class="slider-track"
      ref="sliderTrack"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <!-- 背景（棋盘格） -->
      <div class="slider-bg checkerboard-bg"></div>
      
      <!-- 填充层 -->
      <div 
        class="slider-fill"
        :style="fillStyle"
      ></div>
      
      <!-- 滑块 thumb -->
      <div 
        class="slider-thumb"
        :style="thumbStyle"
      >
        <div class="thumb-inner"></div>
      </div>
    </div>

    <!-- 快捷按钮 -->
    <div class="glass-blur-presets">
      <button 
        v-for="preset in blurPresets" 
        :key="preset"
        class="preset-btn"
        :class="{ active: localBlur === preset }"
        @click="setBlur(preset)"
      >
        {{ preset }}px
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 8
  },
  darkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 本地状态
const localBlur = ref(props.modelValue)
const sliderTrack = ref(null)
let isDragging = false

// 预设模糊度
const blurPresets = [0, 5, 10, 15, 20]

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (!isDragging) {
    localBlur.value = Math.max(0, Math.min(20, newVal))
  }
})

// 预览样式 - 使用backdrop-filter展示毛玻璃效果
const previewStyle = computed(() => ({
  backdropFilter: `blur(${localBlur.value}px)`,
  WebkitBackdropFilter: `blur(${localBlur.value}px)`,
  background: 'rgba(255, 140, 0, 0.5)'
}))

// 填充样式
const fillStyle = computed(() => ({
  width: `${(localBlur.value / 20) * 100}%`
}))

// Thumb 样式
const thumbStyle = computed(() => ({
  left: `${(localBlur.value / 20) * 100}%`
}))

// 开始拖拽
const startDrag = (e) => {
  isDragging = true
  handleMove(e)
  
  const handleMoveWrapper = (e) => {
    if (isDragging) {
      handleMove(e)
    }
  }
  
  const handleEnd = () => {
    isDragging = false
    document.removeEventListener('mousemove', handleMoveWrapper)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMoveWrapper)
    document.removeEventListener('touchend', handleEnd)
  }
  
  document.addEventListener('mousemove', handleMoveWrapper)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMoveWrapper)
  document.addEventListener('touchend', handleEnd)
}

// 处理移动
const handleMove = (e) => {
  if (!sliderTrack.value) return
  
  const rect = sliderTrack.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  
  const percentage = Math.max(0, Math.min(20, ((clientX - rect.left) / rect.width) * 20))
  localBlur.value = Math.round(percentage)
  
  emit('update:modelValue', localBlur.value)
}

// 设置模糊度
const setBlur = (value) => {
  localBlur.value = value
  emit('update:modelValue', value)
}
</script>

<style scoped>
.glass-blur-slider-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 预览区域 */
.glass-blur-preview-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.glass-blur-preview-wrapper {
  position: relative;
  width: 420px;
  height: 200px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg, #a8d8ea 0%, #d4a5a5 50%, #f9f9f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 背景装饰圆形 - 模仿图片中的彩色圆形 */
.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(0px);
}

.circle-1 {
  width: 180px;
  height: 180px;
  background: linear-gradient(135deg, #ff9a76 0%, #ff6b6b 100%);
  top: -50px;
  left: -40px;
}

.circle-2 {
  width: 140px;
  height: 140px;
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
  bottom: -40px;
  right: -30px;
}

/* 毛玻璃预览卡片 */
.glass-blur-preview-card {
  position: relative;
  width: 360px;
  height: 140px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: backdrop-filter 0.1s ease;
}

.preview-text {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.glass-blur-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-weight: 600;
  color: #334155;
}

.glass-blur-value .value {
  font-size: 32px;
  line-height: 1;
}

.glass-blur-value .unit {
  font-size: 16px;
  color: #64748b;
}

/* 滑块轨道 */
.slider-track {
  position: relative;
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #e2e8f0;
}

.slider-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.slider-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--theme-color, linear-gradient(135deg, #ff8c00 0%, #ffa726 100%));
  transition: width 0.1s ease;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
}

.thumb-inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border: 3px solid var(--theme-color, #ff8c00);
  box-sizing: border-box;
}

/* 预设按钮 */
.glass-blur-presets {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.preset-btn {
  padding: 6px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.preset-btn.active {
  background: var(--theme-color, linear-gradient(135deg, #ff8c00 0%, #ffa726 100%));
  border-color: var(--theme-color, #ff8c00);
  color: white;
}

.preset-btn:active {
  transform: scale(0.95);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .glass-blur-preview-wrapper {
    width: 64px;
    height: 40px;
  }
  
  .glass-blur-value .value {
    font-size: 28px;
  }
  
  .slider-track {
    height: 20px;
  }
  
  .slider-thumb {
    width: 28px;
    height: 28px;
  }
  
  .preset-btn {
    padding: 5px 12px;
    font-size: 12px;
  }
}

@media (max-width: 360px) {
  .glass-blur-preview-section {
    gap: 12px;
  }
  
  .glass-blur-preview-wrapper {
    width: 56px;
    height: 36px;
  }
  
  .glass-blur-value .value {
    font-size: 24px;
  }
  
  .preset-btn {
    padding: 4px 10px;
    font-size: 11px;
  }
}

/* 暗夜模式样式 */
.dark-mode .glass-blur-preview-wrapper {
  border-color: #475569;
}

/* 暗夜模式样式 */
.dark-mode .glass-blur-preview-wrapper {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 50%, #1a1a2e 100%);
}

.dark-mode .circle-1 {
  background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
}

.dark-mode .circle-2 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.dark-mode .glass-blur-preview-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dark-mode .preview-text {
  color: rgba(255, 255, 255, 0.8);
}

.dark-mode .glass-blur-value {
  color: #f1f5f9;
}

.dark-mode .glass-blur-value .unit {
  color: #94a3b8;
}

.dark-mode .slider-track {
  border-color: #475569;
}

.dark-mode .thumb-inner {
  background: #334155;
  border-color: var(--theme-color, #ff8c00);
}

.dark-mode .preset-btn {
  background: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.dark-mode .preset-btn:hover {
  background: #3d4f66;
  border-color: #54667a;
  color: #f1f5f9;
}
</style>
