<template>
  <div class="system-status">
    <div class="status-header">
      <h3 class="section-title">系统状态监控</h3>
      <div class="update-indicator">
        <div class="update-dot" :class="{ active: isUpdating }"></div>
        <span class="update-text">{{ updateStatusText }}</span>
      </div>
    </div>
    
    <!-- Error State -->
    <div class="error-state" v-if="hasError">
      <div class="error-icon">⚠️</div>
      <div class="error-message">数据加载失败，请检查网络连接或稍后重试</div>
      <button class="retry-button" @click="handleRetry">重新加载</button>
    </div>
    
    <!-- Core Metrics -->
    <div class="metrics-grid" v-else-if="!hasError && !isEmpty">
      <div 
        class="metric-card" 
        :class="{ selected: selectedMetric === 'cpu' }"
        @click="selectMetric('cpu')"
        :aria-label="`CPU 使用率 ${aggregatedMetrics.cpu.toFixed(1)}%`"
      >
        <div class="metric-title">CPU 使用率</div>
        <div class="metric-value" :class="getMetricValueClass(aggregatedMetrics.cpu)">
          {{ aggregatedMetrics.cpu.toFixed(1) }}%
        </div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.cpu) }">
          {{ getChangeText(aggregatedMetrics.cpu) }}
        </div>
        <div class="metric-threshold">
          <div class="threshold-bar">
            <div class="threshold-fill warning" :style="{ width: '70%' }"></div>
            <div class="threshold-fill error" :style="{ width: '15%' }"></div>
          </div>
        </div>
      </div>
      
      <div 
        class="metric-card"
        :class="{ selected: selectedMetric === 'memory' }"
        @click="selectMetric('memory')"
      >
        <div class="metric-title">内存使用率</div>
        <div class="metric-value" :class="getMetricValueClass(aggregatedMetrics.memory, 80, 90)">
          {{ aggregatedMetrics.memory.toFixed(1) }}%
        </div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.memory) }">
          {{ getChangeText(aggregatedMetrics.memory) }}
        </div>
        <div class="metric-threshold">
          <div class="threshold-bar">
            <div class="threshold-fill warning" :style="{ width: '80%' }"></div>
            <div class="threshold-fill error" :style="{ width: '10%' }"></div>
          </div>
        </div>
      </div>
      
      <div 
        class="metric-card"
        :class="{ selected: selectedMetric === 'disk' }"
        @click="selectMetric('disk')"
      >
        <div class="metric-title">磁盘使用率</div>
        <div class="metric-value" :class="getMetricValueClass(aggregatedMetrics.disk)">
          {{ aggregatedMetrics.disk.toFixed(1) }}%
        </div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.disk) }">
          {{ getChangeText(aggregatedMetrics.disk) }}
        </div>
        <div class="metric-threshold">
          <div class="threshold-bar">
            <div class="threshold-fill warning" :style="{ width: '80%' }"></div>
            <div class="threshold-fill error" :style="{ width: '10%' }"></div>
          </div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">网络 I/O</div>
        <div class="metric-value">
          {{ formatBytes(aggregatedMetrics.networkIn + aggregatedMetrics.networkOut) }}/s
        </div>
        <div class="metric-breakdown">
          <div class="network-in">入: {{ formatBytes(aggregatedMetrics.networkIn) }}/s</div>
          <div class="network-out">出: {{ formatBytes(aggregatedMetrics.networkOut) }}/s</div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">平均负载</div>
        <div class="metric-value" :class="getMetricValueClass(aggregatedMetrics.load1m * 10, 30, 50)">
          {{ aggregatedMetrics.load1m.toFixed(2) }}
        </div>
        <div class="metric-change" :style="{ color: getChangeColor(aggregatedMetrics.load1m * 10) }">
          {{ getLoadText(aggregatedMetrics.load1m) }}
        </div>
        <div class="metric-threshold">
          <div class="threshold-bar">
            <div class="threshold-fill warning" :style="{ width: '30%' }"></div>
            <div class="threshold-fill error" :style="{ width: '20%' }"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Health Indicators -->
    <div class="health-section">
      <div class="health-indicator">
        <div 
          class="health-dot" 
          :class="getHealthClass(healthStatus.overall)"
        ></div>
        <div class="health-content">
          <div class="health-label">服务健康度</div>
          <div class="health-message">{{ healthStatus.message }}</div>
        </div>
      </div>
      
      <div class="health-indicator">
        <div 
          class="health-dot" 
          :class="loadBalanceStatus.status === 'balanced' ? 'healthy' : 'warning'"
        ></div>
        <div class="health-content">
          <div class="health-label">负载均衡状态</div>
          <div class="health-message">{{ loadBalanceStatus.message }}</div>
        </div>
      </div>
    </div>
    
    <!-- Status Rules Reference -->
    <div class="status-rules">
      <div class="rules-title">健康度规则</div>
      <div class="rules-list">
        <div class="rule-item">
          <span class="rule-dot error"></span>
          <span class="rule-text">CPU > 85% 或 内存 > 90% 或 负载 > 5.0</span>
        </div>
        <div class="rule-item">
          <span class="rule-dot warning"></span>
          <span class="rule-text">CPU > 70% 或 内存 > 80% 或 负载 > 3.0</span>
        </div>
        <div class="rule-item">
          <span class="rule-dot"></span>
          <span class="rule-text">负载均衡: 最大/最小流量比 > 3 视为倾斜</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { SystemMetrics } from '../services/dataService'
import { dataService } from '../services/dataService'
import { setSelectedMetric, getSelectedMetric, type MetricType } from '../services/systemState'

const props = defineProps<{
  aggregatedMetrics: SystemMetrics
  healthStatus: { overall: 'healthy' | 'warning' | 'error'; message: string }
  loadBalanceStatus: { status: 'balanced' | 'skewed'; message: string }
}>()

const selectedMetric = computed(() => getSelectedMetric())
const isUpdating = ref(true)
const updateStatusText = ref('实时更新中')
const hasError = computed(() => !props.aggregatedMetrics || Object.keys(props.aggregatedMetrics).length === 0)
const isEmpty = computed(() => hasError.value)

const handleRetry = () => {
  dataService.refreshData()
}

// 更新状态文本
const updateUpdateStatus = () => {
  const status = dataService.getUpdateStatus()
  isUpdating.value = status.isUpdating
  
  if (status.isUpdating) {
    const timeSinceUpdate = Date.now() - status.lastUpdate
    if (timeSinceUpdate < 3000) {
      updateStatusText.value = `实时更新中 (${(status.updateInterval / 1000).toFixed(1)}s)`
    } else {
      updateStatusText.value = '更新暂停'
    }
  } else {
    updateStatusText.value = '已停止更新'
  }
}

const updateInterval = setInterval(updateUpdateStatus, 500)

const selectMetric = (metric: MetricType) => {
  setSelectedMetric(metric)
}

const getMetricValueClass = (value: number, warningThreshold = 70, errorThreshold = 85) => {
  if (value > errorThreshold) return 'error'
  if (value > warningThreshold) return 'warning'
  return 'normal'
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
  return 'healthy'
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.update-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.update-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--error-red);
  transition: all 0.3s ease;
}

.update-dot.active {
  background-color: var(--success-green);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.metric-card {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 212, 255, 0.1);
}

.metric-card.selected {
  border: 2px solid var(--accent-blue);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.metric-value.normal {
  color: var(--text-primary);
}

.metric-value.warning {
  color: var(--warning-yellow);
}

.metric-value.error {
  color: var(--error-red);
}

.metric-threshold {
  margin-top: 8px;
}

.threshold-bar {
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.threshold-fill {
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

.threshold-fill.warning {
  background-color: var(--warning-yellow);
  opacity: 0.6;
}

.threshold-fill.error {
  background-color: var(--error-red);
  opacity: 0.6;
}

.metric-breakdown {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.network-in {
  color: var(--success-green);
}

.network-out {
  color: var(--accent-blue);
}

.health-section {
  display: flex;
  gap: 15px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.health-indicator {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  background-color: var(--primary-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  flex: 1;
  min-width: 250px;
}

.health-content {
  flex: 1;
}

.health-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.health-message {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
}

.health-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--success-green);
  flex-shrink: 0;
  margin-top: 2px;
}

.health-dot.warning {
  background-color: var(--warning-yellow);
}

.health-dot.error {
  background-color: var(--error-red);
}

.health-dot.healthy {
  background-color: var(--success-green);
}

.status-rules {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--primary-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.rules-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-blue);
  margin-bottom: 10px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.rule-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--success-green);
  flex-shrink: 0;
}

.rule-dot.warning {
  background-color: var(--warning-yellow);
}

.rule-dot.error {
  background-color: var(--error-red);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background-color: var(--primary-bg);
  border-radius: 8px;
  border: 2px dashed var(--error-red);
  min-height: 200px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: shake 2s ease-in-out infinite;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-message {
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.retry-button {
  background-color: var(--accent-blue);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-button:hover {
  background-color: var(--success-green);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
}

.retry-button:focus {
  outline: 3px solid var(--accent-blue);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .status-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .health-section {
    flex-direction: column;
  }
  
  .health-indicator {
    min-width: auto;
  }
  
  .metric-value {
    font-size: 20px;
  }
}
</style>
