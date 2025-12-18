<template>
  <div class="app-container">
    <!-- Top Control Bar -->
    <TopControlBar 
      @toggle-data-stream="toggleDataStream"
      @refresh-data="refreshData"
      @search="onSearch"
      @toggle-theme="toggleTheme"
    />
    
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Sidebar -->
      <LeftSidebar 
        :tasks="tasks"
        :alerts="alerts"
        :search-filter="searchFilter"
        @select-task="onSelectTask"
      />
      
      <!-- Right Content Area -->
      <div class="right-content">
        <!-- System Status Area -->
        <SystemStatus 
          :aggregated-metrics="aggregatedMetrics"
          :health-status="healthStatus"
          :load-balance-status="loadBalanceStatus"
        />
        
        <!-- Visualization Area -->
        <VisualizationArea :servers="servers" />
      </div>

    <!-- Debug Info -->
    <div v-if="isRunning" style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,255,0,0.8); color: white; padding: 5px; border-radius: 3px; font-size: 12px;">
      数据更新中...
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TopControlBar from './components/TopControlBar.vue'
import LeftSidebar from './components/LeftSidebar.vue'
import SystemStatus from './components/SystemStatus.vue'
import VisualizationArea from './components/VisualizationArea.vue'
import { dataService, type Task } from './services/dataService'
import { systemState } from './services/systemState'

// State management
const searchFilter = ref('')
const selectedTask = ref<Task | null>(null)

// Data from service
const servers = computed(() => dataService.getServers())
const tasks = computed(() => dataService.getTasks(searchFilter.value))
const alerts = computed(() => dataService.getAlerts())
const aggregatedMetrics = computed(() => dataService.getAggregatedMetrics())
const healthStatus = computed(() => dataService.getHealthStatus())
const loadBalanceStatus = computed(() => dataService.getLoadBalanceStatus())

// Methods
const toggleDataStream = () => {
  // 只发送事件，实际状态管理在 dataService 中处理
}

const refreshData = () => {
  dataService.refreshData()
}

const onSearch = (query: string) => {
  searchFilter.value = query
}

const onSelectTask = (task: Task) => {
  selectedTask.value = task
  console.log('Selected task:', task)
}

const toggleTheme = () => {
  // Simple theme toggle between dark and light
  const root = document.documentElement
  const currentBg = root.style.getPropertyValue('--primary-bg')
  
  if (currentBg === '#0a0e27' || !currentBg) {
    // Switch to light theme
    root.style.setProperty('--primary-bg', '#ffffff')
    root.style.setProperty('--secondary-bg', '#f5f5f5')
    root.style.setProperty('--accent-blue', '#0066cc')
    root.style.setProperty('--success-green', '#28a745')
    root.style.setProperty('--warning-yellow', '#ffc107')
    root.style.setProperty('--error-red', '#dc3545')
    root.style.setProperty('--text-primary', '#212529')
    root.style.setProperty('--text-secondary', '#6c757d')
    root.style.setProperty('--border-color', '#dee2e6')
  } else {
    // Switch back to dark theme
    root.style.setProperty('--primary-bg', '#0a0e27')
    root.style.setProperty('--secondary-bg', '#1a1d3e')
    root.style.setProperty('--accent-blue', '#00d4ff')
    root.style.setProperty('--success-green', '#00ff88')
    root.style.setProperty('--warning-yellow', '#ffb800')
    root.style.setProperty('--error-red', '#ff4757')
    root.style.setProperty('--text-primary', '#e6eef9')
    root.style.setProperty('--text-secondary', '#9aa5b1')
    root.style.setProperty('--border-color', '#2a2f55')
  }
}

const isRunning = computed(() => systemState.value.running)

const startDataUpdates = () => {
  dataService.startAutoUpdate()
}

const stopDataUpdates = () => {
  dataService.stopAutoUpdate()
}

// Lifecycle
onMounted(() => {
  // Initialize data
  dataService.updateData()
  
  // Start real-time updates
  startDataUpdates()
})

onUnmounted(() => {
  stopDataUpdates()
})
</script>
