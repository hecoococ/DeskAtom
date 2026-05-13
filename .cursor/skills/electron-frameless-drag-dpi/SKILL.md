---
name: electron-frameless-drag-dpi
description: >-
  Fixes Electron frameless window drag on Windows when display scaling is not 100% (125%, 150%, etc.): use setBounds with locked width/height, correct workArea bounds, and main-process cursor positioning. Use when dragging causes wrong movement, drifting boundaries, cursor/icon desync, window size growing while dragging, or issues on HiDPI single/multi monitor.
---

# Electron 无边框窗口拖动（Windows 缩放 / DPI）

## 何时应用

- Windows **显示缩放 ≠ 100%**（125%、150% 等），拖动小窗/悬浮窗时 **只改位置却像改了尺寸**、**边界感漂移**、**图标动而系统光标不动**。
- 使用 `setPosition` 手动拖动 `BrowserWindow` 后出现 **与 Mac 或 100% 缩放不一致** 的行为。

## 核心结论

1. **不要用单独的 `setPosition(x, y)` 在高 DPI 下反复移动无边框窗**；应使用 **`setBounds({ x, y, width, height }, false)`**，且 **`width` / `height` 在整次拖动中固定**为拖动开始时 `getBounds()` 的值（与业内记录一致，例如[博客园：无边框窗口拖拽与 setBounds](https://www.cnblogs.com/jianzhan/p/electron_drag.html)）。
2. **裁剪到「可放置区域」时**必须使用 `display.workArea` 的 **`x, y, width, height`**，不能只拿 `workAreaSize` 用 `0 ~ width`（虚拟桌面/workArea 偏移时必错）。
3. **用哪块屏来裁剪**：`screen.getDisplayNearestPoint({ x, y })`（光标或窗口中心），再对该 `display.workArea` 做 clamp。
4. **不要用渲染进程的 `event.screenX` / delta 推窗口位置**当唯一真源；应在 **主进程**用 `screen.getCursorScreenPoint()`（或 Win32 `GetCursorPos`）算  
   `新左上角 = 光标 - 按下时的抓取偏移`。触摸板可能触发大量 `pointermove` 但光标未变：仅在 **光标坐标相对上次采样发生变化** 时再 `setBounds`。
5. **裁剪用的外沿宽高**用 **`getBounds().width/height`**，不要写死设计稿 CSS 像素；高 DPI 下外层 bounds 可能不是逻辑 48。

## 推荐实现要点（主进程）

- **`start-drag`**：`b = win.getBounds()`，存 `fixedW = b.width`，`fixedH = b.height`，存 `grabX = cursor.x - b.x`，`grabY = cursor.y - b.y`；可设 slop（例如 5px）用**光标**相对按下点判断是否算拖动。
- **`move`**：`p = screen.getCursorScreenPoint()`；通过 slop 后若 `p` 与上次采样相同则 return；  
  `nx = p.x - grabX`，`ny = p.y - grabY`；对 `getDisplayNearestPoint(p)` 的 `workArea` 做 clamp（传入 `fixedW/fixedH`）；  
  `setBounds({ x: nx, y: ny, width: fixedW, height: fixedH }, false)`。
- **`end-drag`**：边缘吸附目标坐标同样基于 **`workArea.x/y`** 与 **实际 `fw/fh`**；吸附动画每一帧也用 **相同 `fixedW/fh` 的 `setBounds`**。
- **初次 `show`**：若需放置窗口，优先 `getBounds()` 取当前宽高再 `setBounds`，与拖动路径一致。

## 渲染进程

- 用 **Pointer Events** + `setPointerCapture`，`pointermove` 只发 IPC「请求同步位置」；**不要**把 `deltaX/deltaY` 当唯一依据。
- **点击 vs 拖动**可由主进程根据是否超过 slop 决定（避免仅靠渲染层 `screenX`）。

## 打包注意

- 若引入带 **原生 .node** 的 FFI，需在 `electron-builder` 里 **`asarUnpack`** 对应模块；仅用 Electron `screen` API 则无此项。

## 验证清单

- [ ] 150% 缩放下拖动数十次，**宽高是否保持不变**（`getBounds` 打印）。
- [ ] **光标静止**时窗口是否仍漂移（应不漂移）。
- [ ] 单屏任务栏：**workArea** 是否与可视工作区一致（含 `y` 偏移）。
- [ ] 多屏：窗口在副屏时裁剪是否仍正确（依赖 `workArea.x/y` 与 `getDisplayNearestPoint`）。
