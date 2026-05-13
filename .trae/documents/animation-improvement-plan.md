# Electron 待办事项应用动画改进计划

## 一、当前动画现状分析

### 已有动画（style.css）
| 动画类型 | 名称 | 效果 |
|---------|------|------|
| 关键帧动画 | `float` | 上下浮动 |
| 关键帧动画 | `pulse` | 脉冲（Tailwind 内置） |
| 关键帧动画 | `bounce` | 弹跳（Tailwind 内置） |
| Vue 过渡 | `fade` | 淡入淡出 |
| Vue 过渡 | `slide` | 左右滑动 |
| Vue 过渡 | `scale` | 缩放淡入淡出 |
| Vue 过渡 | `stagger` | 交错进入 |

### 已有动画（App.vue）
| 动画类型 | 名称 | 效果 |
|---------|------|------|
| 关键帧动画 | `shake` | 抖动（错误提示） |

---

## 二、可改进的各个点

### 1. 关键帧动画扩展

**当前缺失：**
- `fadeIn` - 淡入 + 上移
- `slideInLeft` / `slideInRight` - 左右滑入
- `spin` - 旋转加载
- `ping` - 扩散消失
- `progress` - 进度条流动
- `skeleton` - 骨架屏闪光
- `ripple` - 按钮点击涟漪

**改进方案：**
```css
/* 添加到 style.css */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes ping {
    75%, 100% { transform: scale(2); opacity: 0; }
}

@keyframes progress {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes skeleton {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes ripple {
    0% { transform: scale(0); opacity: 0.5; }
    100% { opacity: 0; transform: scale(40); }
}
```

**应用场景：**
- `fadeIn` → 任务列表加载、设置面板打开
- `slideInLeft/Right` → 快速输入框出现、侧边栏
- `spin` → 加载状态、同步图标
- `ping` → 通知提示、新任务提醒
- `progress` → 进度条动画
- `skeleton` → 加载占位
- `ripple` → 按钮点击效果

---

### 2. 任务项专用动画（重点改进）

**当前问题：**
- 任务添加/删除动画过于简单
- 缺少"借位"动画效果
- 没有区分添加和删除的移动延迟

**改进方案：**
```css
/* 任务项进入动画 - 弹性效果 */
.task-item-enter-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.task-item-enter-from {
    opacity: 0;
    transform: translateX(-100px) scale(0.95);
}

.task-item-enter-to {
    opacity: 1;
    transform: translateX(0) scale(1);
}

/* 任务项离开动画 */
.task-item-leave-active {
    position: absolute;
    width: 100%;
    transition: all 0.35s cubic-bezier(0.6, -0.28, 0.735, 0.045);
    z-index: 1;
}

.task-item-leave-from {
    opacity: 1;
    transform: translateX(0) scale(1);
}

.task-item-leave-to {
    opacity: 0;
    transform: translateX(100px) scale(0.92);
}

/* 添加任务时的移动延迟 - 短延迟 */
.task-item-move-add {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
}

/* 删除任务时的移动延迟 - 长延迟 */
.task-item-move-remove {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.6s;
}
```

**JS 配合：**
```javascript
// App.vue 中添加
const addingTask = ref(false)
const deletingTask = ref(false)

const currentMoveClass = computed(() => {
    if (addingTask.value) return 'task-item-move-add'
    if (deletingTask.value) return 'task-item-move-remove'
    return ''
})

// 添加任务时
const addTask = () => {
    addingTask.value = true
    // ... 添加逻辑
    setTimeout(() => { addingTask.value = false }, 500)
}

// 删除任务时
const deleteTask = (id) => {
    deletingTask.value = true
    // ... 删除逻辑
    setTimeout(() => { deletingTask.value = false }, 800)
}
```

---

### 3. Vue Transition 增强

**当前缺失：**
- Toast 弹窗动画
- 模态框动画
- 错误消息动画
- 列表移动动画

**改进方案：**
```css
/* Toast 弹窗动画 */
.toast-enter-active {
    animation: toastIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-leave-active {
    animation: toastOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes toastIn {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px) scale(0.8);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
}

@keyframes toastOut {
    from {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px) scale(0.8);
    }
}

/* 模态框/设置面板动画 */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

/* 错误消息动画 */
.error-fade-enter-active,
.error-fade-leave-active {
    transition: all 0.3s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* 列表移动动画 */
.list-move {
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 4. 过渡效果工具类

**当前缺失：**
- 统一的过渡效果类
- 悬停效果类
- 点击效果类
- 焦点效果类

**改进方案：**
```css
/* 过渡动画 */
.transition-all { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.transition-colors { transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease; }
.transition-transform { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.transition-opacity { transition: opacity 0.3s ease; }
.transition-shadow { transition: box-shadow 0.3s ease; }

/* 悬停效果 */
.hover-scale:hover { transform: scale(1.02); }
.hover-lift:hover { transform: translateY(-2px); }
.hover-shadow:hover { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
.hover-glow:hover { box-shadow: 0 0 20px rgba(255, 140, 0, 0.3); }

/* 点击效果 */
.active-scale:active { transform: scale(0.98); }
.active-lift:active { transform: translateY(1px); }

/* 焦点效果 */
.focus-ring:focus {
    outline: 2px solid var(--theme-color);
    outline-offset: 2px;
}

.focus-shadow:focus {
    box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.1);
}
```

---

### 5. 动画工具类

**改进方案：**
```css
/* 动画类 */
.animate-fadeIn { animation: fadeIn 0.5s ease-out; }
.animate-slideInLeft { animation: slideInLeft 0.5s ease-out; }
.animate-slideInRight { animation: slideInRight 0.5s ease-out; }
.animate-bounce { animation: bounce 1s ease-in-out; }
.animate-pulse { animation: pulse 2s infinite; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
.animate-shake { animation: shake 0.5s ease-in-out; }

/* 延迟动画 */
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-500 { animation-delay: 500ms; }

/* 加载动画 */
.loading-spinner {
    border: 2px solid #e2e8f0;
    border-top: 2px solid var(--theme-color);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
}

/* 进度条动画 */
.progress-bar-animated {
    height: 4px;
    background: linear-gradient(90deg, var(--theme-color) 0%, var(--theme-color) 50%, var(--theme-color) 100%);
    background-size: 200% 100%;
    animation: progress 2s ease-in-out infinite;
}

/* 骨架屏动画 */
.skeleton {
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton 1.5s infinite;
}
```

---

### 6. 具体组件动画改进

#### 6.1 TodoItem 组件
- 添加悬停时的微妙提升效果
- 删除按钮出现动画
- 完成状态切换动画

#### 6.2 设置面板
- 打开/关闭的缩放动画
- 内部元素的交错进入动画
- 滚动时的平滑过渡

#### 6.3 快速输入框
- 弹出时的弹性动画
- 输入时的反馈动画
- 提交时的涟漪效果

#### 6.4 指示器窗口
- 悬停时的缩放效果
- 拖拽时的视觉反馈
- 任务数量变化的脉冲效果

---

## 三、实施优先级

| 优先级 | 改进项 | 原因 |
|-------|--------|------|
| P0 | 任务项专用动画 | 核心功能，用户体验提升最大 |
| P0 | 关键帧动画扩展 | 基础设施，其他动画依赖 |
| P1 | Vue Transition 增强 | 提升整体流畅度 |
| P1 | 过渡效果工具类 | 统一动画风格 |
| P2 | 动画工具类 | 便于快速应用 |
| P2 | 具体组件动画 | 细节优化 |

---

## 四、预期效果

1. **任务添加**：新任务从左侧弹性滑入，其他任务快速让位
2. **任务删除**：被删除任务向右滑出消失，其他任务等待后填补
3. **悬停效果**：统一的提升、缩放、阴影效果
4. **点击效果**：涟漪扩散、缩放反馈
5. **加载状态**：旋转加载器、骨架屏
6. **过渡动画**：所有状态变化都有平滑过渡
