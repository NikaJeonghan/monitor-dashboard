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
</script>
