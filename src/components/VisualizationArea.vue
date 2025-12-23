<template>
  <div class="visualization-area">
    <h3 class="section-title">数据可视化中心</h3>
    
    <!-- Time Control Component -->
    <TimeControl 
      @timeRangeChange="(timeRange: any) => onTimeRangeChange(timeRange)"
      @timePositionChange="(timestamp: any) => onTimePositionChange(timestamp)"
      @modeChange="(newMode: any) => onModeChange(newMode)"
    />
    
    <!-- Visualization Controls -->
    <div class="viz-controls">
      <select v-model="selectedServerId" class="btn" @change="onServerChange">
        <option value="">全部服务器</option>
        <option v-for="server in servers" :key="server.id" :value="server.id">
          {{ server.name }}
        </option>
      </select>
      <!-- 当前选中服务器信息 -->
      <div v-if="selectedServerId" class="server-info">
        <span class="server-label">当前选中: {{ getSelectedServerName() }}</span>
        <button class="clear-btn" @click="clearServerSelection">清除选择</button>
      </div>
    </div>
    
    <!-- Time Control -->
    <div class="time-control" v-if="showTimeRange">
      <label>历史回放:</label>
      <input 
        type="range" 
        v-model="timeRange" 
        min="1" 
        max="15" 
        class="time-slider"
      />
      <span>{{ timeRange }} 分钟前</span>
    </div>
    
    <!-- Charts Grid - 2x2 Layout -->
    <div class="charts-grid">
      <!-- Line Chart -->
      <div class="chart-container">
        <h4 class="chart-title">系统性能时序图</h4>
        <v-chart 
          class="chart" 
          :option="lineChartOption" 
          autoresize
        />
      </div>
      
      <!-- Bar Chart -->
      <div class="chart-container">
        <h4 class="chart-title">服务器负载分布</h4>
        <v-chart 
          class="chart" 
          :option="barChartOption" 
          autoresize
        />
      </div>
      
      <!-- Gauge Chart -->
      <div class="chart-container">
        <h4 class="chart-title">当前资源使用率</h4>
        <v-chart 
          class="chart" 
          :option="gaugeChartOption" 
          autoresize
        />
      </div>
      
      <!-- Pie Chart -->
      <div class="chart-container">
        <h4 class="chart-title">区域流量分布</h4>
        <v-chart 
          class="chart" 
          :option="pieChartOption" 
          autoresize
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, GaugeChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { ServerData, SystemMetrics } from '../services/dataService'
import { dataService } from '../services/dataService'
import { systemState, getSelectedMetric, getViewMode, getSelectedServerId, setSelectedServerId, setViewMode, getPlaybackIndex } from '../services/systemState'
import TimeControl from './TimeControl.vue'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
])

const props = defineProps<{
  servers: ServerData[]
}>()

const selectedServerId = ref('')
const showTimeRange = ref(false)
const timeRange = ref(5)
const currentTimePosition = ref(0)
const mode = ref<'live' | 'historical'>('live')
const historicalData = ref<{ servers: ServerData[]; aggregatedMetrics: SystemMetrics[] }>({ servers: [], aggregatedMetrics: [] })

// 使用新的computed视图层
const activeServers = computed(() => dataService.getFilteredServers())

// 获取当前选中服务器的名称
const getSelectedServerName = () => {
  const selectedId = selectedServerId.value
  if (!selectedId) return '未选择'
  
  const allServers = [...props.servers, ...activeServers.value]
  const selectedServer = allServers.find(s => s.id === selectedId)
  return selectedServer?.name || '未知服务器'
}

// Line chart option - 修复暗色主题下坐标轴可见性，优化数据密集度
const lineChartOption = computed(() => {
  const data = generateTimeSeriesData()
  const selectedMetric = getSelectedMetric()
  
  // 根据选中的指标配置图表 - 增强对比度
  const getMetricData = () => {
    switch (selectedMetric) {
      case 'cpu':
        return {
          name: 'CPU',
          data: data.map(d => d.cpu),
          color: '#00d4ff'  // 使用主题色
        }
      case 'memory':
        return {
          name: '内存',
          data: data.map(d => d.memory),
          color: '#00ff88'  // 使用主题色
        }
      case 'disk':
        return {
          name: '磁盘',
          data: data.map(d => d.disk),
          color: '#ffb800'  // 使用主题色
        }
      default:
        return {
          name: 'CPU',
          data: data.map(d => d.cpu),
          color: '#00d4ff'
        }
    }
  }
  
  const metricConfig = getMetricData()
  
  // 优化数据密集度 - 根据数据量调整采样间隔
  const sampledData = data.length > 100 ? data.filter((_, index) => index % 2 === 0) : data
  
  // 生成时间标签 - 根据模式使用不同的时间格式
  const sampledLabels = sampledData.map((item, index) => {
    const date = new Date(item.timestamp)
    if (getViewMode() === 'historical') {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } else {
      // 实时模式显示相对时间
      const now = Date.now()
      const diff = Math.floor((now - item.timestamp) / 1000)
      if (diff < 60) {
        return `${diff}s前`
      } else {
        return `${Math.floor(diff / 60)}m前`
      }
    }
  })
  
  return {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--text-primary)' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(26, 29, 62, 0.95)',
      borderColor: metricConfig.color,
      borderWidth: 2,
      textStyle: { color: 'var(--text-primary)', fontWeight: 'bold', fontSize: 12 },
      position: function (point: any) {
        // 防止tooltip超出屏幕边界
        return [point[0] + 10, point[1] - 30]
      }
    },
    legend: {
      data: [metricConfig.name],
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sampledLabels,
      axisLine: { lineStyle: { color: '#9aa5b1', width: 2 } },  // 更亮的轴线颜色
      axisLabel: { color: '#9aa5b1', fontSize: 12 },  // 更亮的标签颜色
      axisTick: { lineStyle: { color: '#9aa5b1' } }  // 更亮的刻度颜色
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: '#9aa5b1', width: 2 } },  // 更亮的轴线颜色
      axisLabel: { color: '#9aa5b1', fontSize: 12 },  // 更亮的标签颜色
      axisTick: { lineStyle: { color: '#9aa5b1' } },  // 更亮的刻度颜色
      splitLine: { lineStyle: { color: '#2a2f55', type: 'dashed', width: 1 } }  // 更明显的分割线
    },
    series: [
      {
        name: metricConfig.name,
        type: 'line',
        smooth: true,
        data: sampledData.map(item => {
          switch (selectedMetric) {
            case 'cpu':
              return item.cpu
            case 'memory':
              return item.memory
            case 'disk':
              return item.disk
            default:
              return item.cpu
          }
        }),
        itemStyle: { color: metricConfig.color },
        areaStyle: { 
          opacity: 0.4, 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: metricConfig.color },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
        lineStyle: { width: 3, color: metricConfig.color },
        emphasis: {
          itemStyle: { color: metricConfig.color, borderColor: '#fff', borderWidth: 2 }
        }
      }
    ]
  }
})

// Gauge chart option - 使用响应式数据源
const gaugeChartOption = computed(() => {
  const filteredServers = dataService.getFilteredServers()
  const currentServer = filteredServers.find(s => s.id === selectedServerId.value) || filteredServers[0]
  
  // 确保数据是合理的整数，避免小数点混乱
  const cpu = currentServer ? Math.round(currentServer.metrics.cpu) : 0
  const memory = currentServer ? Math.round(currentServer.metrics.memory) : 0
  
  return {
    backgroundColor: 'transparent',
    series: [
      // CPU仪表盘 - 上方
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 5,  // 减少分割数量，简化显示
        radius: '45%',
        center: ['50%', '35%'],  // 移到上方
        itemStyle: {
          color: '#00d4ff'
        },
        progress: {
          show: true,
          width: 20,
          itemStyle: { color: '#00d4ff' }
        },
        pointer: {
          show: true,
          length: '35%',  // 大幅缩短指针长度，避免挡住数字
          width: 4,  // 减小指针宽度
          itemStyle: { color: '#00d4ff' }
        },
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#00ff88'],
              [0.7, '#ffb800'],
              [1, '#ff4757']
            ]
          }
        },
        axisTick: {
          show: false  // 隐藏小刻度，减少视觉混乱
        },
        splitLine: {
          distance: -25,
          length: 12,
          lineStyle: {
            width: 3,
            color: '#9aa5b1'
          }
        },
        axisLabel: {
          distance: -28,  // 让标注离刻度更近一点
          color: '#e6eef9',
          fontSize: 12,
          fontWeight: 'bold',
          formatter: '{value}%'  // 简化标签显示
        },
        detail: {
          valueAnimation: true,
          width: '80%',
          lineHeight: 22,
          borderRadius: 4,
          offsetCenter: [0, '25%'],  // 下调数值位置，给指针留更多空间
          fontSize: 24,
          fontWeight: 'bold',
          formatter: '{value}%',  // 简化数值显示，去掉多余信息
          color: '#e6eef9'
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 16,
          color: '#e6eef9'
        },
        data: [
          {
            value: cpu,
            name: 'CPU使用率'
          }
        ]
      },
      // 内存仪表盘 - 下方
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 5,  // 减少分割数量，简化显示
        radius: '45%',
        center: ['50%', '75%'],  // 移到下方
        itemStyle: {
          color: '#00ff88'
        },
        progress: {
          show: true,
          width: 20,
          itemStyle: { color: '#00ff88' }
        },
        pointer: {
          show: true,
          length: '35%',  // 大幅缩短指针长度，避免挡住数字
          width: 4,  // 减小指针宽度
          itemStyle: { color: '#00ff88' }
        },
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#00ff88'],
              [0.7, '#ffb800'],
              [1, '#ff4757']
            ]
          }
        },
        axisTick: {
          show: false  // 隐藏小刻度，减少视觉混乱
        },
        splitLine: {
          distance: -25,
          length: 12,
          lineStyle: {
            width: 3,
            color: '#9aa5b1'
          }
        },
        axisLabel: {
          distance: -28,  // 让标注离刻度更近一点
          color: '#e6eef9',
          fontSize: 12,
          fontWeight: 'bold',
          formatter: '{value}%'  // 简化标签显示
        },
        detail: {
          valueAnimation: true,
          width: '80%',
          lineHeight: 22,
          borderRadius: 4,
          offsetCenter: [0, '25%'],  // 下调数值位置，给指针留更多空间
          fontSize: 24,
          fontWeight: 'bold',
          formatter: '{value}%',  // 简化数值显示，去掉多余信息
          color: '#e6eef9'
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 16,
          color: '#e6eef9'
        },
        data: [
          {
            value: memory,
            name: '内存使用率'
          }
        ]
      }
    ]
  }
})

// Bar chart option - 使用响应式数据源
const barChartOption = computed(() => {
  const filteredServers = dataService.getFilteredServers()
  const serverNames = filteredServers.map(s => s.name)
  const cpuData = filteredServers.map(s => Math.round(s.metrics.cpu))  // 四舍五入避免小数
  const memoryData = filteredServers.map(s => Math.round(s.metrics.memory))  // 四舍五入避免小数
  
  return {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--text-primary)' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(26, 29, 62, 0.95)',
      borderColor: '#00d4ff',
      borderWidth: 2,
      textStyle: { color: 'var(--text-primary)', fontWeight: 'bold', fontSize: 12 },
      position: function (point: any) {
        return [point[0] + 10, point[1] - 30]
      }
    },
    legend: {
      data: ['CPU', '内存'],
      textStyle: { color: 'var(--text-primary)', fontSize: 14 },
      itemGap: 20
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: serverNames,
      axisLine: { lineStyle: { color: '#9aa5b1', width: 2 } },  // 更亮的轴线颜色
      axisLabel: { 
        color: '#9aa5b1',  // 更亮的标签颜色
        fontSize: 11,
        rotate: 45,
        interval: 0
      },
      axisTick: { lineStyle: { color: '#9aa5b1' } }  // 更亮的刻度颜色
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: '#9aa5b1', width: 2 } },  // 更亮的轴线颜色
      axisLabel: { color: '#9aa5b1', fontSize: 12 },  // 更亮的标签颜色
      axisTick: { lineStyle: { color: '#9aa5b1' } },  // 更亮的刻度颜色
      splitLine: { lineStyle: { color: '#2a2f55', type: 'dashed', width: 1 } }  // 更明显的分割线
    },
    series: [
      {
        name: 'CPU',
        type: 'bar',
        data: cpuData,
        itemStyle: { 
          color: '#00d4ff',
          borderColor: '#ffffff',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: { color: '#00a8cc' }
        }
      },
      {
        name: '内存',
        type: 'bar',
        data: memoryData,
        itemStyle: { 
          color: '#00ff88',
          borderColor: '#ffffff',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: { color: '#00cc6a' }
        }
      }
    ]
  }
})

// Pie chart option - 使用响应式数据源
const pieChartOption = computed(() => {
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
  const filteredServers = dataService.getFilteredServers()
  const regionData = regions.map(region => {
    const servers = filteredServers.filter(s => s.region === region)
    const totalNetwork = servers.reduce((sum, s) => s.metrics.networkIn + s.metrics.networkOut, 0)
    return {
      name: region,
      value: totalNetwork
    }
  }).filter(item => item.value > 0) // 过滤掉值为0的数据
  
  const colors = ['#00d4ff', '#00ff88', '#ffb800', '#ff4757']
  
  return {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--text-primary)' },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(26, 29, 62, 0.95)',
      borderColor: '#00d4ff',
      borderWidth: 2,
      textStyle: { color: 'var(--text-primary)', fontWeight: 'bold', fontSize: 12 },
      formatter: function(params: any) {
        // 简化tooltip显示，避免被挡住
        return `${params.name}<br/>流量: ${params.value.toFixed(0)} KB/s<br/>占比: ${params.percent}%`
      },
      position: function (point: any) {
        // 智能定位，防止超出屏幕
        const boxWidth = 150
        const boxHeight = 80
        let x = point[0] + 10
        let y = point[1] - boxHeight / 2
        
        // 检查右边界
        if (x + boxWidth > window.innerWidth) {
          x = point[0] - boxWidth - 10
        }
        
        // 检查上边界
        if (y < 10) {
          y = 10
        }
        
        // 检查下边界
        if (y + boxHeight > window.innerHeight - 10) {
          y = window.innerHeight - boxHeight - 10
        }
        
        return [x, y]
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 },
      itemGap: 10
    },
    series: [
      {
        name: '网络流量',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        data: regionData,
        color: colors,
        emphasis: {
          itemStyle: {
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.8)',
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        },
        label: {
          color: 'var(--text-primary)',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: '{b}\n{d}%',
          position: 'outside'  // 标签放在外部避免重叠
        },
        labelLine: {
          lineStyle: { color: 'var(--border-color)', width: 2 }
        }
      }
    ]
  }
})

// Event handlers for TimeControl integration
const onTimeRangeChange = (timeRange: any) => {
  // Use historical data when time range is provided
  if (mode.value === 'historical') {
    updateHistoricalData()
  }
}

const onTimePositionChange = (timestamp: any) => {
  currentTimePosition.value = Math.floor(timestamp / 1000)
}

const onModeChange = (newMode: any) => {
  mode.value = newMode
  if (newMode === 'historical') {
    updateHistoricalData()
  } else {
    // Reset to live data
    historicalData.value = { servers: [], aggregatedMetrics: [] }
  }
}

// Update historical data based on time position
const updateHistoricalData = () => {
  if (mode.value === 'historical' && timeRange.value > 0) {
    const historical = dataService.getHistoricalData(timeRange.value)
    historicalData.value = historical
  }
}

// Generate time series data - 使用响应式数据源
const generateTimeSeriesData = (): SystemMetrics[] => {
  console.log('生成时序数据 - 模式:', getViewMode(), '服务器:', getSelectedServerId(), '播放索引:', getPlaybackIndex())
  
  // 使用dataService的响应式数据源
  return dataService.getFilteredTimeSeriesData()
}

const onServerChange = () => {
  // Handle server selection change
  console.log('服务器选择已更新:', selectedServerId.value)
  setSelectedServerId(selectedServerId.value)
}

// 清除服务器选择
const clearServerSelection = () => {
  selectedServerId.value = ''
  setSelectedServerId('')
  console.log('已清除服务器选择')
}

// 监听服务器选择变化
watch(selectedServerId, (newServerId) => {
  console.log('服务器选择已更新:', newServerId)
})

// 监听TimeControl模式变化
watch(mode, (newMode) => {
  setViewMode(newMode)
  console.log('模式已切换:', newMode)
})

const toggleTimeRange = () => {
  showTimeRange.value = !showTimeRange.value
}
</script>

<style scoped>
.visualization-area {
  padding: 20px;
  background-color: var(--secondary-bg);
  border-radius: 8px;
  margin: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  border-bottom: 2px solid var(--accent-blue);
  padding-bottom: 8px;
}

.viz-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.viz-controls .btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--primary-bg);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.viz-controls .btn:hover {
  border-color: var(--accent-blue);
  transform: translateY(-1px);
}

.viz-controls .btn:focus {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  padding: 8px 12px;
  background-color: var(--primary-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.server-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-blue);
}

.clear-btn {
  padding: 6px 12px;
  background-color: var(--error-red);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background-color: var(--warning-yellow);
  transform: translateY(-1px);
}

.time-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px;
  background-color: var(--primary-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.time-control label {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.time-slider {
  flex: 1;
  max-width: 200px;
}

/* 2x2 网格布局 - 优化四幅图排列 */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
  height: 800px; /* 固定高度确保布局稳定 */
}

.chart-container {
  background-color: var(--primary-bg);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 防止内容溢出 */
}

.chart-container:hover {
  border-color: var(--accent-blue);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  text-align: center;
  flex-shrink: 0; /* 防止标题被压缩 */
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 0; /* 防止图表溢出 */
}

/* 响应式设计 - 移动端改为单列 */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, auto);
    height: auto;
  }
  
  .chart {
    height: 250px;
  }
}

@media (max-width: 768px) {
  .viz-controls {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .server-info {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .visualization-area {
    padding: 12px;
    margin: 8px;
  }
  
  .chart {
    height: 200px;
  }
}

/* 增强图表可读性 */
:deep(.echarts-tooltip) {
  border-radius: 6px !important;
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.echarts-legend) {
  border-radius: 4px !important;
}

/* 确保仪表盘文字不被挡住 */
:deep(.echarts-gauge .echarts-title) {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
}

:deep(.echarts-gauge .echarts-detail) {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
}
</style>
