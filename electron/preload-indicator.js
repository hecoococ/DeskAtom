const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showMainWindow: () => ipcRenderer.send('show-main-window'),
  
  // 新的拖动 API
  startDrag: () => ipcRenderer.send('start-drag'),
  moveWindow: () => ipcRenderer.send('move-window'),
  endDrag: () => ipcRenderer.send('end-drag'),
  
  onUpdateBadge: (callback) => {
    ipcRenderer.on('update-badge', (event, count) => callback(count))
  }
})
