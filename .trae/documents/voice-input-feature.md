# 语音输入功能实现计划

## 功能概述
为任务输入框添加语音输入功能，用户可以通过语音快速添加任务。

## 技术方案
使用 **Web Speech API** (`SpeechRecognition`)，这是浏览器原生支持的语音识别 API，无需额外依赖。

### 方案优势
- 无需安装额外依赖
- 浏览器原生支持
- 支持中文识别
- 实时返回识别结果

## 实现步骤

### 1. 创建语音输入组件
**文件**: `src/components/VoiceInput.vue`

功能：
- 麦克风按钮（点击开始/停止录音）
- 录音状态动画（脉冲效果）
- 语音识别结果实时显示
- 错误处理（浏览器不支持、麦克风权限拒绝等）

### 2. 修改 App.vue
- 在输入框旁边添加语音输入按钮
- 集成语音识别结果到任务输入框
- 添加语音输入状态管理

### 3. 样式适配
- 正常模式样式
- 暗夜模式样式
- 录音动画效果
- 响应式布局适配

## 详细实现

### Step 1: 创建 VoiceInput.vue 组件

```vue
<template>
  <button 
    @click="toggleRecording"
    :class="['voice-btn', { recording: isRecording, disabled: !isSupported }]"
    :disabled="!isSupported"
    :title="buttonTitle"
  >
    <!-- 麦克风图标 -->
    <svg v-if="!isRecording" width="20" height="20" viewBox="0 0 24 24">
      <!-- 麦克风 SVG -->
    </svg>
    <!-- 录音中动画 -->
    <div v-else class="recording-indicator">
      <!-- 动画效果 -->
    </div>
  </button>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['result', 'error', 'start', 'end'])

// Web Speech API 初始化
// 录音状态管理
// 识别结果处理
</script>
```

### Step 2: 集成到 App.vue

修改位置：`.input-wrapper` 区域

```vue
<div class="input-wrapper">
  <input v-model="newTask" ... />
  <VoiceInput @result="handleVoiceResult" />  <!-- 新增 -->
  <button @click="addTask" class="add-btn">...</button>
</div>
```

### Step 3: CSS 样式

```css
/* 语音按钮样式 */
.voice-btn {
  /* 基础样式 */
}

.voice-btn.recording {
  /* 录音状态 - 脉冲动画 */
  animation: pulse 1.5s infinite;
}

/* 暗夜模式 */
.dark-mode .voice-btn {
  /* 暗夜模式样式 */
}
```

## 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/VoiceInput.vue` | 新建 | 语音输入组件 |
| `src/App.vue` | 修改 | 集成语音输入组件 |
| `src/style.css` | 修改 | 添加语音按钮全局样式（可选） |

## 注意事项

1. **浏览器兼容性**: Web Speech API 在 Chrome/Edge 支持良好，Firefox 部分支持
2. **HTTPS 要求**: 某些浏览器要求 HTTPS 才能使用麦克风（Electron 不受此限制）
3. **权限处理**: 需要处理用户拒绝麦克风权限的情况
4. **中文支持**: Web Speech API 默认支持中文识别

## 测试要点

- [ ] 点击按钮开始录音
- [ ] 录音状态动画显示
- [ ] 语音识别结果正确显示在输入框
- [ ] 再次点击停止录音
- [ ] 浏览器不支持时的提示
- [ ] 麦克风权限拒绝的处理
- [ ] 暗夜模式样式正确
