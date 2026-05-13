<template>
  <transition name="modal">
    <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
      <div class="modal-content" :class="{ 'dark-mode': darkMode }" @click.stop>
        <div class="modal-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="modal-icon">
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>确认删除</h3>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button @click="$emit('cancel')" class="btn btn-secondary">取消</button>
          <button @click="$emit('confirm')" class="btn btn-danger">确定</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: '确定删除此任务？'
  },
  darkMode: {
    type: Boolean,
    default: false
  }
})

defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-icon {
  color: #ef4444;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-body {
  margin-bottom: 24px;
}

.modal-body p {
  margin: 0;
  color: #6b7280;
  font-size: 15px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 暗夜模式 */
.modal-content.dark-mode {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-content.dark-mode .modal-header h3 {
  color: #f1f5f9;
}

.modal-content.dark-mode .modal-body p {
  color: #94a3b8;
}

.modal-content.dark-mode .btn-secondary {
  background: #475569;
  color: #cbd5e1;
}

.modal-content.dark-mode .btn-secondary:hover {
  background: #64748b;
}

.modal-content.dark-mode .btn-danger {
  background: #dc2626;
}

.modal-content.dark-mode .btn-danger:hover {
  background: #b91c1c;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>
