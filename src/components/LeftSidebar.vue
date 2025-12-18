<template>
  <div class="left-sidebar">
    <!-- Task Management Panel -->
    <div class="sidebar-section">
      <h3 class="section-title">任务管理</h3>
      <div class="task-list">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id" 
          class="task-item"
          :class="{ active: selectedTaskId === task.id }"
          @click="selectTask(task)"
        >
          <div class="task-name">{{ task.name }}</div>
          <div class="task-meta">
            {{ task.cluster }} • {{ getStatusText(task.status) }}
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${task.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Details Panel -->
    <div v-if="selectedTask" class="sidebar-section task-details">
      <h3 class="section-title">任务详情</h3>
      <div class="task-detail-content">
        <div class="detail-row">
          <span class="detail-label">任务名称:</span>
          <span class="detail-value">{{ selectedTask.name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">集群:</span>
          <span class="detail-value">{{ selectedTask.cluster }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">状态:</span>
          <span class="detail-value" :class="`status-${selectedTask.status}`">
            {{ getStatusText(selectedTask.status) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">进度:</span>
          <span class="detail-value">{{ selectedTask.progress }}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">开始时间:</span>
          <span class="detail-value">{{ formatStartTime(selectedTask.startTime) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">运行时长:</span>
          <span class="detail-value">{{ calculateDuration(selectedTask.startTime) }}</span>
        </div>
      </div>
    </div>

    <!-- Alert Records -->
    <div class="sidebar-section">
      <h3 class="section-title">异常告警</h3>
      <div class="alert-list">
        <div 
          v-for="alert in recentAlerts" 
          :key="alert.id" 
          class="alert-item"
        >
          <div class="alert-time">
            {{ formatTime(alert.timestamp) }}
          </div>
          <div class="alert-message">
            {{ alert.source }}: {{ alert.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task, Alert } from '../services/dataService'

const props = defineProps<{
  tasks: Task[]
  alerts: Alert[]
  searchFilter: string
}>()

const emit = defineEmits<{
  selectTask: [task: Task]
}>()

const selectedTaskId = ref<string | null>(null)
const selectedTask = ref<Task | null>(null)

const filteredTasks = computed(() => {
  if (!props.searchFilter) return props.tasks
  
  const filter = props.searchFilter.toLowerCase()
  return props.tasks.filter(task => 
    task.name.toLowerCase().includes(filter) ||
    task.cluster.toLowerCase().includes(filter) ||
    task.status.toLowerCase().includes(filter)
  )
})

const recentAlerts = computed(() => {
  return props.alerts.slice(0, 10)
})

const selectTask = (task: Task) => {
  selectedTaskId.value = task.id
  selectedTask.value = task
  emit('selectTask', task)
}

const getStatusText = (status: Task['status']) => {
  const statusMap = {
    queued: '排队中',
    running: '运行中',
    failed: '失败',
    completed: '已完成'
  }
  return statusMap[status] || status
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

const formatStartTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', { 
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

const calculateDuration = (startTime: number) => {
  const now = Date.now()
  const duration = now - startTime
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((duration % (1000 * 60)) / 1000)
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}
</script>

<style scoped>
.left-sidebar {
  background-color: var(--secondary-bg);
  border-right: 1px solid var(--border-color);
  padding: 16px;
  overflow-y: auto;
  height: 100%;
}

.sidebar-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  background-color: var(--primary-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.task-item:hover {
  border-color: var(--accent-blue);
  transform: translateY(-1px);
}

.task-item.active {
  border-color: var(--accent-blue);
  background-color: rgba(0, 212, 255, 0.1);
}

.task-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.task-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--success-green);
  transition: width 0.3s ease;
}

.task-details {
  background-color: var(--primary-bg);
  border-radius: 6px;
  padding: 16px;
}

.task-detail-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
}

.status-queued {
  color: var(--warning-yellow);
}

.status-running {
  color: var(--accent-blue);
}

.status-failed {
  color: var(--error-red);
}

.status-completed {
  color: var(--success-green);
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-item {
  background-color: var(--primary-bg);
  border-left: 3px solid var(--error-red);
  border-radius: 4px;
  padding: 8px 12px;
}

.alert-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.alert-message {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.4;
}
</style>
