<template>
  <div v-if="visible" class="settings-overlay" @click="closeOnOverlay">
    <div class="settings-panel" :class="{ 'dark-mode': darkMode }" @click.stop>
      <div class="settings-header">
        <h3 class="settings-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16.4 10C16.4 10.3714 16.3571 10.7286 16.2857 11.0714L18.1429 12.5714C18.2857 12.7 18.3214 12.9286 18.2143 13.1143L16.3857 16.1143C16.2786 16.3 16.0429 16.3714 15.8571 16.2857L13.6857 15.2571C13.1143 15.6857 12.4857 16.0286 11.8 16.2714L11.4571 18.5714C11.4286 18.7857 11.2429 18.9286 11.0286 18.9286H7.97143C7.75714 18.9286 7.57143 18.7857 7.54286 18.5714L7.2 16.2714C6.51429 16.0286 5.88571 15.6857 5.31429 15.2571L3.14286 16.2857C2.95714 16.3714 2.72143 16.3 2.61429 16.1143L0.785714 13.1143C0.678571 12.9286 0.714286 12.7 0.857143 12.5714L2.71429 11.0714C2.64286 10.7286 2.6 10.3714 2.6 10C2.6 9.62857 2.64286 9.27143 2.71429 8.92857L0.857143 7.42857C0.714286 7.3 0.678571 7.07143 0.785714 6.88571L2.61429 3.88571C2.72143 3.7 2.95714 3.62857 3.14286 3.71429L5.31429 4.74286C5.88571 4.31429 6.51429 3.97143 7.2 3.72857L7.54286 1.42857C7.57143 1.21429 7.75714 1.07143 7.97143 1.07143H11.0286C11.2429 1.07143 11.4286 1.21429 11.4571 1.42857L11.8 3.72857C12.4857 3.97143 13.1143 4.31429 13.6857 4.74286L15.8571 3.71429C16.0429 3.62857 16.2786 3.7 16.3857 3.88571L18.2143 6.88571C18.3214 7.07143 18.2857 7.3 18.1429 7.42857L16.2857 8.92857C16.3571 9.27143 16.4 9.62857 16.4 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          设置
        </h3>
        <button class="close-btn" @click="close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="settings-content">
        <!-- 暗夜模式 -->
        <div class="setting-section">
          <div class="dark-mode-row">
            <h4 class="section-title">暗夜模式</h4>
            <button 
              class="dark-mode-toggle"
              :class="{ active: settings.darkMode }"
              @click="toggleDarkMode"
              title="切换暗夜模式"
            >
              <svg v-if="!settings.darkMode" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 主题颜色设置 -->
        <div class="setting-section">
          <div class="color-mode-header">
            <h4 class="section-title">主题颜色</h4>
            <div class="color-mode-toggle">
              <div class="mode-slider" :class="settings.themeColorMode"></div>
              <button
                class="mode-btn"
                :class="{ active: settings.themeColorMode === 'single' }"
                @click="toggleColorMode('single')"
              >
                单色
              </button>
              <button
                class="mode-btn"
                :class="{ active: settings.themeColorMode === 'dual' }"
                @click="toggleColorMode('dual')"
              >
                双色
              </button>
            </div>
          </div>

          <!-- 单色模式 -->
          <div v-if="settings.themeColorMode === 'single'" class="single-color-section">
            <ColorPicker
              :model-value="settings.themeColor"
              :dark-mode="darkMode"
              @update:model-value="updateThemeColor"
            />
          </div>

          <!-- 双色模式 -->
          <div v-else class="dual-color-section">
            <!-- 配色方案快捷选择 -->
            <div class="scheme-selector">
              <div
                v-for="scheme in colorSchemes"
                :key="scheme.id"
                class="scheme-item"
                :title="scheme.name"
                @click="applyColorScheme(scheme)"
              >
                <div
                  class="scheme-preview"
                  :style="{
                    background: `linear-gradient(135deg, ${scheme.colors[0]}, ${scheme.colors[1]})`
                  }"
                />
              </div>
            </div>

            <!-- 双色调色板 -->
            <div class="dual-pickers">
              <div class="picker-group">
                <span class="picker-label">主色</span>
                <ColorPicker
                  :model-value="settings.primaryColor"
                  :dark-mode="darkMode"
                  @update:model-value="updatePrimaryColor"
                />
              </div>
              <div class="picker-group">
                <span class="picker-label">辅色</span>
                <ColorPicker
                  :model-value="settings.secondaryColor"
                  :dark-mode="darkMode"
                  @update:model-value="updateSecondaryColor"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 透明度设置 -->
        <div class="setting-section">
          <h4 class="section-title">窗口透明度</h4>
          <OpacitySlider
            :model-value="settings.opacity"
            :dark-mode="darkMode"
            @update:model-value="updateOpacity"
          />
        </div>

        <!-- 毛玻璃模糊度 -->
        <div class="setting-section">
          <h4 class="section-title">毛玻璃模糊度</h4>
          <GlassBlurSlider
            :model-value="settings.glassBlur"
            :dark-mode="darkMode"
            @update:model-value="updateGlassBlur"
          />
        </div>

        <!-- 阿里云语音服务配置 -->
        <div class="setting-section">
          <h4 class="section-title">阿里云语音服务</h4>
          <div class="voice-config">
            <div class="voice-config-row">
              <label>AccessKey ID</label>
              <input
                v-model="voiceAccessKeyId"
                type="text"
                placeholder="请输入访问密钥ID"
                class="voice-input"
              />
            </div>
            <div class="voice-config-row">
              <label>AccessKey Secret</label>
              <input
                v-model="voiceAccessKeySecret"
                type="password"
                placeholder="请输入访问密钥密码"
                class="voice-input"
              />
            </div>
            <div class="voice-config-row">
              <label>AppKey</label>
              <input
                v-model="voiceAppkey"
                type="text"
                placeholder="请输入AppKey"
                class="voice-input"
              />
            </div>
            <button class="save-voice-btn" @click="saveVoiceSettings">
              保存配置
            </button>
            <button class="test-voice-btn" @click="openTestPage">
              打开测试页面
            </button>
          </div>
        </div>

        <!-- 重置按钮 -->
        <div class="setting-section">
          <button class="reset-btn" @click="resetSettings">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C5.96183 2 4.16841 3.06329 3.08397 4.6667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M2 2V5H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            恢复默认设置
          </button>
        </div>

        <!-- Toast 提示 -->
        <transition name="toast">
          <div v-if="toast.visible" class="toast" :class="[toast.type, { 'dark-mode': darkMode }]">
            <svg v-if="toast.type === 'success'" class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>{{ toast.message }}</span>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import ColorPicker from './ColorPicker.vue'
import OpacitySlider from './OpacitySlider.vue'
import GlassBlurSlider from './GlassBlurSlider.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  darkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'settings-change'])

// 语音配置
const voiceAccessKeyId = ref('')
const voiceAccessKeySecret = ref('')
const voiceAppkey = ref('')

// Toast 提示
const toast = reactive({
  visible: false,
  message: '',
  type: 'success' // 'success' | 'error'
})
let toastTimer = null

function showToast(message, type = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.message = message
  toast.type = type
  toast.visible = true
  toastTimer = setTimeout(() => {
    toast.visible = false
  }, 2500)
}

const saveVoiceSettings = async () => {
  if (!voiceAccessKeyId.value || !voiceAccessKeySecret.value) {
    showToast('请填写 AccessKey ID 和 AccessKey Secret', 'error')
    return
  }

  if (!voiceAppkey.value) {
    showToast('请填写 AppKey', 'error')
    return
  }

  const config = {
    accessKeyId: voiceAccessKeyId.value,
    accessKeySecret: voiceAccessKeySecret.value,
    appkey: voiceAppkey.value
  }

  localStorage.setItem('voice-settings', JSON.stringify(config))

  if (window.electronAPI) {
    await window.electronAPI.voiceConfig(config)
  }

  showToast('语音配置已保存', 'success')
}

const openTestPage = async () => {
  if (window.electronAPI) {
    await window.electronAPI.openTestPage()
  }
}

// 加载语音配置
const loadVoiceSettings = () => {
  const saved = localStorage.getItem('voice-settings')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      voiceAccessKeyId.value = config.accessKeyId || ''
      voiceAccessKeySecret.value = config.accessKeySecret || ''
      voiceAppkey.value = config.appkey || ''
    } catch (e) {
      console.error('加载语音配置失败:', e)
    }
  }
}

// 语音配置加载时机的 watch
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadVoiceSettings()
  }
})

// 默认设置
const defaultSettings = {
  themeColor: { r: 255, g: 140, b: 0 }, // 橙色 #FF8C00
  themeColorMode: 'single', // 'single' | 'dual'
  primaryColor: { r: 255, g: 140, b: 0 },
  secondaryColor: { r: 255, g: 255, b: 255 },
  opacity: 100,
  darkMode: false,
  glassBlur: 8,
  colorScheme: 'sky'
}

// 当前设置
const settings = reactive({
  themeColor: { ...defaultSettings.themeColor },
  themeColorMode: defaultSettings.themeColorMode,
  primaryColor: { ...defaultSettings.primaryColor },
  secondaryColor: { ...defaultSettings.secondaryColor },
  opacity: defaultSettings.opacity,
  darkMode: defaultSettings.darkMode,
  glassBlur: defaultSettings.glassBlur,
  colorScheme: defaultSettings.colorScheme
})

// 配色方案
const colorSchemes = [
  { id: 'sky', name: '天空蓝', colors: ['#a1c4fd', '#c2e9fb'] },
  { id: 'purple', name: '紫粉', colors: ['#9b5de5', '#f15bb5'] },
  { id: 'coral', name: '珊瑚橙', colors: ['#ff7e5f', '#feb47b'] },
  { id: 'mint', name: '薄荷绿', colors: ['#00b09b', '#96c93d'] },
  { id: 'ocean', name: '海洋蓝', colors: ['#0f4c75', '#3282b8'] },
  { id: 'indigo', name: '靛蓝紫', colors: ['#4361ee', '#3a0ca3'] }
]

// 从本地存储加载设置
const loadSettings = () => {
  const saved = localStorage.getItem('app-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.themeColor) settings.themeColor = parsed.themeColor
      if (parsed.themeColorMode) settings.themeColorMode = parsed.themeColorMode
      if (parsed.primaryColor) settings.primaryColor = parsed.primaryColor
      if (parsed.secondaryColor) settings.secondaryColor = parsed.secondaryColor
      if (parsed.opacity !== undefined) settings.opacity = parsed.opacity
      if (parsed.darkMode !== undefined) settings.darkMode = parsed.darkMode
      if (parsed.glassBlur !== undefined) settings.glassBlur = parsed.glassBlur
      if (parsed.colorScheme) settings.colorScheme = parsed.colorScheme
    } catch (e) {
      console.error('加载设置失败:', e)
    }
  }
}

// 保存设置到本地存储
const saveSettings = () => {
  localStorage.setItem('app-settings', JSON.stringify(settings))
  emit('settings-change', { ...settings })
}

// 更新主题颜色
const updateThemeColor = (color) => {
  settings.themeColor = { ...color }
  // 同步更新主色
  settings.primaryColor = { ...color }
  saveSettings()
}

// 更新主色（双色模式）
const updatePrimaryColor = (color) => {
  settings.primaryColor = { ...color }
  // 同步更新主题色
  settings.themeColor = { ...color }
  saveSettings()
}

// 更新辅色（双色模式）
const updateSecondaryColor = (color) => {
  settings.secondaryColor = { ...color }
  saveSettings()
}

// 切换颜色模式
const toggleColorMode = (mode) => {
  settings.themeColorMode = mode
  saveSettings()
}

// 应用配色方案到双色
const applyColorScheme = (scheme) => {
  const colors = scheme.colors
  // 解析 hex 颜色
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }
  }
  settings.primaryColor = hexToRgb(colors[0])
  settings.secondaryColor = hexToRgb(colors[1])
  // 同步更新主题色
  settings.themeColor = hexToRgb(colors[0])
  saveSettings()
}

// 更新透明度
const updateOpacity = (opacity) => {
  settings.opacity = opacity
  saveSettings()
}

// 更新模糊度
const updateGlassBlur = (blur) => {
  settings.glassBlur = blur
  saveSettings()
}

// 更新配色方案
const updateColorScheme = (scheme) => {
  settings.colorScheme = scheme
  saveSettings()
}

// 切换暗夜模式
const toggleDarkMode = () => {
  settings.darkMode = !settings.darkMode
  saveSettings()
}

// 重置设置
const resetSettings = () => {
  settings.themeColor = { ...defaultSettings.themeColor }
  settings.themeColorMode = defaultSettings.themeColorMode
  settings.primaryColor = { ...defaultSettings.primaryColor }
  settings.secondaryColor = { ...defaultSettings.secondaryColor }
  settings.opacity = defaultSettings.opacity
  settings.darkMode = defaultSettings.darkMode
  settings.glassBlur = defaultSettings.glassBlur
  settings.colorScheme = defaultSettings.colorScheme
  saveSettings()
}

// 关闭面板
const close = () => {
  emit('update:visible', false)
}

// 点击遮罩关闭
const closeOnOverlay = () => {
  close()
}

// 初始化加载设置
loadSettings()

// 暴露设置给父组件
defineExpose({
  settings,
  loadSettings
})
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-panel {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  position: relative;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #334155;
}

.settings-title svg {
  color: #ff8c00;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.05);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #334155;
}

.settings-content {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
  scrollbar-width: thin;
  scrollbar-color: var(--text-on-color, var(--theme-color, #ff8c00)) #f1f5f9;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--theme-color, #ff8c00);
  border-radius: 3px;
}

.setting-section {
  margin-bottom: 28px;
}

.setting-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 暗夜模式行 */
.dark-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark-mode-row .section-title {
  margin: 0;
}

.dark-mode-toggle {
  width: 44px;
  height: 44px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.dark-mode-toggle:hover {
  border-color: #ff8c00;
  color: #ff8c00;
  transform: scale(1.05);
}

.dark-mode-toggle.active {
  background: #1e293b;
  border-color: #1e293b;
  color: #fbbf24;
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.reset-btn:active {
  transform: scale(0.98);
}

/* 语音配置样式 */
.voice-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-config-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.voice-config-row label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.voice-input {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: #334155;
  transition: all 0.2s ease;
}

.voice-input:focus {
  outline: none;
  border-color: #ff8c00;
  box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.1);
}

.voice-input::placeholder {
  color: #94a3b8;
}

.save-voice-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.save-voice-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

.save-voice-btn:active {
  transform: translateY(0);
}

/* 测试按钮 */
.test-voice-btn {
  padding: 10px 20px;
  border: 1px solid #ff8c00;
  border-radius: 8px;
  background: transparent;
  color: #ff8c00;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.test-voice-btn:hover {
  background: rgba(255, 140, 0, 0.1);
}

.test-voice-btn:active {
  transform: scale(0.98);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .settings-panel {
    width: 95%;
    max-height: 85vh;
  }
  
  .settings-header {
    padding: 16px 20px;
  }
  
  .settings-content {
    padding: 20px;
  }
  
  .setting-section {
    margin-bottom: 24px;
  }
}

/* 暗夜模式样式 */
.dark-mode.settings-overlay {
  background: rgba(0, 0, 0, 0.7);
}

.dark-mode {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-color: rgba(255, 140, 0, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dark-mode .settings-header {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: rgba(255, 140, 0, 0.2);
}

.dark-mode .settings-title {
  color: #f1f5f9;
}

.dark-mode .settings-title svg {
  color: var(--theme-color, #ff8c00);
}

.dark-mode .close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.dark-mode .close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #f1f5f9;
}

.dark-mode .settings-content {
  scrollbar-color: var(--theme-color, #ff8c00) #334155;
}

.dark-mode .settings-content::-webkit-scrollbar-track {
  background: #334155;
}

.dark-mode .settings-content::-webkit-scrollbar-thumb {
  background: var(--theme-color, #ff8c00);
  border: 1px solid #334155;
}

.dark-mode .section-title {
  color: #94a3b8;
}

.dark-mode .dark-mode-toggle {
  border-color: #475569;
  background: #334155;
  color: #94a3b8;
}

.dark-mode .dark-mode-toggle:hover {
  border-color: var(--theme-color, #ff8c00);
  color: var(--theme-color, #ff8c00);
}

.dark-mode .dark-mode-toggle.active {
  background: #1e293b;
  border-color: #1e293b;
  color: var(--theme-color, #ff8c00);
}

.dark-mode .reset-btn {
  background: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.dark-mode .reset-btn:hover {
  background: #3d4f66;
  border-color: #54667a;
  color: #f1f5f9;
}

/* 暗夜模式 - 语音配置 */
.dark-mode .voice-input {
  background: #1e293b;
  border-color: #475569;
  color: #f1f5f9;
}

.dark-mode .voice-input:focus {
  border-color: #ff8c00;
  box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.2);
}

.dark-mode .voice-input::placeholder {
  color: #64748b;
}

/* 配色方案选择器样式 */
.color-schemes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.scheme-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scheme-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.scheme-btn.active {
  border-color: var(--theme-color, #ff8c00);
  box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.3);
}

/* 单色/双色模式切换样式 */
.color-mode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.color-mode-toggle {
  position: relative;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 8px;
}

.mode-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 6px);
  height: calc(100% - 8px);
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.mode-slider.dual {
  transform: translateX(calc(100% + 4px));
}

.mode-btn {
  position: relative;
  z-index: 1;
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}

.mode-btn:hover {
  color: #334155;
}

.mode-btn.active {
  color: var(--text-on-color, var(--theme-color, #ff8c00));
}

/* 单色模式色板 */
.single-color-section {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

/* 双色模式区域 */
.dual-color-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 配色方案快速选择栏 */
.scheme-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.scheme-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.scheme-preview {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.scheme-item:hover .scheme-preview {
  transform: scale(1.1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* 双色调色板区域 */
.dual-pickers {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.picker-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.picker-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 暗夜模式样式 */
.dark-mode .color-mode-toggle {
  background: #334155;
}

.dark-mode .mode-btn {
  color: #94a3b8;
}

.dark-mode .mode-btn:hover {
  color: #f1f5f9;
}

.dark-mode .mode-btn.active {
  color: var(--theme-color, #ff8c00);
}

.dark-mode .mode-slider {
  background: #1e293b;
}

.dark-mode .scheme-selector {
  background: #334155;
  border-color: #475569;
}

.dark-mode .picker-label {
  color: #94a3b8;
}

/* ==================== Toast 提示 ==================== */
.toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  pointer-events: none;
}

.toast.success {
  color: #16a34a;
}

.toast.error {
  color: #dc2626;
}

.toast-icon {
  flex-shrink: 0;
}

.toast.success .toast-icon {
  color: #16a34a;
}

.toast.error .toast-icon {
  color: #dc2626;
}

.toast span {
  white-space: nowrap;
}

/* Toast 动画 */
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(16px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px) scale(0.95);
}

/* Toast 暗夜模式 */
.toast.dark-mode {
  background: #334155;
  border-color: #475569;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
</style>
