<template>
  <div class="opacity-slider-container" :class="{ 'dark-mode': darkMode }">
    <!-- 透明度预览 -->
    <div class="opacity-preview-section">
      <div class="opacity-preview-wrapper">
        <div class="checkerboard-bg"></div>
        <div 
          class="opacity-preview" 
          :style="previewStyle"
        ></div>
      </div>
      <div class="opacity-value">
        <span class="value">{{ localOpacity }}</span>
        <span class="unit">%</span>
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
    <div class="opacity-presets">
      <button 
        v-for="preset in opacityPresets" 
        :key="preset"
        class="preset-btn"
        :class="{ active: localOpacity === preset }"
        @click="setOpacity(preset)"
      >
        {{ preset }}%
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 100
  },
  darkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 本地状态
const localOpacity = ref(props.modelValue)
const sliderTrack = ref(null)
let isDragging = false

// 预设透明度
const opacityPresets = [30, 50, 75, 100]

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (!isDragging) {
    localOpacity.value = Math.max(30, Math.min(100, newVal))
  }
})

// 预览样式
const previewStyle = computed(() => ({
  opacity: localOpacity.value / 100
}))

// 填充样式
const fillStyle = computed(() => ({
  width: `${localOpacity.value}%`,
  opacity: localOpacity.value / 100
}))

// Thumb 样式
const thumbStyle = computed(() => ({
  left: `${localOpacity.value}%`
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
  
  const percentage = Math.max(30, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  localOpacity.value = Math.round(percentage)
  
  emit('update:modelValue', localOpacity.value)
}

// 设置透明度
const setOpacity = (value) => {
  localOpacity.value = value
  emit('update:modelValue', value)
}
</script>

<style scoped>
.opacity-slider-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 预览区域 */
.opacity-preview-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.opacity-preview-wrapper {
  position: relative;
  width: 80px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

.checkerboard-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  background-color: white;
}

.opacity-preview {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-color, linear-gradient(135deg, #ff8c00 0%, #ffa726 100%));
  transition: opacity 0.1s ease;
}

.opacity-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-weight: 600;
  color: #334155;
}

.opacity-value .value {
  font-size: 32px;
  line-height: 1;
}

.opacity-value .unit {
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
  transition: width 0.1s ease, opacity 0.1s ease;
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
.opacity-presets {
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
  .opacity-preview-wrapper {
    width: 64px;
    height: 40px;
  }
  
  .opacity-value .value {
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
  .opacity-preview-section {
    gap: 12px;
  }
  
  .opacity-preview-wrapper {
    width: 56px;
    height: 36px;
  }
  
  .opacity-value .value {
    font-size: 24px;
  }
  
  .preset-btn {
    padding: 4px 10px;
    font-size: 11px;
  }
}

/* 暗夜模式样式 */
.dark-mode .opacity-preview-wrapper {
  border-color: #475569;
}

.dark-mode .checkerboard-bg {
  background-image: 
    linear-gradient(45deg, #334155 25%, transparent 25%),
    linear-gradient(-45deg, #334155 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #334155 75%),
    linear-gradient(-45deg, transparent 75%, #334155 75%);
  background-color: #1e293b;
}

.dark-mode .opacity-value {
  color: #f1f5f9;
}

.dark-mode .opacity-value .unit {
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
