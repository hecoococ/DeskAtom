const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  showWindow: () => ipcRenderer.send('show-window'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  
  setWindowPosition: (x, y) => ipcRenderer.send('set-position', { x, y }),
  getWindowBounds: () => ipcRenderer.invoke('get-bounds'),
  getAttachedEdge: () => ipcRenderer.invoke('get-attached-edge'),
  resizeWindow: (width) => ipcRenderer.send('resize-window', { width }),
  
  updateTaskCount: (count) => ipcRenderer.send('update-task-count', count),
  onTaskCountUpdate: (callback) => {
    ipcRenderer.on('task-count-update', (event, count) => callback(count))
  },
  
  // 设置窗口透明度
  setOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity),
  
  // 位置同步
  getIndicatorPosition: () => ipcRenderer.invoke('get-indicator-position'),
  setIndicatorPosition: (position) => ipcRenderer.send('set-indicator-position', position),

  // 阿里云语音识别
  voiceConfig: (config) => ipcRenderer.invoke('voice-config', config),
  voiceStart: () => ipcRenderer.invoke('voice-start'),
  voiceStop: () => ipcRenderer.invoke('voice-stop'),
  voiceStatus: () => ipcRenderer.invoke('voice-status'),
  voiceSendAudio: (audioData) => ipcRenderer.send('voice-send-audio', audioData),
  getVoiceToken: (config) => ipcRenderer.invoke('get-voice-token', config),
  onVoiceStarted: (callback) => ipcRenderer.on('voice-started', () => callback()),
  onVoiceChanged: (callback) => ipcRenderer.on('voice-changed', (event, msg) => callback(msg)),
  onVoiceSentenceEnd: (callback) => ipcRenderer.on('voice-sentence-end', (event, msg) => callback(msg)),
  onVoiceCompleted: (callback) => ipcRenderer.on('voice-completed', (event, msg) => callback(msg)),
  onVoiceClosed: (callback) => ipcRenderer.on('voice-closed', () => callback()),
  onVoiceError: (callback) => ipcRenderer.on('voice-error', (event, msg) => callback(msg)),

  // 测试页面
  openTestPage: () => ipcRenderer.invoke('open-test-page')
})
