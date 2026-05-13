import { app, BrowserWindow, screen, ipcMain, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupVoiceIpcHandlers } from './voiceHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let indicatorWindow = null
let isHidden = false
let hideTimer = null
let animationTimer = null
let attachedEdge = 'right'
let pendingTaskCount = 0
let isIndicatorDragging = false
let indicatorPosition = { x: 0, y: 0 }
let isIndicatorSnapped = false  // 指示器是否吸附到边缘
let userOpacity = 1  // 用户设置的透明度
const DEFAULT_WIDTH = 400
const MIN_WIDTH = 300
const MAX_WIDTH = 600
const HIDE_DELAY = 0
const ANIMATION_DURATION = 300
const ANIMATION_STEPS = 20
const EDGE_SNAP_THRESHOLD = 30
const INDICATOR_SIZE = 48
/** Windows 缩放非 100% 时，仅用 setPosition 可能导致客户区换算误差；移动时应固定宽高用 setBounds（见博客园等资料） */
const INDICATOR_DRAG_SLOP_PX = 5

function clampIndicatorToWorkArea(x, y, display, outerW = INDICATOR_SIZE, outerH = INDICATOR_SIZE) {
  const wa = display.workArea
  const minX = wa.x
  const minY = wa.y
  const maxX = wa.x + wa.width - outerW
  const maxY = wa.y + wa.height - outerH
  return {
    x: Math.max(minX, Math.min(Math.round(x), maxX)),
    y: Math.max(minY, Math.min(Math.round(y), maxY))
  }
}

function applyIndicatorBounds(x, y, width, height) {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) return
  indicatorWindow.setBounds(
    {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    },
    false
  )
}

function createAppIcon() {
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffb347;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff8c00;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="40" fill="url(#grad1)"/>
      <g transform="translate(40, 50)">
        <rect x="0" y="0" width="176" height="30" rx="8" fill="white" opacity="0.9"/>
        <rect x="0" y="50" width="176" height="30" rx="8" fill="white" opacity="0.9"/>
        <rect x="0" y="100" width="176" height="30" rx="8" fill="white" opacity="0.9"/>
        <circle cx="25" cy="15" r="8" fill="#4ade80"/>
        <circle cx="25" cy="65" r="8" fill="#94a3b8"/>
        <circle cx="25" cy="115" r="8" fill="#94a3b8"/>
        <rect x="45" y="8" width="110" height="14" rx="4" fill="#64748b"/>
        <rect x="45" y="58" width="110" height="14" rx="4" fill="#64748b"/>
        <rect x="45" y="108" width="110" height="14" rx="4" fill="#64748b"/>
      </g>
    </svg>
  `
  const base64Svg = Buffer.from(svgString).toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${base64Svg}`
  return nativeImage.createFromDataURL(dataUrl)
}

function createBadgeIcon(count) {
  const size = 16
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#FF0000"/>
      <text x="8" y="11" font-size="10" font-weight="bold" fill="white" text-anchor="middle">${count}</text>
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(canvas))
}

function updateTaskCount(count) {
  pendingTaskCount = count
  
  // 更新任务栏图标徽章
  if (mainWindow && process.platform === 'win32') {
    if (count > 0) {
      mainWindow.setOverlayIcon(
        createBadgeIcon(Math.min(count, 99)),
        `${count}个任务`
      )
    } else {
      mainWindow.setOverlayIcon(null, '')
    }
  }
  
  // 更新指示器窗口徽章
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.webContents.send('update-badge', count)
  }
}

function detectEdge() {
  if (!mainWindow || mainWindow.isDestroyed()) return 'right'
  
  try {
    const bounds = mainWindow.getBounds()
    
    // 获取窗口所在的屏幕（支持多屏）
    const display = screen.getDisplayNearestPoint({
      x: Math.round(bounds.x + bounds.width / 2),
      y: Math.round(bounds.y + bounds.height / 2)
    })
    const { width: screenWidth, height: screenHeight } = display.workAreaSize
    const workArea = display.workArea
    
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    
    // 判断窗口主要在哪个边缘（相对于当前屏幕）
    // 优先检查上下边缘（Y轴）
    if (bounds.y < workArea.y + 100) {
      return 'top'
    } else if (bounds.y + bounds.height > workArea.y + screenHeight - 100) {
      return 'bottom'
    }
    
    // 然后检查左右边缘（X轴）
    return centerX < workArea.x + screenWidth / 2 ? 'left' : 'right'
  } catch (error) {
    console.error('检测边缘失败:', error)
    return 'right'
  }
}

function clearAllTimers() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (animationTimer) {
    clearInterval(animationTimer)
    animationTimer = null
  }
}

function createIndicatorWindow() {
  indicatorWindow = new BrowserWindow({
    width: 48,
    height: 48,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    opacity: 0,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-indicator.js')
    }
  })
  
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  
  if (isDev) {
    indicatorWindow.loadFile(path.join(__dirname, '../public/indicator.html'))
  } else {
    indicatorWindow.loadFile(path.join(__dirname, '../dist/indicator.html'))
  }
  
  indicatorWindow.on('closed', () => {
    indicatorWindow = null
  })
}

function animateIndicator(targetOpacity, duration = 300) {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) return
  
  const startOpacity = indicatorWindow.getOpacity()
  const deltaOpacity = targetOpacity - startOpacity
  const steps = 20
  const stepDuration = duration / steps
  let currentStep = 0
  
  const animate = setInterval(() => {
    if (!indicatorWindow || indicatorWindow.isDestroyed()) {
      clearInterval(animate)
      return
    }
    
    currentStep++
    const progress = currentStep / steps
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    const currentOpacity = startOpacity + deltaOpacity * easeProgress
    
    indicatorWindow.setOpacity(currentOpacity)
    
    if (currentStep >= steps) {
      clearInterval(animate)
    }
  }, stepDuration)
}

function showIndicator() {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) {
    createIndicatorWindow()
  }

  let x, y

  const ob = indicatorWindow.getBounds()
  const bw0 = ob.width
  const bh0 = ob.height

  if (indicatorPosition.x !== 0 || indicatorPosition.y !== 0) {
    // 使用记录的位置，并确保在当前屏幕范围内
    x = indicatorPosition.x
    y = indicatorPosition.y
    const d = screen.getDisplayNearestPoint({
      x: Math.round(x + bw0 / 2),
      y: Math.round(y + bh0 / 2)
    })
    const c = clampIndicatorToWorkArea(x, y, d, bw0, bh0)
    x = c.x
    y = c.y
  } else {
    // 默认显示在主窗口所在的屏幕
    const mainBounds = mainWindow.getBounds()
    const display = screen.getDisplayNearestPoint({
      x: Math.round(mainBounds.x + mainBounds.width / 2),
      y: Math.round(mainBounds.y + mainBounds.height / 2)
    })
    const wa = display.workArea
    const margin = 10
    if (attachedEdge === 'left') {
      x = wa.x + margin
    } else {
      x = wa.x + wa.width - bw0 - margin
    }
    y = wa.y + Math.round((wa.height - bh0) / 2)
  }

  applyIndicatorBounds(x, y, bw0, bh0)
  indicatorWindow.show()
  
  // 淡入动画
  animateIndicator(1, 300)
  
  // 更新徽章
  indicatorWindow.webContents.send('update-badge', pendingTaskCount)
}

function hideIndicator() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    // 淡出动画
    animateIndicator(0, 200)
    
    // 动画完成后隐藏窗口
    setTimeout(() => {
      if (indicatorWindow && !indicatorWindow.isDestroyed()) {
        indicatorWindow.hide()
      }
    }, 200)
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // 使用ICO文件路径作为窗口图标（用于任务栏显示）
  const iconPath = path.join(__dirname, '../build/icons/icon.ico')
  
  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: screenHeight / 2,
    minWidth: 240,
    minHeight: 100,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    icon: iconPath,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.setPosition(screenWidth - DEFAULT_WIDTH, 0)

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  
  if (isDev) {
    console.log('开发模式：加载 http://localhost:1420')
    mainWindow.loadURL('http://localhost:1420')
    mainWindow.webContents.openDevTools()
  } else {
    console.log('生产模式：加载本地文件')
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    clearAllTimers()
    mainWindow = null
    // 关闭指示器窗口
    if (indicatorWindow && !indicatorWindow.isDestroyed()) {
      indicatorWindow.close()
    }
  })

  mainWindow.on('minimize', (event) => {
    event.preventDefault()
    hideToIndicator()
  })

  // 移除自动隐藏逻辑，窗口始终保持在最上层
  // mainWindow.on('blur', () => { ... })

  mainWindow.on('moved', () => {
    attachedEdge = detectEdge()
  })
}

// 请求单实例锁
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果没有获得锁，说明已经有实例在运行，直接退出
  console.log('应用已在运行，退出新实例')
  app.quit()
} else {
  // 获得锁，监听第二个实例的启动
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('检测到第二个实例启动')
    
    // 重复启动时的行为：
    // 1. 如果当前是指示器模式，恢复并显示主窗口
    // 2. 如果主窗口已经是可见状态，保持聚焦主窗口
    
    if (isHidden) {
      // 指示器模式：恢复主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        showFromIndicator()
      }
    } else {
      // 主窗口模式：显示并聚焦主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  app.whenReady().then(() => {
    createWindow()
    setupVoiceIpcHandlers(mainWindow)

    // 添加打开测试页面的 IPC 处理
    ipcMain.handle('open-test-page', async () => {
      const testWindow = new BrowserWindow({
        width: 800,
        height: 700,
        title: '语音识别测试',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      })
      testWindow.loadFile(path.join(__dirname, '../src/test/voice-test.html'))
      return { success: true }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('browser-window-focus', (event, window) => {
  if (window === mainWindow && isHidden) {
    showFromIndicator()
  }
})

// 移除自动隐藏逻辑
// app.on('browser-window-blur', (event, window) => { ... })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function animateWindow(targetX, duration = ANIMATION_DURATION) {
  if (!mainWindow || mainWindow.isDestroyed() || animationTimer) return
  
  const bounds = mainWindow.getBounds()
  const startX = bounds.x
  const deltaX = targetX - startX
  const stepDuration = duration / ANIMATION_STEPS
  let currentStep = 0
  
  animationTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(animationTimer)
      animationTimer = null
      return
    }
    
    currentStep++
    const progress = currentStep / ANIMATION_STEPS
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    const currentX = Math.round(startX + deltaX * easeProgress)
    
    try {
      mainWindow.setPosition(currentX, bounds.y)
    } catch (error) {
      console.error('设置窗口位置失败:', error)
      clearInterval(animationTimer)
      animationTimer = null
    }
    
    if (currentStep >= ANIMATION_STEPS) {
      clearInterval(animationTimer)
      animationTimer = null
    }
  }, stepDuration)
}

function animateMainWindow(targetOpacity, duration = 300, callback = null) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  
  const startOpacity = mainWindow.getOpacity()
  const deltaOpacity = targetOpacity - startOpacity
  const steps = 20
  const stepDuration = duration / steps
  let currentStep = 0
  
  const animate = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(animate)
      return
    }
    
    currentStep++
    const progress = currentStep / steps
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    const currentOpacity = startOpacity + deltaOpacity * easeProgress
    
    mainWindow.setOpacity(currentOpacity)
    
    if (currentStep >= steps) {
      clearInterval(animate)
      if (callback) callback()
    }
  }, stepDuration)
}

function hideToIndicator() {
  if (!mainWindow || mainWindow.isDestroyed() || isHidden) return
  
  // 获取窗口当前位置
  const bounds = mainWindow.getBounds()
  
  // 获取窗口所在的屏幕（支持多屏）
  const display = screen.getDisplayNearestPoint({
    x: Math.round(bounds.x + bounds.width / 2),
    y: Math.round(bounds.y + bounds.height / 2)
  })
  const { width: screenWidth, height: screenHeight } = display.workAreaSize
  const workArea = display.workArea
  
  // 计算指示器应该出现的位置
  let indicatorX, indicatorY
  
  if (isIndicatorSnapped) {
    // 指示器吸附到边缘时，直接使用记录的位置
    indicatorX = indicatorPosition.x
    indicatorY = indicatorPosition.y
  } else {
    // 指示器未吸附时，在窗口正中间
    indicatorX = bounds.x + bounds.width / 2 - INDICATOR_SIZE / 2
    indicatorY = bounds.y + bounds.height / 2 - INDICATOR_SIZE / 2
  }
  
  // 确保指示器不超出当前屏幕边界（使用 workArea 考虑任务栏）
  indicatorX = Math.max(workArea.x + 10, Math.min(indicatorX, workArea.x + screenWidth - INDICATOR_SIZE - 10))
  indicatorY = Math.max(workArea.y + 10, Math.min(indicatorY, workArea.y + screenHeight - INDICATOR_SIZE - 10))
  
  // 更新指示器位置
  indicatorPosition = { x: Math.round(indicatorX), y: Math.round(indicatorY) }
  
  // 淡出主窗口
  animateMainWindow(0, 250, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide()
    }
  })
  
  isHidden = true
  
  // 延迟显示指示器，等主窗口淡出
  setTimeout(() => {
    showIndicator()
  }, 150)
  
  console.log(`窗口已隐藏，显示指示器在 (${indicatorPosition.x}, ${indicatorPosition.y}), 吸附: ${isIndicatorSnapped}, 屏幕: ${display.id}`)
}

function showFromIndicator() {
  if (!mainWindow || mainWindow.isDestroyed() || !isHidden) return
  
  // 隐藏指示器
  hideIndicator()
  
  // 获取指示器所在的屏幕（支持多屏）
  const display = screen.getDisplayNearestPoint({
    x: Math.round(indicatorPosition.x + INDICATOR_SIZE / 2),
    y: Math.round(indicatorPosition.y + INDICATOR_SIZE / 2)
  })
  const { width: screenWidth, height: screenHeight } = display.workAreaSize
  const workArea = display.workArea
  const bounds = mainWindow.getBounds()
  
  // 窗口在指示器正中间展开
  const targetX = indicatorPosition.x + INDICATOR_SIZE / 2 - bounds.width / 2
  const targetY = indicatorPosition.y + INDICATOR_SIZE / 2 - bounds.height / 2
  
  // 确保窗口不超出当前屏幕边界（使用 workArea 考虑任务栏）
  const finalX = Math.max(workArea.x, Math.min(targetX, workArea.x + screenWidth - bounds.width))
  const finalY = Math.max(workArea.y, Math.min(targetY, workArea.y + screenHeight - bounds.height))
  
  // 设置窗口位置
  mainWindow.setPosition(Math.round(finalX), Math.round(finalY))
  
  // 显示主窗口（使用保存的透明度）
  mainWindow.setOpacity(0)
  mainWindow.show()
  mainWindow.focus()
  
  // 淡入主窗口到用户设置的透明度
  animateMainWindow(userOpacity, 300)
  
  isHidden = false
  
  console.log(`窗口已从指示器恢复，位置: (${finalX}, ${finalY}), 透明度: ${userOpacity}, 屏幕: ${display.id}`)
}

ipcMain.on('window-minimize', () => {
  console.log('收到 window-minimize 事件')
  hideToIndicator()
})

ipcMain.on('window-close', () => {
  console.log('收到 window-close 事件')
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
})

ipcMain.on('set-position', (event, { x, y }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setPosition(x, y)
  }
})

ipcMain.handle('get-bounds', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.getBounds()
  }
  return null
})

ipcMain.handle('get-attached-edge', () => {
  return attachedEdge
})

ipcMain.on('resize-window', (event, { width }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  
  const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
  const [currentX, currentY] = mainWindow.getPosition()
  
  // 获取窗口所在的屏幕（支持多屏）
  const display = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
  const workArea = display.workArea
  const screenWidth = display.workAreaSize.width
  
  mainWindow.setSize(clampedWidth, mainWindow.getBounds().height)
  
  if (!isHidden) {
    if (attachedEdge === 'left') {
      mainWindow.setPosition(workArea.x, currentY)
    } else {
      mainWindow.setPosition(workArea.x + screenWidth - clampedWidth, currentY)
    }
  }
})

ipcMain.on('show-window', () => {
  console.log('收到 show-window 事件')
  showFromIndicator()
})

ipcMain.on('hide-window', () => {
  console.log('收到 hide-window 事件')
  hideToIndicator()
})

// 从指示器窗口恢复主窗口
ipcMain.on('show-main-window', () => {
  console.log('从指示器恢复主窗口')
  showFromIndicator()
})

// 指示器拖动：setBounds 固定宽高（兼容 125%/150% 缩放）；位置对齐 screen.getCursorScreenPoint + workArea
let indicatorDragGrab = { x: 0, y: 0 }
let indicatorDragStartCursor = { x: 0, y: 0 }
let indicatorDragPassedSlop = false
let indicatorDragLastCursorSample = { x: 0, y: 0 }
let indicatorDragFixedSize = { width: INDICATOR_SIZE, height: INDICATOR_SIZE }

ipcMain.on('start-drag', (event) => {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) return
  
  isIndicatorDragging = true
  indicatorDragPassedSlop = false
  const b = indicatorWindow.getBounds()
  indicatorDragFixedSize = { width: b.width, height: b.height }
  const p = screen.getCursorScreenPoint()
  indicatorDragStartCursor.x = p.x
  indicatorDragStartCursor.y = p.y
  indicatorDragLastCursorSample.x = p.x
  indicatorDragLastCursorSample.y = p.y
  indicatorDragGrab.x = p.x - b.x
  indicatorDragGrab.y = p.y - b.y
  console.log(`指示器开始拖动 bounds (${b.x},${b.y},${b.width},${b.height}) 光标 (${p.x},${p.y})`)
})

ipcMain.on('move-window', () => {
  if (!isIndicatorDragging || !indicatorWindow || indicatorWindow.isDestroyed()) return
  
  const p = screen.getCursorScreenPoint()
  if (!indicatorDragPassedSlop) {
    const dx = p.x - indicatorDragStartCursor.x
    const dy = p.y - indicatorDragStartCursor.y
    if (Math.abs(dx) <= INDICATOR_DRAG_SLOP_PX && Math.abs(dy) <= INDICATOR_DRAG_SLOP_PX) return
    indicatorDragPassedSlop = true
  }

  if (p.x === indicatorDragLastCursorSample.x && p.y === indicatorDragLastCursorSample.y) return
  
  let newX = p.x - indicatorDragGrab.x
  let newY = p.y - indicatorDragGrab.y
  
  const display = screen.getDisplayNearestPoint({ x: p.x, y: p.y })
  const { width: fw, height: fh } = indicatorDragFixedSize
  const { x: rx, y: ry } = clampIndicatorToWorkArea(newX, newY, display, fw, fh)
  
  const b = indicatorWindow.getBounds()
  if (rx === b.x && ry === b.y) {
    indicatorDragLastCursorSample.x = p.x
    indicatorDragLastCursorSample.y = p.y
    return
  }

  applyIndicatorBounds(rx, ry, fw, fh)
  indicatorDragLastCursorSample.x = p.x
  indicatorDragLastCursorSample.y = p.y
})

ipcMain.on('end-drag', () => {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) return
  
  const wasDrag = indicatorDragPassedSlop
  isIndicatorDragging = false
  indicatorDragPassedSlop = false
  
  if (!wasDrag) {
    showFromIndicator()
    return
  }
  
  const b = indicatorWindow.getBounds()
  const currentX = b.x
  const currentY = b.y
  const fw = b.width
  const fh = b.height
  
  const display = screen.getDisplayNearestPoint({
    x: Math.round(currentX + fw / 2),
    y: Math.round(currentY + fh / 2)
  })
  const wa = display.workArea
  
  let targetX = currentX
  let targetY = currentY
  let isSnapped = false
  let snappedEdge = attachedEdge // 默认保持原边缘
  
  // 检查水平边缘（左右）
  if (currentX < wa.x + EDGE_SNAP_THRESHOLD) {
    targetX = wa.x + 10
    snappedEdge = 'left'
    isSnapped = true
  } else if (currentX > wa.x + wa.width - fw - EDGE_SNAP_THRESHOLD) {
    targetX = wa.x + wa.width - fw - 10
    snappedEdge = 'right'
    isSnapped = true
  }
  
  // 检查垂直边缘（上下）
  if (currentY < wa.y + EDGE_SNAP_THRESHOLD) {
    targetY = wa.y + 10
    snappedEdge = 'top'
    isSnapped = true
  } else if (currentY > wa.y + wa.height - fh - EDGE_SNAP_THRESHOLD) {
    targetY = wa.y + wa.height - fh - 10
    snappedEdge = 'bottom'
    isSnapped = true
  }
  
  // 更新 attachedEdge 和吸附状态
  attachedEdge = snappedEdge
  isIndicatorSnapped = isSnapped
  
  const snapped = clampIndicatorToWorkArea(targetX, targetY, display, fw, fh)
  targetX = snapped.x
  targetY = snapped.y
  
  if (isSnapped) {
    animateIndicatorPosition(currentX, currentY, targetX, targetY, fw, fh, 300)
    indicatorPosition = { x: targetX, y: targetY }
    console.log(`指示器吸附到边缘，位置: (${targetX}, ${targetY}), 边缘: ${attachedEdge}`)
  } else {
    indicatorPosition = { x: currentX, y: currentY }
    console.log(`指示器拖动结束，位置: (${currentX}, ${currentY}), 无吸附`)
  }
})

// 兼容旧版调用（不再使用）
ipcMain.on('indicator-start-drag', () => {
  // 已废弃，使用新的 start-drag
})

ipcMain.on('indicator-get-cursor-position', () => {
  // 已废弃
})

ipcMain.on('indicator-end-drag', () => {
  // 已废弃，使用新的 end-drag
})

function animateIndicatorPosition(startX, startY, targetX, targetY, width, height, duration = 300) {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) return
  
  const steps = 20
  const stepDuration = duration / steps
  const deltaX = targetX - startX
  const deltaY = targetY - startY
  let currentStep = 0
  const w = Math.round(width)
  const h = Math.round(height)
  
  const animate = setInterval(() => {
    if (!indicatorWindow || indicatorWindow.isDestroyed()) {
      clearInterval(animate)
      return
    }
    
    currentStep++
    const progress = currentStep / steps
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    const newX = Math.round(startX + deltaX * easeProgress)
    const newY = Math.round(startY + deltaY * easeProgress)
    
    applyIndicatorBounds(newX, newY, w, h)
    
    if (currentStep >= steps) {
      clearInterval(animate)
    }
  }, stepDuration)
}

ipcMain.on('update-task-count', (event, count) => {
  console.log(`任务数量更新: ${count}`)
  updateTaskCount(count)
})

// 设置窗口透明度
ipcMain.on('set-opacity', (event, opacity) => {
  console.log(`设置窗口透明度: ${opacity}`)
  userOpacity = opacity  // 保存用户设置的透明度
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setOpacity(opacity)
  }
})

// 获取指示器位置
ipcMain.handle('get-indicator-position', () => {
  return indicatorPosition
})

// 设置指示器位置（从窗口模式同步到指示器）
ipcMain.on('set-indicator-position', (event, position) => {
  indicatorPosition = position
  console.log(`指示器位置已更新: (${position.x}, ${position.y})`)
})
