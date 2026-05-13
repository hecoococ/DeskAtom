<template>
  <div class="focus-mode" :style="focusModeStyle">
    <!-- 任务列表 -->
    <div 
      ref="tasksContainer"
      class="focus-tasks-container"
      @scroll="handleScroll"
    >
      <div 
        v-for="task in pendingTasks" 
        :key="task.id"
        class="focus-task-item"
        :style="taskItemStyle"
      >
        <div class="task-content">
          <button
            @click="toggleTask(task.id)"
            class="status-dot"
            title="标记完成"
          >
            <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="task-text">{{ task.text }}</span>
        </div>
        <button
          @click="deleteTask(task.id)"
          class="delete-btn"
          title="删除任务"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <!-- 空状态 -->
      <div v-if="pendingTasks.length === 0" class="focus-empty">
        <div class="focus-empty-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="focus-empty-icon">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>太棒了！所有任务都已完成</span>
        </div>
      </div>
    </div>

    <!-- 滚动条退出按钮 -->
    <div 
      class="scrollbar-exit"
      :style="scrollbarExitStyle"
      @click="$emit('exit')"
      title="返回主界面"
    >
      <svg class="exit-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed, toRefs, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  taskColor: {
    type: Object,
    default: () => ({ r: 255, g: 255, b: 255 })
  },
  darkMode: {
    type: Boolean,
    default: false
  },
  glassBlur: {
    type: Number,
    default: 8
  },
  opacity: {
    type: Number,
    default: 100
  },
  themeColorMode: {
    type: String,
    default: 'single'
  },
  primaryColor: {
    type: Object,
    default: () => ({ r: 255, g: 140, b: 0 })
  },
  secondaryColor: {
    type: Object,
    default: () => ({ r: 255, g: 255, b: 255 })
  }
})

const { darkMode, taskColor, glassBlur, opacity, themeColorMode, primaryColor, secondaryColor } = toRefs(props)

const emit = defineEmits(['exit', 'update-tasks'])

// 滚动条相关
const tasksContainer = ref(null)
const scrollProgress = ref(0)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 600)

// 处理滚动
const handleScroll = () => {
  if (tasksContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = tasksContainer.value
    const maxScroll = scrollHeight - clientHeight
    scrollProgress.value = maxScroll > 0 ? scrollTop / maxScroll : 0
  }
}

// 处理窗口大小变化
const handleResize = () => {
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 暗夜模式灰蓝色
const DARK_MODE_COLORS = {
  r: 51,
  g: 65,
  b: 85
}

// 根据背景色亮度计算对比色（黑或白）
const getContrastColor = (r, g, b) => {
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return yiq >= 128 ? '#1f2937' : '#ffffff'
}

// 创建渐变色
const createGradient = (r, g, b) => {
  const darkerR = Math.max(0, Math.floor(r * 0.7))
  const darkerG = Math.max(0, Math.floor(g * 0.7))
  const darkerB = Math.max(0, Math.floor(b * 0.7))
  return `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${darkerR}, ${darkerG}, ${darkerB}) 100%)`
}

// 计算专注模式容器样式
const focusModeStyle = computed(() => {
  const isDualMode = themeColorMode.value === 'dual'
  const p = primaryColor.value
  const s = secondaryColor.value
  const opacityHex = 'cc' // 80% 透明度
  
  let gradient, textColor
  if (isDualMode) {
    gradient = `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, 0.8), rgba(${s.r}, ${s.g}, ${s.b}, 0.8))`
    const yiq = ((p.r * 299) + (p.g * 587) + (p.b * 114)) / 1000
    textColor = yiq >= 128 ? '#1f2937' : '#ffffff'
  } else {
    const darkerR = Math.max(0, Math.floor(p.r * 0.7))
    const darkerG = Math.max(0, Math.floor(p.g * 0.7))
    const darkerB = Math.max(0, Math.floor(p.b * 0.7))
    gradient = `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, 0.8), rgba(${darkerR}, ${darkerG}, ${darkerB}, 0.8))`
    const yiq = ((p.r * 299) + (p.g * 587) + (p.b * 114)) / 1000
    textColor = yiq >= 128 ? '#1f2937' : '#ffffff'
  }
  
  return {
    '--glass-blur': `${glassBlur.value}px`,
    '--glass-gradient': gradient,
    '--glass-text': textColor
  }
})

// 计算任务项样式
const taskItemStyle = computed(() => {
  const isDualMode = themeColorMode.value === 'dual'
  const opacityValue = opacity.value / 100
  
  let gradient, textColor, deleteBtnColor
  
  // 检测颜色是否接近红色或橙色（色相在 0-60 或 330-360 范围内）
  const isReddishColor = (r, g, b) => {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    
    if (delta === 0) return false // 灰色系
    
    let hue
    if (max === r) {
      hue = ((g - b) / delta) % 6
    } else if (max === g) {
      hue = (b - r) / delta + 2
    } else {
      hue = (r - g) / delta + 4
    }
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
    
    // 红色和橙色色相范围：0-60 或 330-360
    return hue <= 60 || hue >= 330
  }
  
  // 暗夜模式：任务项填充灰蓝色，字体变主题色
  if (darkMode.value) {
    const p = primaryColor.value
    // 灰蓝色背景
    gradient = `linear-gradient(135deg, rgba(51, 65, 85, ${opacityValue}), rgba(30, 41, 59, ${opacityValue}))`
    // 字体颜色为主题色
    textColor = `rgb(${p.r}, ${p.g}, ${p.b})`
    // 删除按钮用主题色
    deleteBtnColor = `rgba(${p.r}, ${p.g}, ${p.b}, 0.85)`
  } else if (isDualMode) {
    // 双色模式：使用主色和辅色
    const p = primaryColor.value
    const s = secondaryColor.value
    gradient = `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, ${opacityValue}), rgba(${s.r}, ${s.g}, ${s.b}, ${opacityValue}))`
    // 根据主色亮度决定文字颜色
    const yiq = ((p.r * 299) + (p.g * 587) + (p.b * 114)) / 1000
    textColor = yiq >= 128 ? '#1f2937' : '#ffffff'
    // 如果主色接近红色，删除按钮用白色，否则用红色
    deleteBtnColor = isReddishColor(p.r, p.g, p.b) ? 'rgba(255, 255, 255, 0.85)' : '#ef4444'
  } else {
    // 单色模式：使用主题色创建渐变
    const p = primaryColor.value
    const darkerR = Math.max(0, Math.floor(p.r * 0.7))
    const darkerG = Math.max(0, Math.floor(p.g * 0.7))
    const darkerB = Math.max(0, Math.floor(p.b * 0.7))
    gradient = `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, ${opacityValue}), rgba(${darkerR}, ${darkerG}, ${darkerB}, ${opacityValue}))`
    const yiq = ((p.r * 299) + (p.g * 587) + (p.b * 114)) / 1000
    textColor = yiq >= 128 ? '#1f2937' : '#ffffff'
    // 如果主题色接近红色，删除按钮用白色，否则用红色
    deleteBtnColor = isReddishColor(p.r, p.g, p.b) ? 'rgba(255, 255, 255, 0.85)' : '#ef4444'
  }
  
  return {
    background: gradient,
    color: textColor,
    '--task-text-color': textColor,
    '--delete-btn-color': deleteBtnColor
  }
})

// 计算滚动条退出按钮样式
const scrollbarExitStyle = computed(() => {
  const opacityValue = opacity.value / 100
  
  // 计算滚动条位置
  // 滚动条高度为120px，移动范围是视口高度减去滚动条高度
  const scrollbarHeight = 120
  const maxOffset = viewportHeight.value - scrollbarHeight - 40 // 上下留20px边距
  const topOffset = 20 + scrollProgress.value * maxOffset
  
  return {
    background: `rgba(128, 128, 128, ${opacityValue * 0.5})`,
    top: `${topOffset}px`,
    transform: 'translateY(0)'
  }
})

// 只显示未完成的任务
const pendingTasks = computed(() => {
  return props.tasks.filter(task => !task.completed)
})

// 切换任务状态
const toggleTask = (id) => {
  const updatedTasks = props.tasks.map(task => 
    task.id === id ? { ...task, completed: !task.completed } : task
  )
  emit('update-tasks', updatedTasks)
  saveTasksToStorage(updatedTasks)
}

// 删除任务
const deleteTask = (id) => {
  const updatedTasks = props.tasks.filter(task => task.id !== id)
  emit('update-tasks', updatedTasks)
  saveTasksToStorage(updatedTasks)
}

// 保存到本地存储
const saveTasksToStorage = (tasks) => {
  if (window.electronAPI && window.electronAPI.saveTasks) {
    window.electronAPI.saveTasks(JSON.stringify(tasks))
  } else {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }
}
</script>

<style scoped>
.focus-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding: 30px 40px 60px 40px;
  overflow: hidden;
}

.focus-tasks-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.focus-tasks-container::-webkit-scrollbar {
  width: 0;
  display: none;
}

.focus-tasks-container {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 专注模式任务项 - 毛玻璃效果 */
.focus-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  transition: all 0.3s ease;
  backdrop-filter: blur(var(--glass-blur, 8px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 8px));
}

.focus-task-item:hover {
  transform: translateY(-1px);
}

.task-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

/* 简化的状态点 - 打钩图标 */
.status-dot {
  width: 26px;
  height: 26px;
  border: 2px solid #22c55e;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.status-dot:hover {
  background: rgba(34, 197, 94, 0.15);
  transform: scale(1.1);
}

.status-dot:active {
  transform: scale(0.95);
}

.status-dot .check-icon {
  color: #22c55e;
  opacity: 1;
  transition: all 0.2s ease;
}

.status-dot:hover .check-icon {
  transform: scale(1.1);
}

/* 响应式字体 - 根据字数自适应 */
.task-text {
  font-size: clamp(17px, 2.5vw, 22px);
  color: var(--task-text-color, #1f2937);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--delete-btn-color, #ef4444);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 1;
}

.focus-task-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: color-mix(in srgb, var(--delete-btn-color, #ef4444) 15%, transparent);
  transform: scale(1.1);
}

.delete-btn:active {
  transform: scale(0.95);
  background: color-mix(in srgb, var(--delete-btn-color, #ef4444) 25%, transparent);
}

/* 空状态 */
.focus-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.focus-empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 60px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.focus-empty-icon {
  color: #10b981;
}

.focus-empty span {
  font-size: 16px;
  color: #374151;
  font-weight: 500;
}

/* 滚动条退出按钮 - 页面右侧 */
.scrollbar-exit {
  position: fixed;
  right: 0;
  width: 8px;
  height: 120px;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.3s ease,
              top 0.1s ease-out;
  z-index: 100;
}

.scrollbar-exit:hover {
  width: 36px;
  border-radius: 8px 0 0 8px;
}

.scrollbar-exit:hover .exit-arrow {
  opacity: 1;
  transform: translateX(0);
}

.exit-arrow {
  opacity: 0;
  color: white;
  transform: translateX(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
