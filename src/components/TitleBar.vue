<template>
  <div class="title-bar" :class="{ 'dark-mode': darkMode }">
    <div class="title-section">
      <div class="logo-container">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fill-opacity="0.2"/>
          <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="title-wrapper">
        <span class="title-text">DeskAtom</span>
        <div class="badge" v-if="pendingCount > 0">
          {{ pendingCount }}
        </div>
      </div>
    </div>
    <div class="window-controls">
      <button 
        class="control-btn settings-btn" 
        @click="openSettings"
        :title="t('titleBar.settings')"
      >
        <svg class="settings-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 8.5C7.82843 8.5 8.5 7.82843 8.5 7C8.5 6.17157 7.82843 5.5 7 5.5C6.17157 5.5 5.5 6.17157 5.5 7C5.5 7.82843 6.17157 8.5 7 8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M11.5 7C11.5 7.23 11.47 7.45 11.42 7.66L12.85 8.82C12.95 8.9 12.98 9.04 12.9 9.15L11.55 11.2C11.47 11.31 11.33 11.35 11.22 11.29L9.65 10.5C9.3 10.77 8.91 10.98 8.5 11.12L8.2 12.85C8.18 12.97 8.07 13.05 7.95 13.05H6.05C5.93 13.05 5.82 12.97 5.8 12.85L5.5 11.12C5.09 10.98 4.7 10.77 4.35 10.5L2.78 11.29C2.67 11.35 2.53 11.31 2.45 11.2L1.1 9.15C1.02 9.04 1.05 8.9 1.15 8.82L2.58 7.66C2.53 7.45 2.5 7.23 2.5 7C2.5 6.77 2.53 6.55 2.58 6.34L1.15 5.18C1.05 5.1 1.02 4.96 1.1 4.85L2.45 2.8C2.53 2.69 2.67 2.65 2.78 2.71L4.35 3.5C4.7 3.23 5.09 3.02 5.5 2.88L5.8 1.15C5.82 1.03 5.93 0.95 6.05 0.95H7.95C8.07 0.95 8.18 1.03 8.2 1.15L8.5 2.88C8.91 3.02 9.3 3.23 9.65 3.5L11.22 2.71C11.33 2.65 11.47 2.69 11.55 2.8L12.9 4.85C12.98 4.96 12.95 5.1 12.85 5.18L11.42 6.34C11.47 6.55 11.5 6.77 11.5 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button 
        class="control-btn minimize-btn" 
        @click="minimizeWindow"
        :title="t('titleBar.minimize')"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>
      <button 
        class="control-btn close-btn" 
        @click="closeWindow"
        :title="t('titleBar.close')"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  pendingCount: {
    type: Number,
    default: 0
  },
  darkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open-settings'])

const minimizeWindow = () => {
  console.log('最小化按钮被点击')
  if (window.electronAPI && window.electronAPI.hideWindow) {
    window.electronAPI.hideWindow()
    console.log('调用 hideWindow API')
  } else {
    console.error('electronAPI.hideWindow 不可用')
  }
}

const closeWindow = () => {
  console.log('关闭按钮被点击')
  if (window.electronAPI && window.electronAPI.closeWindow) {
    window.electronAPI.closeWindow()
    console.log('调用 closeWindow API')
  } else {
    console.error('electronAPI.closeWindow 不可用')
  }
}

const openSettings = () => {
  console.log('设置按钮被点击')
  emit('open-settings')
}
</script>

<style scoped>
.title-bar {
  -webkit-app-region: drag;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  background: var(--theme-gradient, var(--theme-color, linear-gradient(135deg, #ffb347 0%, #ff8c00 100%)));
  padding: 0 16px;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.title-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.logo-container:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.logo-icon {
  width: 18px;
  height: 18px;
  color: var(--text-on-white, white);
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title-text {
  color: var(--text-on-white, white);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: var(--text-on-white, white);
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: badge-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
  margin-right: 16px;
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 8px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-on-white, white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-btn:active {
  transform: scale(0.95);
}

.settings-icon {
  transition: transform 0.3s ease;
}

.settings-btn:hover {
  background: rgba(100, 149, 237, 0.9);
  border-color: rgba(100, 149, 237, 1);
}

.settings-btn:hover .settings-icon {
  transform: rotate(60deg);
}

.minimize-btn:hover {
  background: rgba(251, 191, 36, 0.9);
  border-color: rgba(251, 191, 36, 1);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.9);
  border-color: rgba(239, 68, 68, 1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

@media (max-width: 600px) {
  .title-bar {
    padding: 0 12px;
  }

  .logo-container {
    width: 28px;
    height: 28px;
  }

  .logo-icon {
    width: 16px;
    height: 16px;
  }

  .title-wrapper {
    gap: 8px;
  }

  .title-text {
    font-size: 14px;
  }

  .badge {
    font-size: 11px;
    padding: 0 6px;
    min-width: 22px;
    height: 22px;
  }

  .control-btn {
    width: 28px;
    height: 28px;
  }

  .settings-icon {
    width: 12px;
    height: 12px;
  }

  .minimize-btn svg,
  .close-btn svg {
    width: 12px;
    height: 12px;
  }
}

@media (max-width: 480px) {
  .title-bar {
    padding: 0 8px;
  }

  .logo-container {
    width: 24px;
    height: 24px;
  }

  .logo-icon {
    width: 14px;
    height: 14px;
  }

  .title-wrapper {
    gap: 6px;
  }

  .title-text {
    font-size: 13px;
  }

  .badge {
    font-size: 10px;
    padding: 0 4px;
    min-width: 20px;
    height: 20px;
  }

  .control-btn {
    width: 24px;
    height: 24px;
  }
}

/* 暗夜模式样式 */
.dark-mode {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
}

.dark-mode::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.dark-mode .logo-container {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

.dark-mode .logo-container:hover {
  background: rgba(255, 255, 255, 0.15);
}

.dark-mode .logo-icon {
  color: #94a3b8;
}

.dark-mode .title-text {
  background: var(--theme-gradient, linear-gradient(135deg, #ffb347 0%, #ff8c00 100%));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}

.dark-mode .badge {
  background: rgba(148, 163, 184, 0.2);
  border-color: rgba(148, 163, 184, 0.3);
  color: #94a3b8;
}

.dark-mode .control-btn {
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.25);
  color: var(--theme-color, #ff8c00);
}

.dark-mode .control-btn:hover {
  background: rgba(148, 163, 184, 0.25);
  border-color: rgba(148, 163, 184, 0.4);
  color: var(--theme-color, #ff8c00);
}

.dark-mode .settings-btn:hover {
  background: rgba(148, 163, 184, 0.3);
  border-color: rgba(148, 163, 184, 0.5);
  color: var(--theme-color, #ff8c00);
}

.dark-mode .minimize-btn:hover {
  background: rgba(148, 163, 184, 0.3);
  border-color: rgba(148, 163, 184, 0.5);
  color: var(--theme-color, #ff8c00);
}

.dark-mode .close-btn:hover {
  background: rgba(148, 163, 184, 0.3);
  border-color: rgba(148, 163, 184, 0.5);
  color: var(--theme-color, #ff8c00);
}
</style>
