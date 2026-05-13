<template>
  <div class="task-item task-card" :class="[{ completed: task.completed }]">
    <div class="task-content">
      <button
        @click="$emit('toggle', task.id)"
        :class="['status-btn', task.completed ? 'completed' : 'pending']"
      >
        <span class="status-icon">{{ task.completed ? '✓' : '●' }}</span>
        {{ task.completed ? '完成' : '未完成' }}
      </button>
      <template v-if="!isEditing">
        <span class="task-text">{{ task.text }}</span>
      </template>
      <template v-else>
        <input
          v-model="editText"
          @keyup.enter="saveEdit"
          @keyup.esc="cancelEdit"
          class="edit-input"
          ref="editInputRef"
        />
      </template>
    </div>
    <div class="action-btns">
      <template v-if="!isEditing">
        <button
          @click="startEdit"
          class="edit-btn"
          title="编辑任务"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          @click="$emit('delete', task.id)"
          class="delete-btn"
          title="删除任务"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </template>
      <template v-else>
        <button
          @click="cancelEdit"
          class="cancel-btn"
          title="取消"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          @click="saveEdit"
          class="save-btn"
          title="保存"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['toggle', 'delete', 'update'])

const isEditing = ref(false)
const editText = ref('')
const editInputRef = ref(null)

const startEdit = () => {
  editText.value = props.task.text
  isEditing.value = true
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

const cancelEdit = () => {
  isEditing.value = false
  editText.value = ''
}

const saveEdit = () => {
  if (editText.value.trim()) {
    emit('update', { id: props.task.id, text: editText.value.trim() })
    isEditing.value = false
    editText.value = ''
  }
}
</script>

<style scoped>
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
}

.task-card:hover {
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  border-color: var(--theme-color, #ff8c42);
}

.task-card.completed {
  opacity: 0.7;
  background: #f8fafc;
}

.task-card.completed:hover {
  opacity: 0.9;
}

.task-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.status-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  gap: 4px;
  position: relative;
  overflow: hidden;
  transform-origin: center;
  flex-shrink: 0;
  white-space: nowrap;
}

.status-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.status-btn:active::before {
  width: 200px;
  height: 200px;
}

.status-btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-btn:active {
  transform: translateY(0) scale(0.98);
}

.status-btn.completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.25) 100%);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

.status-btn.completed:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.35) 100%);
  opacity: 1;
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
  transform: translateY(-1px);
}

.status-btn.pending {
  background: linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(107, 114, 128, 0.2) 100%);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
  box-shadow: 0 2px 4px rgba(107, 114, 128, 0.05);
}

.status-btn.pending:hover {
  background: linear-gradient(135deg, rgba(107, 114, 128, 0.2) 0%, rgba(107, 114, 128, 0.3) 100%);
  opacity: 1;
  box-shadow: 0 4px 8px rgba(107, 114, 128, 0.1);
  transform: translateY(-1px);
}

.status-icon {
  margin-right: 6px;
  font-size: 14px;
  line-height: 1;
}

.task-text {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
  font-size: 15px;
  color: #0f172a;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card.completed .task-text {
  color: #94a3b8;
  text-decoration: line-through;
}

.edit-input {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  font-size: 15px;
  border: none;
  border-radius: 8px;
  outline: none;
  background: #f8fafc;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-input:focus {
  background: #fff;
}

.action-btns {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.edit-btn,
.cancel-btn,
.save-btn,
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0.7;
}

.task-card:hover .edit-btn,
.task-card:hover .delete-btn {
  opacity: 1;
}

.edit-btn {
  color: #3b82f6;
}

.edit-btn:hover {
  background: #dbeafe;
  transform: scale(1.1);
}

.edit-btn:active {
  transform: scale(0.95);
  background: #bfdbfe;
}

.delete-btn {
  color: #ef4444;
}

.delete-btn:hover {
  background: #fee2e2;
  transform: scale(1.1);
}

.delete-btn:active {
  transform: scale(0.95);
  background: #fecaca;
}

.cancel-btn {
  color: #6b7280;
  opacity: 1;
}

.cancel-btn:hover {
  background: #f3f4f6;
  transform: scale(1.1);
}

.cancel-btn:active {
  transform: scale(0.95);
  background: #e5e7eb;
}

.save-btn {
  color: #10b981;
  opacity: 1;
}

.save-btn:hover {
  background: #d1fae5;
  transform: scale(1.1);
}

.save-btn:active {
  transform: scale(0.95);
  background: #a7f3d0;
}

@media (max-width: 640px) {
  .task-card {
    padding: 12px;
    gap: 8px;
  }

  .task-content {
    gap: 8px;
    min-width: 0;
  }

  .status-btn {
    padding: 6px 10px;
    min-width: 60px;
    font-size: 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .status-icon {
    margin-right: 4px;
    font-size: 12px;
  }

  .task-text {
    font-size: 14px;
    min-width: 0;
    flex-shrink: 1;
  }

  .edit-input {
    font-size: 14px;
    padding: 6px 10px;
    min-width: 0;
  }

  .action-btns {
    gap: 4px;
    flex-shrink: 0;
  }

  .delete-btn,
  .edit-btn {
    opacity: 1;
  }

  .cancel-btn,
  .save-btn {
    opacity: 1;
  }

  .edit-btn,
  .cancel-btn,
  .save-btn,
  .delete-btn {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }
}
</style>
