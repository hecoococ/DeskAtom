<template>
  <div class="edge-detector"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

let lastCheckTime = 0
const CHECK_INTERVAL = 100

const checkMousePosition = async (e) => {
  const now = Date.now()
  if (now - lastCheckTime < CHECK_INTERVAL) return
  lastCheckTime = now
  
  if (!window.electronAPI) return
  
  try {
    const bounds = await window.electronAPI.getWindowBounds()
    if (!bounds) return
    
    const displayWidth = window.screen.width
    const mouseX = e.screenX
    const edgeThreshold = 30
    
    const nearLeftEdge = mouseX <= edgeThreshold
    const nearRightEdge = mouseX >= displayWidth - edgeThreshold
    
    if (nearLeftEdge || nearRightEdge) {
      window.electronAPI.showWindow()
    }
  } catch (error) {
    console.error('检测鼠标位置失败:', error)
  }
}

onMounted(() => {
  document.addEventListener('mousemove', checkMousePosition)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', checkMousePosition)
})
</script>

<style scoped>
.edge-detector {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  cursor: pointer;
  pointer-events: none;
}
</style>
