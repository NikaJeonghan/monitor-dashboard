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
import { systemState, setRunning } from './services/systemState'

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
  // 切换数据流状态
  if (systemState.value.running) {
    dataService.stopAutoUpdate()
    setRunning(false)
    console.log('数据流已暂停')
  } else {
    dataService.startAutoUpdate()
    setRunning(true)
    console.log('数据流已启动')
  }
}

const refreshData = () => {
  dataService.refreshData()
  console.log('数据已刷新')
}

const onSearch = (query: string) => {
  searchFilter.value = query
  console.log('搜索:', query)
}

const onSelectTask = (task: Task) => {
  selectedTask.value = task
  console.log('Selected task:', task)
}

const toggleTheme = () => {
  // 增强对比度的主题切换
  const root = document.documentElement
  const currentBg = root.style.getPropertyValue('--primary-bg')
  
  if (currentBg === '#0a0e27' || !currentBg) {
    // Switch to light theme - 增强对比度
    root.style.setProperty('--primary-bg', '#ffffff')
    root.style.setProperty('--secondary-bg', '#f8f9fa')
    root.style.setProperty('--accent-blue', '#0056b3')
    root.style.setProperty('--success-green', '#1e7e34')
    root.style.setProperty('--warning-yellow', '#d39e00')
    root.style.setProperty('--error-red', '#bd2130')
    root.style.setProperty('--text-primary', '#212529')
    root.style.setProperty('--text-secondary', '#6c757d')
    root.style.setProperty('--border-color', '#ced4da')
  } else {
    // Switch back to dark theme - 增强对比度
    root.style.setProperty('--primary-bg', '#0a0e27')
    root.style.setProperty('--secondary-bg', '#1a1d3e')
    root.style.setProperty('--accent-blue', '#1e90ff')
    root.style.setProperty('--success-green', '#32cd32')
    root.style.setProperty('--warning-yellow', '#ffa500')
    root.style.setProperty('--error-red', '#ff4444')
    root.style.setProperty('--text-primary', '#f0f0f0')
    root.style.setProperty('--text-secondary', '#b0b0b0')
    root.style.setProperty('--border-color', '#444466')
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

<style>
/* Global styles */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--primary-bg);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* CSS Variables for theming */
:root {
  --primary-bg: #0a0e27;
  --secondary-bg: #1a1d3e;
  --accent-blue: #1e90ff;
  --success-green: #32cd32;
  --warning-yellow: #ffa500;
  --error-red: #ff4444;
  --text-primary: #f0f0f0;
  --text-secondary: #b0b0b0;
  --border-color: #444466;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--primary-bg);
  color: var(--text-primary);
}

button, select, input {
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

button:hover, select:hover {
  border-color: var(--accent-blue);
}

button:focus, select:focus, input:focus {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}
</style>
