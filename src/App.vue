<template>
  <div class="app-container" :class="{ 'focus-mode-active': focusMode, [darkModeClass]: true }" :style="appStyle">
    <!-- 主界面内容 -->
    <template v-if="!focusMode">
      <TitleBar 
        :pending-count="pendingTasks" 
        :dark-mode="appSettings.darkMode"
        @open-settings="showSettings = true"
      />
      <EdgeDetector />
      <ResizeHandle />
      <SettingsPanel 
        v-model:visible="showSettings"
        :dark-mode="appSettings.darkMode"
        @settings-change="applySettings"
        ref="settingsPanel"
      />
      <div class="content-wrapper">
      <div class="todo-container">
        <div class="input-section">
          <div class="input-wrapper">
            <input
              v-model="newTask"
              @keyup.enter="addTask"
              :placeholder="t('app.addTaskPlaceholder')"
              class="task-input"
            >
            <VoiceInput @result="handleVoiceResult" @error="handleVoiceError" @autoAdd="handleAutoAddTask" />
            <button
              @click="addTask"
              class="add-btn"
              :title="t('app.addTaskTitle')"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <transition name="fade">
            <p v-if="showEmptyError" class="error-message">{{ t('app.emptyError') }}</p>
          </transition>
        </div>

        <div class="stats-card">
          <div class="stats-header">
            <svg class="stats-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="stats-title">{{ t('app.taskStats') }}</span>
          </div>
          <div class="stats-content">
            <div class="progress-section">
              <div class="progress-info-row">
                <span class="progress-detail">{{ t('app.progressDetail', { completed: completedTasks, total: totalTasks }) }}</span>
                <span class="progress-text">{{ progressPercentage }}{{ t('app.completePercent') }}</span>
              </div>
              <div class="segmented-progress" ref="progressContainerRef">
                <div v-for="(row, rowIndex) in progressRows" :key="rowIndex" class="progress-row">
                  <div
                    v-for="(seg, segIndex) in row.segments"
                    :key="segIndex"
                    class="progress-segment"
                    :class="{ filled: seg.filled, ghost: seg.ghost }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value total">{{ totalTasks }}</div>
                <div class="stat-label">{{ t('app.total') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-value completed">{{ completedTasks }}</div>
                <div class="stat-label">{{ t('app.completed') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-value pending">{{ pendingTasks }}</div>
                <div class="stat-label">{{ t('app.pending') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-header-actions" v-if="tasks.length > 0">
          <button
            @click="focusMode = true"
            class="focus-mode-btn"
            :title="t('app.focusModeTitle')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>{{ t('app.focusModeBtn') }}</span>
          </button>
          <button
            @click="clearAllTasks"
            class="clear-all-btn"
            :title="t('app.clearAllTitle')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="filter-section">
          <button
            v-for="filterOption in filterOptions"
            :key="filterOption.value"
            @click="filter = filterOption.value"
            :class="['filter-btn', { active: filter === filterOption.value }]"
          >
            <span class="filter-icon" v-html="filterOption.icon"></span>
            {{ filterOption.label }}
          </button>
        </div>

        <div class="tasks-section">
          <transition-group
            :name="filterTransitionName"
            :move-class="currentMoveClass"
            tag="div"
            class="tasks-list"
          >
            <TodoItem
              v-for="task in filteredTasks"
              :key="task.id"
              :task="task"
              @toggle="toggleTask"
              @delete="deleteTask"
              @update="updateTask"
              draggable="true"
              @dragstart="handleDragStart($event, task)"
              @dragover.prevent="handleDragOver($event, task)"
              @drop="handleDrop($event, task)"
              @dragend="handleDragEnd"
            />
          </transition-group>

          <div v-if="tasks.length === 0" class="empty-state" @click="showQuickInput = true">
            <div v-if="!showQuickInput" class="empty-content">
              <div class="empty-icon">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="35" fill="currentColor" fill-opacity="0.1"/>
                  <path d="M25 40h30M40 25v30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
              </div>
              <h3 class="empty-title">{{ t('app.noTasks') }}</h3>
              <p class="empty-description">{{ t('app.noTasksDesc') }}</p>
            </div>
            <div v-else class="quick-input-wrapper empty-input-wrapper" @click.stop>
              <input
                v-model="quickTaskInput"
                @keyup.enter="addQuickTask"
                @keyup.esc="showQuickInput = false; quickTaskInput = ''"
                :placeholder="t('app.inputTaskPlaceholder')"
                class="quick-task-input"
                ref="quickInputRef"
                autofocus
              >
              <button @click="addQuickTask" class="quick-add-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-else class="add-task-area" @click="showQuickInput = true">
            <div v-if="!showQuickInput" class="add-task-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div v-else class="quick-input-wrapper task-input-wrapper" @click.stop>
              <input
                v-model="quickTaskInput"
                @keyup.enter="addQuickTask"
                @keyup.esc="showQuickInput = false; quickTaskInput = ''"
                :placeholder="t('app.inputTaskPlaceholder')"
                class="quick-task-input"
                ref="quickInputRef"
                autofocus
              >
              <button @click="addQuickTask" class="quick-add-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      <ConfirmDialog
        :show="confirmDialog.show"
        :message="confirmDialog.message"
        :darkMode="appSettings.darkMode"
        @confirm="confirmDialog.onConfirm"
        @cancel="confirmDialog.show = false"
      />
    </template>

    <!-- 专注模式 -->
    <FocusMode
      v-if="focusMode"
      :tasks="tasks"
      :task-color="appSettings.themeColor"
      :dark-mode="appSettings.darkMode"
      :glass-blur="appSettings.glassBlur"
      :opacity="appSettings.opacity"
      :theme-color-mode="appSettings.themeColorMode"
      :primary-color="appSettings.primaryColor"
      :secondary-color="appSettings.secondaryColor"
      @exit="focusMode = false"
      @update-tasks="updateTasksFromFocus"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import TitleBar from './components/TitleBar.vue'
import EdgeDetector from './components/EdgeDetector.vue'
import ResizeHandle from './components/ResizeHandle.vue'
import TodoItem from './components/TodoItem.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import FocusMode from './components/FocusMode.vue'
import VoiceInput from './components/VoiceInput.vue'
import { createI18n } from './i18n/index.js'

const { t, locale } = createI18n()
locale.value = 'zh'

const newTask = ref('')
const tasks = ref([])
const filter = ref('all')
const showEmptyError = ref(false)
const showQuickInput = ref(false)
const quickTaskInput = ref('')
const showSettings = ref(false)
const settingsPanel = ref(null)
const focusMode = ref(false)

const addingTask = ref(false)
const deletingTask = ref(false)
const filteringTask = ref(false)
const previousFilter = ref('all')

const confirmDialog = ref({
  show: false,
  message: '',
  onConfirm: null
})

// 配色方案配置
const colorSchemes = [
  { id: 'deskatom', name: 'DeskAtom', colors: ['#ffb347', '#ff8c00'] },
  { id: 'sky', name: '天空蓝', colors: ['#a1c4fd', '#c2e9fb'] },
  { id: 'purple', name: '紫粉', colors: ['#9b5de5', '#f15bb5'] },
  { id: 'coral', name: '珊瑚橙', colors: ['#ff7e5f', '#feb47b'] },
  { id: 'mint', name: '薄荷绿', colors: ['#00b09b', '#96c93d'] },
  { id: 'ocean', name: '海洋蓝', colors: ['#0f4c75', '#3282b8'] },
  { id: 'indigo', name: '靛蓝紫', colors: ['#4361ee', '#3a0ca3'] },
  { id: 'cyber', name: '赛博', colors: ['#34ffdc', '#3a0ca3'] }
]

// 应用设置
const appSettings = reactive({
  themeColor: { r: 255, g: 179, b: 71 },
  themeColorMode: 'dual',
  primaryColor: { r: 255, g: 179, b: 71 },
  secondaryColor: { r: 255, g: 140, b: 0 },
  opacity: 100,
  darkMode: false,
  glassBlur: 8,
  colorScheme: 'deskatom'
})

// 获取当前配色方案的渐变
const currentColorScheme = computed(() => {
  return colorSchemes.find(s => s.id === appSettings.colorScheme) || colorSchemes[0]
})

// 应用样式
const appStyle = computed(() => {
  const opacityHex = Math.round(appSettings.opacity * 2.55).toString(16).padStart(2, '0')
  const glassOpacity = 0.7 // 毛玻璃透明度提高到 70%
  
  let glassGradient
  let themeGradient
  
  // 使用主色计算亮度，决定文字颜色
  const p = appSettings.primaryColor
  const yiq = ((p.r * 299) + (p.g * 587) + (p.b * 114)) / 1000
  const isLightTheme = yiq >= 230 // 接近白色时为亮色主题（阈值越高越严格）
  // 本来是白色的元素，白色主题时变为深灰色
  const textOnWhite = isLightTheme ? '#1f2937' : '#ffffff'
  // 本来是主题色的元素，白色主题时变为深灰色，暗夜模式直接使用主题色
  const textOnColor = (isLightTheme && !appSettings.darkMode) ? '#1f2937' : `rgb(${p.r}, ${p.g}, ${p.b})`
  // 暗夜模式下主题色上的文字：主题色偏白时使用灰色，否则使用白色
  const textOnThemeDark = (isLightTheme && appSettings.darkMode) ? '#94a3b8' : '#ffffff'
  
  if (appSettings.themeColorMode === 'dual') {
    // 双色模式：使用主色和辅色
    const s = appSettings.secondaryColor
    glassGradient = `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, ${glassOpacity}), rgba(${s.r}, ${s.g}, ${s.b}, ${glassOpacity}))`
    themeGradient = `linear-gradient(135deg, rgb(${p.r}, ${p.g}, ${p.b}), rgb(${s.r}, ${s.g}, ${s.b}))`
  } else {
    // 单色模式：使用主题色创建渐变
    const darkerR = Math.max(0, Math.floor(p.r * 0.88))
    const darkerG = Math.max(0, Math.floor(p.g * 0.88))
    const darkerB = Math.max(0, Math.floor(p.b * 0.88))
    glassGradient = `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, ${glassOpacity}), rgba(${darkerR}, ${darkerG}, ${darkerB}, ${glassOpacity}))`
    themeGradient = `linear-gradient(135deg, rgb(${p.r}, ${p.g}, ${p.b}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`
  }
  
  return {
    '--theme-color': `rgb(${appSettings.themeColor.r}, ${appSettings.themeColor.g}, ${appSettings.themeColor.b})`,
    '--theme-gradient': themeGradient,
    '--theme-color-light': `rgba(${appSettings.themeColor.r}, ${appSettings.themeColor.g}, ${appSettings.themeColor.b}, 0.1)`,
    '--theme-color-medium': `rgba(${appSettings.themeColor.r}, ${appSettings.themeColor.g}, ${appSettings.themeColor.b}, 0.2)`,
    '--primary-color': `rgb(${p.r}, ${p.g}, ${p.b})`,
    '--primary-rgb': `${p.r}, ${p.g}, ${p.b}`,
    '--secondary-color': appSettings.themeColorMode === 'dual' ? `rgb(${appSettings.secondaryColor.r}, ${appSettings.secondaryColor.g}, ${appSettings.secondaryColor.b})` : `rgb(${p.r}, ${p.g}, ${p.b})`,
    '--secondary-rgb': appSettings.themeColorMode === 'dual' ? `${appSettings.secondaryColor.r}, ${appSettings.secondaryColor.g}, ${appSettings.secondaryColor.b}` : `${p.r}, ${p.g}, ${p.b}`,
    '--window-opacity': appSettings.opacity / 100,
    '--glass-blur': `${appSettings.glassBlur}px`,
    '--glass-gradient': glassGradient,
    '--text-on-white': textOnWhite,
    '--text-on-color': textOnColor,
    '--text-on-theme-dark': textOnThemeDark
  }
})

// 暗夜模式类名
const darkModeClass = computed(() => appSettings.darkMode ? 'dark-mode' : '')

// 应用设置
const applySettings = (settings) => {
  appSettings.themeColor = { ...settings.themeColor }
  appSettings.themeColorMode = settings.themeColorMode || 'dual'
  appSettings.primaryColor = settings.primaryColor && settings.primaryColor.r !== undefined ? { ...settings.primaryColor } : { r: 255, g: 179, b: 71 }
  appSettings.secondaryColor = settings.secondaryColor && settings.secondaryColor.r !== undefined ? { ...settings.secondaryColor } : { r: 255, g: 140, b: 0 }
  appSettings.opacity = settings.opacity
  appSettings.darkMode = settings.darkMode || false
  appSettings.glassBlur = settings.glassBlur !== undefined ? settings.glassBlur : 8
  appSettings.colorScheme = settings.colorScheme || 'deskatom'

  // 应用透明度到 Electron 窗口
  if (window.electronAPI && window.electronAPI.setOpacity) {
    // 将 0-100 转换为 0-1
    const opacityValue = settings.opacity / 100
    console.log('设置窗口透明度:', opacityValue)
    window.electronAPI.setOpacity(opacityValue)
  }
}

const filterOptions = computed(() => [
  { value: 'all', label: t('app.filterAll'), icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/></svg>' },
  { value: 'pending', label: t('app.filterPending'), icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/></svg>' },
  { value: 'completed', label: t('app.filterCompleted'), icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }
])

const totalTasks = computed(() => tasks.value.length)
const completedTasks = computed(() => tasks.value.filter(task => task.completed).length)
const pendingTasks = computed(() => totalTasks.value - completedTasks.value)
const progressPercentage = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

const MIN_SEGMENT_WIDTH = 50
const progressContainerWidth = ref(400)
const progressContainerRef = ref(null)

const dynamicMaxSegments = computed(() => {
  const availableWidth = progressContainerWidth.value - 40
  return Math.max(5, Math.floor(availableWidth / MIN_SEGMENT_WIDTH))
})

const progressRows = computed(() => {
  const total = totalTasks.value
  const completed = completedTasks.value
  if (total === 0) return []

  const maxPerRow = dynamicMaxSegments.value
  const needsWrap = total > maxPerRow

  if (!needsWrap) {
    return [{
      segments: Array.from({ length: total }, (_, s) => ({
        filled: s < completed,
        ghost: false
      }))
    }]
  }

  const numRows = Math.ceil(total / maxPerRow)
  const basePerRow = Math.floor(total / numRows)
  const extraRows = total % numRows

  const rows = []
  let remainingCompleted = completed

  for (let r = 0; r < numRows; r++) {
    const segCount = basePerRow + (r >= numRows - extraRows ? 1 : 0)
    const rowCompleted = Math.min(segCount, remainingCompleted)
    remainingCompleted -= rowCompleted

    const segments = Array.from({ length: segCount }, (_, s) => ({
      filled: s < rowCompleted,
      ghost: false
    }))
    rows.push({ segments })
  }

  return rows
})

const filteredTasks = computed(() => {
  switch (filter.value) {
    case 'pending':
      return tasks.value.filter(task => !task.completed)
    case 'completed':
      return tasks.value.filter(task => task.completed)
    default:
      return tasks.value
  }
})

const currentMoveClass = computed(() => {
  if (addingTask.value) return 'task-item-move-add'
  if (deletingTask.value) return 'task-item-move-remove'
  if (filteringTask.value) return 'task-item-move-filter'
  return ''
})

const addTask = () => {
  if (newTask.value.trim() === '') {
    showEmptyError.value = true
    setTimeout(() => {
      showEmptyError.value = false
    }, 2000)
    return
  }

  addingTask.value = true
  tasks.value.unshift({
    id: Date.now(),
    text: newTask.value.trim(),
    completed: false
  })

  saveTasksToStorage()
  newTask.value = ''
  
  setTimeout(() => {
    addingTask.value = false
  }, 500)
}

const handleVoiceResult = (text, isFinal = true) => {
  newTask.value = text
}

const handleVoiceError = (message) => {
  console.error('语音识别错误:', message)
}

const handleAutoAddTask = (text) => {
  if (!text || text.trim() === '') return

  addingTask.value = true
  tasks.value.unshift({
    id: Date.now(),
    text: text.trim(),
    completed: false
  })

  saveTasksToStorage()
  newTask.value = ''

  setTimeout(() => {
    addingTask.value = false
  }, 500)
}

const addQuickTask = () => {
  if (quickTaskInput.value.trim() === '') {
    return
  }

  addingTask.value = true
  tasks.value.unshift({
    id: Date.now(),
    text: quickTaskInput.value.trim(),
    completed: false
  })

  saveTasksToStorage()
  quickTaskInput.value = ''
  showQuickInput.value = false
  
  setTimeout(() => {
    addingTask.value = false
  }, 500)
}

const clearAllTasks = () => {
  if (tasks.value.length === 0) return
  
  confirmDialog.value = {
    show: true,
    message: t('app.confirmClearAll', { count: tasks.value.length }),
    onConfirm: () => {
      deletingTask.value = true
      tasks.value = []
      saveTasksToStorage()
      
      setTimeout(() => {
        deletingTask.value = false
      }, 500)
      confirmDialog.value.show = false
    }
  }
}

const toggleTask = (id) => {
  const task = tasks.value.find(task => task.id === id)
  if (task) {
    task.completed = !task.completed
    saveTasksToStorage()
  }
}

const deleteTask = (id) => {
  if (deletingTask.value) return

  confirmDialog.value = {
    show: true,
    message: t('app.confirmDelete'),
    onConfirm: () => {
      confirmDialog.value.show = false
      deletingTask.value = true

      const taskIndex = tasks.value.findIndex(task => task.id === id)
      if (taskIndex !== -1) {
        tasks.value.splice(taskIndex, 1)
      }

      saveTasksToStorage()

      if (tasks.value.length === 0) {
        showQuickInput.value = false
      }

      setTimeout(() => {
        deletingTask.value = false
      }, 800)
    }
  }
}

const updateTask = ({ id, text }) => {
  const task = tasks.value.find(t => t.id === id)
  if (task) {
    task.text = text
    saveTasksToStorage()
  }
}

// 从专注模式更新任务
const updateTasksFromFocus = (updatedTasks) => {
  tasks.value = updatedTasks
}

const draggedTask = ref(null)
const dragOverTask = ref(null)

const handleDragStart = (event, task) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.target.style.opacity = '0.5'
}

const handleDragOver = (event, task) => {
  if (draggedTask.value && draggedTask.value.id !== task.id) {
    dragOverTask.value = task
  }
}

const handleDrop = (event, targetTask) => {
  if (!draggedTask.value || draggedTask.value.id === targetTask.id) return
  
  const draggedIndex = tasks.value.findIndex(t => t.id === draggedTask.value.id)
  const targetIndex = tasks.value.findIndex(t => t.id === targetTask.id)
  
  if (draggedIndex !== -1 && targetIndex !== -1) {
    const [removed] = tasks.value.splice(draggedIndex, 1)
    tasks.value.splice(targetIndex, 0, removed)
    saveTasksToStorage()
  }
  
  draggedTask.value = null
  dragOverTask.value = null
}

const handleDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedTask.value = null
  dragOverTask.value = null
}

const saveTasksToStorage = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks.value))
}

const loadTasksFromStorage = () => {
  const saved = localStorage.getItem('tasks')
  if (saved) {
    try {
      tasks.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载失败:', error)
      tasks.value = []
    }
  }
}

watch(tasks, (newTasks) => {
  const pendingCount = newTasks.filter(t => !t.completed).length
  if (window.electronAPI && window.electronAPI.updateTaskCount) {
    window.electronAPI.updateTaskCount(pendingCount)
  }
}, { deep: true })

watch(filter, (newFilter, oldFilter) => {
  if (newFilter !== oldFilter) {
    filteringTask.value = true
    previousFilter.value = oldFilter || 'all'
    setTimeout(() => {
      filteringTask.value = false
    }, 400)
  }
})

// 根据筛选器切换方向计算动画名称
// 6种切换：全部↔未完成、全部↔已完成、未完成↔已完成
const filterTransitionName = computed(() => {
  if (!filteringTask.value) return 'task-item'
  
  const from = previousFilter.value
  const to = filter.value
  
  // 定义6种切换的动画名称
  if (from === 'all' && to === 'pending') return 'filter-all-to-pending'
  if (from === 'all' && to === 'completed') return 'filter-all-to-completed'
  if (from === 'pending' && to === 'all') return 'filter-pending-to-all'
  if (from === 'pending' && to === 'completed') return 'filter-pending-to-completed'
  if (from === 'completed' && to === 'all') return 'filter-completed-to-all'
  if (from === 'completed' && to === 'pending') return 'filter-completed-to-pending'
  
  return 'task-item'
})

onMounted(() => {
  console.log('应用已初始化')
  console.log('electronAPI 可用:', !!window.electronAPI)
  if (window.electronAPI) {
    console.log('可用的API:', Object.keys(window.electronAPI))
  }
  loadTasksFromStorage()
  
  const saved = localStorage.getItem('app-locale')
  if (saved && (saved === 'zh' || saved === 'en')) {
    locale.value = saved
  }
  
  // 加载设置
  if (settingsPanel.value) {
    settingsPanel.value.loadSettings()
    const saved = localStorage.getItem('app-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        applySettings(parsed)
      } catch (e) {
        console.error('加载设置失败:', e)
      }
    }
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0) {
        progressContainerWidth.value = entry.contentRect.width
      }
    }
  })
  if (progressContainerRef.value) {
    resizeObserver.observe(progressContainerRef.value)
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  --theme-color: rgb(255, 179, 71);
  --theme-color-light: rgba(255, 179, 71, 0.1);
  --theme-color-medium: rgba(255, 179, 71, 0.2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(ellipse 420px 380px at 82% 6%, rgba(var(--primary-rgb, 255, 179, 71), 0.30) 0%, transparent 70%),
    radial-gradient(ellipse 340px 300px at 4% 48%, rgba(var(--secondary-rgb, 255, 140, 0), 0.24) 0%, transparent 68%),
    radial-gradient(ellipse 280px 240px at 70% 86%, rgba(var(--primary-rgb, 255, 179, 71), 0.18) 0%, transparent 65%),
    linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.app-container::before {
  content: '';
  position: absolute;
  top: 18%;
  right: -4%;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--secondary-rgb, 255, 140, 0), 0.20) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  animation: blob-float-1 9s ease-in-out infinite;
}
.app-container::after {
  content: '';
  position: absolute;
  bottom: 22%;
  left: -3%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--primary-rgb, 255, 179, 71), 0.16) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  animation: blob-float-2 11s ease-in-out infinite reverse;
}

@keyframes blob-float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-16px, 14px) scale(1.05); }
  66% { transform: translate(12px, -8px) scale(0.96); }
}
@keyframes blob-float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(14px, -10px) scale(1.04); }
  66% { transform: translate(-12px, 14px) scale(0.97); }
}

/* 毛玻璃卡片样式 */
.glass-card {
  background: var(--glass-gradient, rgba(255, 255, 255, 0.3));
  backdrop-filter: blur(var(--glass-blur, 8px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 8px));
  border-radius: 16px;
  box-shadow: 0 5px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.app-container.focus-mode-active {
  background: transparent;
  box-shadow: none;
}
.app-container.focus-mode-active::before,
.app-container.focus-mode-active::after {
  display: none;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scrollbar-width: thin;
  scrollbar-color: var(--text-on-color, var(--theme-color)) #f1f5f9;
}

.content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.content-wrapper::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.content-wrapper::-webkit-scrollbar-thumb {
  background: var(--theme-color);
  border-radius: 3px;
  border: 1px solid #f1f5f9;
}

.content-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
  filter: brightness(1.1);
}

.todo-container {
  max-width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.input-section {
  margin-bottom: 24px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 8px;
  border-radius: 16px;
  border: 2px solid transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.input-wrapper:focus-within {
  border-color: var(--text-on-color, var(--theme-color));
}

.input-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--theme-color);
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.task-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: clamp(14px, 3.5vw, 16px);
  color: #0f172a;
  background: transparent;
  padding: 0 4px;
  min-width: 0;
}

.task-input::placeholder {
  color: #94a3b8;
  font-size: clamp(13px, 3vw, 15px);
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(32px, 8vw, 40px);
  height: clamp(32px, 8vw, 40px);
  min-width: 32px;
  min-height: 32px;
  background: var(--theme-gradient, var(--theme-color));
  border: none;
  border-radius: clamp(10px, 2vw, 14px);
  color: var(--text-on-white, white);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
  position: relative;
  box-shadow:
    0 3px 0 rgba(var(--primary-rgb, 255, 140, 0), 0.35),
    0 4px 12px rgba(var(--primary-rgb, 255, 140, 0), 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

.add-btn svg {
  width: clamp(16px, 4vw, 20px);
  height: clamp(16px, 4vw, 20px);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
}

.add-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 6px 0 rgba(var(--primary-rgb, 255, 140, 0), 0.30),
    0 8px 24px rgba(var(--primary-rgb, 255, 140, 0), 0.35),
    0 0 20px rgba(var(--primary-rgb, 255, 140, 0), 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

.add-btn:active {
  transform: translateY(2px) scale(0.98);
  box-shadow:
    0 1px 0 rgba(var(--primary-rgb, 255, 140, 0), 0.35),
    0 2px 6px rgba(var(--primary-rgb, 255, 140, 0), 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 2px 4px rgba(0, 0, 0, 0.12);
}

.stats-header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.focus-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.focus-mode-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.focus-mode-btn:active {
  transform: scale(0.95);
}

.clear-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #fee2e2;
  border: none;
  border-radius: 8px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-btn:hover {
  background: #fecaca;
  transform: scale(1.1);
}

.clear-all-btn:active {
  transform: scale(0.95);
  background: #fca5a5;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
  animation: shake 0.5s ease-in-out;
}

.stats-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

/* 毛玻璃效果 */
.stats-card.glass-card,
.filter-section.glass-card,
.input-wrapper.glass-card {
  background: var(--glass-gradient, rgba(255, 255, 255, 0.3));
  backdrop-filter: blur(var(--glass-blur, 8px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 8px));
  border-radius: 16px;
  box-shadow: 0 5px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.4);
  position: relative;
  z-index: 1;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.stats-icon {
  color: #ff8c42;
}

.stats-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.progress-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.progress-detail {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 80px;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}

.segmented-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.progress-row {
  display: flex;
  width: 100%;
  gap: 3px;
}

.progress-segment {
  flex: 1 1 0%;
  min-width: 0;
  height: 8px;
  border-radius: 2px;
  background: #e2e8f0;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-segment.filled {
  background: var(--text-on-color, var(--theme-color));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.progress-segment.ghost {
  opacity: 0.15;
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  flex: 1 1 calc(33.333% - 12px);
  min-width: 80px;
  text-align: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-value.total {
  color: #475569;
}

.stat-value.completed {
  color: #22c55e;
}

.stat-value.pending {
  color: #ef6c00;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  background: white;
  padding: 8px;
  border-radius: 16px;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

@media (max-width: 600px) {
  .stats-card {
    padding: 16px;
    margin-bottom: 16px;
  }

  .stats-header {
    gap: 8px;
    margin-bottom: 12px;
  }

  .stats-icon {
    width: 20px;
    height: 20px;
  }

  .stats-title {
    font-size: 14px;
  }

  .stats-grid {
    gap: 10px;
  }

  .stat-item {
    flex: 1 1 calc(33.333% - 8px);
    min-width: 70px;
    padding: 10px 8px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11px;
  }

  .filter-section {
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
    padding: 6px;
  }

  .filter-icon {
    width: 14px;
    height: 14px;
  }
}

.filter-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.1s ease;
}

@media (max-width: 500px) {
  .filter-btn {
    flex: 1 1 calc(33.333% - 6px);
    min-width: 80px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .filter-section {
    gap: 6px;
    padding: 6px;
  }
}

.filter-btn:hover {
  background: #f8fafc;
  color: var(--text-on-color, var(--theme-color));
}

.filter-btn.active {
  background: var(--theme-color);
  color: var(--text-on-white, white);
  box-shadow: 0 4px 12px var(--theme-color-light);
}

.filter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tasks-section {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  z-index: 1;
}

.tasks-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  margin-bottom: 0;
  cursor: grab;
}

.task-item:active {
  cursor: grabbing;
}

.add-task-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  margin-top: 12px;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 60px;
}

.add-task-area:hover {
  border-color: var(--theme-color);
  background: var(--theme-color-light);
}

.add-task-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-color-light);
  border: 1px solid var(--text-on-color);
  border-radius: 50%;
  color: var(--text-on-color, var(--theme-color));
  transition: all 0.3s ease;
}

.add-task-area:hover .add-task-btn {
  background: var(--theme-color);
  color: var(--text-on-white, white);
  transform: scale(1.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48px 24px;
  text-align: center;
  min-height: 200px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: #cbd5e1;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-description {
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.empty-content:hover {
  transform: scale(1.02);
}

.empty-content:hover .empty-icon {
  color: var(--theme-color);
}

.quick-input-wrapper {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.5vh, 12px);
  background: linear-gradient(135deg, var(--theme-color-light) 0%, #ffffff 100%);
  border: 2px solid var(--theme-color-medium);
  border-radius: clamp(10px, 2vh, 16px);
  padding: clamp(8px, 2vh, 12px) clamp(10px, 2.5vh, 16px);
  box-shadow: 0 4px 20px var(--theme-color-light);
  animation: slideUp 0.3s ease;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: relative;
}

/* 空状态时的输入框 */
.empty-input-wrapper {
  max-width: min(320px, 90%);
  margin: 0 auto;
}

/* 有任务时的输入框 - 比虚线框略小一圈 */
.task-input-wrapper {
  margin: 4px clamp(4px, 1vh, 8px);
  width: calc(100% - clamp(8px, 2vh, 16px));
  max-width: none;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quick-task-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: clamp(14px, 4vw, 16px);
  color: #334155;
  outline: none;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-task-input::placeholder {
  color: #94a3b8;
  font-size: clamp(13px, 3.5vw, 15px);
}

.quick-add-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--theme-color);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px var(--theme-color-light);
  flex-shrink: 0;
}

.quick-add-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px var(--theme-color-medium);
}

.quick-add-btn:active {
  transform: scale(0.95);
}

.quick-add-btn svg {
  width: 16px;
  height: 16px;
}

/* 小屏幕适配 */
@media (max-width: 480px) {
  .task-input {
    font-size: clamp(13px, 3.5vw, 15px);
  }
  
  .task-input::placeholder {
    font-size: clamp(12px, 3vw, 14px);
  }
  
  .add-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 8px;
  }
  
  .add-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .quick-input-wrapper {
    padding: clamp(8px, 2vh, 10px) clamp(10px, 2.5vh, 12px);
    gap: clamp(6px, 1.5vh, 8px);
    border-radius: clamp(10px, 2vh, 12px);
    min-width: auto;
    width: calc(100% - clamp(24px, 6vh, 32px));
    margin: 0 clamp(12px, 3vh, 16px);
  }
  
  .empty-input-wrapper {
    min-width: auto;
    max-width: none;
    width: calc(100% - clamp(24px, 6vh, 32px));
    margin: 0 clamp(12px, 3vh, 16px);
  }
  
  .task-input-wrapper {
    margin: 4px clamp(12px, 3vh, 16px);
    width: calc(100% - clamp(24px, 6vh, 32px));
  }
  
  .empty-state {
    padding: 32px 16px;
  }
  
  .empty-icon {
    width: 60px;
    height: 60px;
  }
  
  .empty-title {
    font-size: clamp(16px, 5vw, 20px);
  }
  
  .empty-description {
    font-size: clamp(12px, 3.5vw, 14px);
  }
  
  .add-task-area {
    padding: 16px;
  }
  
  .add-task-btn {
    width: 48px;
    height: 48px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 360px) {
  .quick-input-wrapper {
    padding: clamp(6px, 1.5vh, 8px) clamp(8px, 2vh, 10px);
    gap: clamp(4px, 1vh, 6px);
    border-radius: clamp(8px, 1.5vh, 10px);
    min-width: auto;
    width: calc(100% - clamp(16px, 4vh, 24px));
    margin: 0 clamp(8px, 2vh, 12px);
  }
  
  .empty-input-wrapper {
    min-width: auto;
    max-width: none;
    width: calc(100% - clamp(16px, 4vh, 24px));
    margin: 0 clamp(8px, 2vh, 12px);
    padding: clamp(10px, 2.5vh, 12px) clamp(12px, 3vh, 14px);
  }
  
  .task-input-wrapper {
    margin: 4px clamp(8px, 2vh, 12px);
    width: calc(100% - clamp(16px, 4vh, 24px));
    padding: clamp(10px, 2.5vh, 12px) clamp(12px, 3vh, 14px);
  }
  
  .task-input {
    font-size: 13px;
  }
  
  .task-input::placeholder {
    font-size: 12px;
  }
  
  .add-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    border-radius: 6px;
  }
  
  .add-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .quick-add-btn {
    border-radius: 6px;
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
  }
  
  .quick-add-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .empty-state {
    padding: 24px 12px;
  }
  
  .empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
  }
  
  .empty-title {
    font-size: 16px;
  }
  
  .empty-description {
    font-size: 12px;
  }
  
  .add-task-area {
    padding: 12px;
  }
  
  .add-task-btn {
    width: 44px;
    height: 44px;
  }
  
  .add-task-btn svg {
    width: 20px;
    height: 20px;
  }
}

/* 大屏幕适配 */
@media (min-width: 1200px) {
  .task-input {
    font-size: 16px;
  }
  
  .task-input::placeholder {
    font-size: 15px;
  }
  
  .add-btn {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }
  
  .add-btn svg {
    width: 22px;
    height: 22px;
  }
  
  .quick-input-wrapper {
    max-width: 400px;
    padding: 14px 20px;
  }
  
  .quick-task-input {
    font-size: 16px;
  }
}

/* 高分辨率屏幕 */
@media (min-width: 1920px) {
  .task-input {
    font-size: 18px;
  }
  
  .task-input::placeholder {
    font-size: 16px;
  }
  
  .add-btn {
    width: 48px;
    height: 48px;
    border-radius: 16px;
  }
  
  .add-btn svg {
    width: 24px;
    height: 24px;
  }
  
  .quick-input-wrapper {
    max-width: 480px;
    padding: 16px 24px;
    border-radius: 20px;
    border-width: 3px;
  }
  
  .quick-task-input {
    font-size: 18px;
  }
  
  .quick-task-input::placeholder {
    font-size: 16px;
  }
}

/* ==================== 暗夜模式样式 ==================== */

/* 暗夜模式 - 基础背景 */
.dark-mode .app-container {
  background:
    radial-gradient(ellipse 420px 380px at 82% 6%, rgba(var(--primary-rgb, 255, 179, 71), 0.20) 0%, transparent 70%),
    radial-gradient(ellipse 340px 300px at 4% 48%, rgba(var(--secondary-rgb, 255, 140, 0), 0.15) 0%, transparent 68%),
    radial-gradient(ellipse 280px 240px at 70% 86%, rgba(var(--primary-rgb, 255, 179, 71), 0.10) 0%, transparent 65%),
    linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}
.dark-mode .app-container::before {
  background: radial-gradient(circle, rgba(var(--secondary-rgb, 255, 140, 0), 0.13) 0%, transparent 70%);
}
.dark-mode .app-container::after {
  background: radial-gradient(circle, rgba(var(--primary-rgb, 255, 179, 71), 0.10) 0%, transparent 70%);
}

/* 暗夜模式 - 滚动条 */
.dark-mode .content-wrapper {
  scrollbar-color: var(--theme-color) #334155;
}

.dark-mode .content-wrapper::-webkit-scrollbar-track {
  background: #334155;
}

.dark-mode .content-wrapper::-webkit-scrollbar-thumb {
  background: var(--theme-color);
  border: 1px solid #334155;
}

/* 暗夜模式 - 内容区域 */
.dark-mode .content-wrapper {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.dark-mode .todo-container {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

/* 暗夜模式 - 输入区域 */
.dark-mode .input-section {
  background: transparent;
}

.dark-mode .input-wrapper {
  background: #334155;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.dark-mode .input-wrapper:focus-within {
  box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.dark-mode .task-input {
  color: #f1f5f9;
}

.dark-mode .task-input::placeholder {
  color: #94a3b8;
}

/* 暗夜模式 - 统计卡片 */
.dark-mode .stats-card {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: rgba(255, 140, 0, 0.2);
}

.dark-mode .stats-title {
  color: #f1f5f9;
}

.dark-mode .stats-icon {
  color: #fbbf24;
}

.dark-mode .progress-text {
  color: #cbd5e1;
}

.dark-mode .progress-detail {
  color: #64748b;
}

.dark-mode .progress-segment {
  background: #334155;
}

.dark-mode .progress-segment.filled {
  background: var(--theme-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.dark-mode .progress-segment.ghost {
  opacity: 0.08;
}

.dark-mode .progress-label {
  color: #94a3b8;
}

.dark-mode .stats-numbers {
  color: #cbd5e1;
}

.dark-mode .stats-numbers .number {
  color: #f1f5f9;
}

/* 暗夜模式 - 统计格子 */
.dark-mode .stat-item {
  background: #334155;
}

.dark-mode .stat-item:hover {
  background: #3d4f66;
}

.dark-mode .stat-label {
  color: #94a3b8;
}

.dark-mode .stat-value.total {
  color: #94a3b8;
}

.dark-mode .stat-value.pending {
  color: #fb923c;
}

/* 暗夜模式 - 筛选器 */
.dark-mode .filter-section {
  background: #334155;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.dark-mode .filter-btn {
  color: #94a3b8;
  background: transparent;
}

.dark-mode .filter-btn:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.dark-mode .filter-btn.active {
  color: var(--text-on-theme-dark, white);
  background: var(--theme-color);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

/* 暗夜模式 - 任务列表 */
.dark-mode .tasks-section {
  background: transparent;
}

.dark-mode .section-title {
  color: #cbd5e1;
}

.dark-mode .section-title .count {
  color: #94a3b8;
}

/* 暗夜模式 - 任务项 */
.dark-mode :deep(.task-item) {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: rgba(255, 140, 0, 0.15);
}

.dark-mode :deep(.task-item:hover) {
  background: linear-gradient(135deg, #3d4f66 0%, #2a3a52 100%);
  border-color: rgba(255, 140, 0, 0.3);
}

.dark-mode :deep(.task-text) {
  color: #f1f5f9;
}

.dark-mode :deep(.task-item.completed .task-text) {
  color: #64748b;
}

/* 暗夜模式 - 编辑输入框 */
.dark-mode :deep(.edit-input) {
  background: #334155;
  color: #f1f5f9;
}

.dark-mode :deep(.edit-input:focus) {
  background: #3d4f66;
}

/* 暗夜模式 - 任务状态按钮 */
.dark-mode :deep(.status-btn.pending) {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.4) 100%);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.5);
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
}

.dark-mode :deep(.status-btn.pending:hover) {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.5) 100%);
  border-color: rgba(245, 158, 11, 0.7);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
}

/* 暗夜模式 - 空状态 */
.dark-mode .empty-state {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: rgba(255, 140, 0, 0.2);
}

.dark-mode .empty-icon {
  color: #64748b;
}

.dark-mode .empty-title {
  color: #f1f5f9;
}

.dark-mode .empty-description {
  color: #94a3b8;
}

/* 暗夜模式 - 添加任务区域 */
.dark-mode .add-task-area {
  background: #334155;
  border-color: transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.dark-mode .add-task-btn {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  color: #fbbf24;
}

.dark-mode .add-task-btn:hover {
  background: linear-gradient(135deg, #54667a 0%, #3d4f66 100%);
}

/* 暗夜模式 - 快速输入 */
.dark-mode .quick-input-wrapper {
  background: #334155;
  border-color: transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.dark-mode .quick-task-input {
  color: #f1f5f9;
}

.dark-mode .quick-task-input::placeholder {
  color: #94a3b8;
}

.dark-mode .quick-add-btn {
  background: rgba(255, 140, 0, 0.9);
}

.dark-mode .add-btn {
  box-shadow:
    0 3px 0 rgba(var(--primary-rgb, 255, 140, 0), 0.45),
    0 4px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15);
}
.dark-mode .add-btn:hover {
  box-shadow:
    0 6px 0 rgba(var(--primary-rgb, 255, 140, 0), 0.40),
    0 8px 24px rgba(0, 0, 0, 0.45),
    0 0 20px rgba(var(--primary-rgb, 255, 140, 0), 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12);
}
.dark-mode .add-btn:active {
  box-shadow:
    0 1px 0 rgba(var(--primary-rgb, 255, 140, 0), 0.45),
    0 2px 6px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 2px 4px rgba(0, 0, 0, 0.18);
}

/* 暗夜模式 - 语音按钮 */
.dark-mode :deep(.voice-btn) {
  color: var(--theme-color, #fbbf24);
}

.dark-mode :deep(.voice-btn:hover:not(.disabled)) {
  background: var(--theme-color-light, rgba(251, 191, 36, 0.1));
}

.dark-mode :deep(.voice-btn.recording) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

/* 暗夜模式 - 错误信息 */
.dark-mode .error-message {
  color: #f87171;
}

/* 暗夜模式 - 专注模式按钮 */
.dark-mode .focus-mode-btn {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.dark-mode .focus-mode-btn:hover {
  background: linear-gradient(135deg, #3d4f66 0%, #2a3a52 100%);
  border-color: rgba(251, 191, 36, 0.5);
}

/* 暗夜模式 - 清除按钮 */
.dark-mode .clear-all-btn {
  background: #334155;
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.dark-mode .clear-all-btn:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.5);
}

@media (max-width: 600px) {
  .dark-mode .stats-card {
    padding: 16px;
    margin-bottom: 16px;
  }

  .dark-mode .stats-grid {
    gap: 10px;
  }

  .dark-mode .stat-item {
    flex: 1 1 calc(33.333% - 8px);
    min-width: 70px;
    padding: 10px 8px;
  }

  .dark-mode .stat-value {
    font-size: 20px;
  }

  .dark-mode .filter-section {
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
    padding: 6px;
  }

  .dark-mode .filter-icon {
    width: 14px;
    height: 14px;
  }
}

@media (max-width: 500px) {
  .dark-mode .filter-btn {
    flex: 1 1 calc(33.333% - 6px);
    min-width: 80px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .dark-mode .filter-section {
    gap: 6px;
    padding: 6px;
  }
}
</style>
