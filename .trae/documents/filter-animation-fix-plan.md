# 筛选器切换动画修复计划

## 问题分析

当筛选器从"全部"切换到"未完成"或"已完成"时，存在以下问题：

1. **删除动画（leave-active）**：需要 `position: relative`，让元素脱离文档流进行飞走动画
2. **补位动画（move）**：需要 `position: absolute`（由 Vue FLIP 机制处理），让其他元素平滑移动到新位置
3. **当前问题**：这两种动画同时发生，产生冲突，导致动画效果不佳

## 解决方案

采用**分阶段动画**策略：
1. 第一阶段：执行删除动画（position: relative，元素飞走）
2. 第二阶段：删除动画完成后，改变布局为绝对定位
3. 第三阶段：执行补位动画（其他元素移动到新位置）

## 实施步骤

### 1. 修改 App.vue 中的筛选器切换逻辑

- 监听筛选器变化
- 使用 `setTimeout` 分阶段设置动画状态：
  - 阶段1：设置 `filteringTask = true`，开始删除动画
  - 阶段2：延迟 300ms 后，设置 `layoutChange = true`，改变布局
  - 阶段3：再延迟 100ms 后，设置 `moveTask = true`，开始补位动画

### 2. 修改 style.css 中的动画类

- 为 6 种筛选切换场景创建三组类：
  - `*-leave`：删除动画（position: relative）
  - `*-layout`：布局改变（position: absolute）
  - `*-move`：补位动画（transform）

### 3. 添加 computed 属性

在 App.vue 中添加：
- `filterLeaveClass`：控制删除动画的类
- `filterLayoutClass`：控制布局改变的类
- `filterMoveClass`：控制补位动画的类

### 4. 时间线设计

```
t=0ms:    筛选器点击 → 开始 leave 动画（position: relative）
t=300ms:  leave 动画完成 → 开始布局改变（position: absolute）
t=350ms:  布局改变完成 → 开始 move 动画（其他元素补位）
t=750ms:  动画全部完成 → 清理状态
```

## 预期效果

- 元素飞走动画流畅（position: relative）
- 其他元素补位平滑（position: absolute + transform）
- 两阶段动画顺序执行，不产生冲突
