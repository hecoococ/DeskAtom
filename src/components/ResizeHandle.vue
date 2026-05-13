<template>
  <div 
    class="resize-handle"
    :class="{ 'left-edge': attachedEdge === 'left' }"
    @mousedown="startResize"
  ></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const attachedEdge = ref('right')

let isResizing = false
let startX = 0
let startWidth = 0

onMounted(async () => {
  if (window.electronAPI && window.electronAPI.getAttachedEdge) {
    attachedEdge.value = await window.electronAPI.getAttachedEdge()
  }
})

const startResize = (e) => {
  isResizing = true
  startX = e.screenX
  startWidth = window.innerWidth
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  e.preventDefault()
}

const handleResize = (e) => {
  if (!isResizing) return
  
  let deltaX
  if (attachedEdge.value === 'left') {
    deltaX = e.screenX - startX
  } else {
    deltaX = startX - e.screenX
  }
  
  const newWidth = startWidth + deltaX
  const clampedWidth = Math.max(300, Math.min(600, newWidth))
  
  if (window.electronAPI) {
    window.electronAPI.resizeWindow(clampedWidth)
  }
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.resize-handle {
  position: fixed;
  top: 48px;
  left: 0;
  width: 6px;
  height: calc(100vh - 48px);
  cursor: ew-resize;
  background: transparent;
  z-index: 1000;
  transition: background 0.2s ease;
}

.resize-handle.left-edge {
  left: auto;
  right: 0;
}

.resize-handle:hover {
  background: rgba(255, 140, 66, 0.3);
}

.resize-handle:active {
  background: rgba(255, 140, 66, 0.5);
}
</style>
