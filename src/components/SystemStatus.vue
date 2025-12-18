<template>
  <div class="system-status">
    <h3 class="section-title">系统状态监控</h3>
    
    <!-- Core Metrics -->
    <div class="metrics-grid">
      <div 
        class="metric-card" 
        :class="{ selected: selectedMetric === 'cpu' }"
        @click="selectMetric('cpu')"
      >
        <div class="metric-title">CPU 使用率</div>
        <div class="metric-value">{{ aggregatedMetrics.cpu.toFixed(1) }}%</div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.cpu) }">
          {{ getChangeText(aggregatedMetrics.cpu) }}
        </div>
      </div>
      
      <div 
        class="metric-card"
        :class="{ selected: selectedMetric === 'memory' }"
        @click="selectMetric('memory')"
      >
        <div class="metric-title">内存使用率</div>
        <div class="metric-value">{{ aggregatedMetrics.memory.toFixed(1) }}%</div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.memory) }">
          {{ getChangeText(aggregatedMetrics.memory) }}
        </div>
      </div>
      
      <div 
        class="metric-card"
        :class="{ selected: selectedMetric === 'disk' }"
        @click="selectMetric('disk')"
      >
        <div class="metric-title">磁盘使用率</div>
        <div class="metric-value">{{ aggregatedMetrics.disk.toFixed(1) }}%</div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.disk) }">
          {{ getChangeText(aggregatedMetrics.disk) }}
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">网络 I/O</div>
        <div class="metric-value">{{ formatBytes(aggregatedMetrics.networkIn + aggregatedMetrics.networkOut) }}/s</div>
        <div class="metric-change" style="color: var(--text-secondary);">
          入: {{ formatBytes(aggregatedMetrics.networkIn) }}/s
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">平均负载</div>
        <div class="metric-value">{{ aggregatedMetrics.load1m.toFixed(2) }}</div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.load1m * 10) }">
          {{ getLoadText(aggregatedMetrics.load1m) }}
        </div>
      </div>
    </div>
    
    <!-- Health Indicators -->
    <div style="display: flex; gap: 15px; margin-top: 20px;">
      <div class="health-indicator">
        <div 
          class="health-dot" 
          :class="getHealthClass(healthStatus.overall)"
        ></div>
        <div class="health-text">{{ healthStatus.message }}</div>
      </div>
      
      <div class="health-indicator">
        <div 
          class="health-dot" 
          :class="loadBalanceStatus.status === 'balanced' ? '' : 'warning'"
        ></div>
        <div class="health-text">{{ loadBalanceStatus.message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SystemMetrics } from '../services/dataService'
import { setSelectedMetric, getSelectedMetric, type MetricType } from '../services/systemState'

const props = defineProps<{
  aggregatedMetrics: SystemMetrics
  healthStatus: { overall: 'healthy' | 'warning' | 'error'; message: string }
  loadBalanceStatus: { status: 'balanced' | 'skewed'; message: string }
}>()

const selectedMetric = computed(() => getSelectedMetric())

const selectMetric = (metric: MetricType) => {
  setSelectedMetric(metric)
}

const getChangeColor = (value: number) => {
  if (value > 85) return 'var(--error-red)'
  if (value > 70) return 'var(--warning-yellow)'
  return 'var(--success-green)'
}

const getChangeText = (value: number) => {
  if (value > 85) return '危险阈值'
  if (value > 70) return '警告阈值'
  return '正常范围'
}

const getLoadText = (value: number) => {
  if (value > 5) return '负载过高'
  if (value > 3) return '负载较高'
  return '负载正常'
}

const getHealthClass = (status: 'healthy' | 'warning' | 'error') => {
  if (status === 'error') return 'error'
  if (status === 'warning') return 'warning'
  return ''
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.metric-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 212, 255, 0.1);
}

.metric-card.selected {
  border: 2px solid var(--accent-blue);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
}
</style>
