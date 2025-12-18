<template>
  <div class="visualization-area">
    <h3 class="section-title">数据可视化中心</h3>
    
    <!-- Visualization Controls -->
    <div class="viz-controls">
      <select v-model="selectedDimension" class="btn" @change="onDimensionChange">
        <option value="server">按服务器</option>
        <option value="region">按区域</option>
        <option value="service">按服务类型</option>
      </select>
      
      <select v-model="selectedServer" class="btn" v-if="selectedDimension === 'server'">
        <option v-for="server in servers" :key="server.id" :value="server.id">
          {{ server.name }}
        </option>
      </select>
      
      <select v-model="selectedRegion" class="btn" v-if="selectedDimension === 'region'">
        <option value="us-east-1">US East</option>
        <option value="us-west-2">US West</option>
        <option value="eu-west-1">Europe</option>
        <option value="ap-southeast-1">Asia Pacific</option>
      </select>
      
      <select v-model="selectedService" class="btn" v-if="selectedDimension === 'service'">
        <option value="web">Web 服务</option>
        <option value="database">数据库</option>
        <option value="cache">缓存</option>
        <option value="api">API 网关</option>
      </select>
      
      <button class="btn" @click="toggleTimeRange">
        {{ showTimeRange ? '隐藏' : '显示' }}时间范围
      </button>
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
    
    <!-- Charts Grid -->
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
      
      <!-- Gauge Chart -->
      <div class="chart-container">
        <h4 class="chart-title">当前资源使用率</h4>
        <v-chart 
          class="chart" 
          :option="gaugeChartOption" 
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
import { ref, computed } from 'vue'
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
import { getSelectedMetric } from '../services/systemState'

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

const selectedDimension = ref('server')
const selectedServer = ref('')
const selectedRegion = ref('us-east-1')
const selectedService = ref('web')
const showTimeRange = ref(false)
const timeRange = ref(5)

// Set initial server
if (props.servers.length > 0) {
  selectedServer.value = props.servers[0]?.id || ''
}

// Line chart option
const lineChartOption = computed(() => {
  const data = generateTimeSeriesData()
  const selectedMetric = getSelectedMetric()
  
  // 根据选中的指标配置图表
  const getMetricData = () => {
    switch (selectedMetric) {
      case 'cpu':
        return {
          name: 'CPU',
          data: data.map(d => d.cpu),
          color: 'var(--accent-blue)'
        }
      case 'memory':
        return {
          name: '内存',
          data: data.map(d => d.memory),
          color: 'var(--success-green)'
        }
      case 'disk':
        return {
          name: '磁盘',
          data: data.map(d => d.disk),
          color: 'var(--warning-yellow)'
        }
      default:
        return {
          name: 'CPU',
          data: data.map(d => d.cpu),
          color: 'var(--accent-blue)'
        }
    }
  }
  
  const metricConfig = getMetricData()
  
  return {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--text-primary)' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--secondary-bg)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    legend: {
      data: [metricConfig.name],
      textStyle: { color: 'var(--text-primary)' }
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
      data: data.map((_, index) => `${index}s`),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' },
      splitLine: { lineStyle: { color: 'var(--border-color)' } }
    },
    series: [
      {
        name: metricConfig.name,
        type: 'line',
        smooth: true,
        data: metricConfig.data,
        itemStyle: { color: metricConfig.color },
        areaStyle: { opacity: 0.3, color: metricConfig.color }
      }
    ]
  }
})

// Gauge chart option
const gaugeChartOption = computed(() => {
  const currentServer = props.servers.find(s => s.id === selectedServer.value)
  const cpu = currentServer ? currentServer.metrics.cpu : 0
  
  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 12,
        itemStyle: {
          color: 'var(--accent-blue)'
        },
        progress: {
          show: true,
          width: 30
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 30,
            color: [[1, 'var(--primary-bg)']]
          }
        },
        axisTick: {
          distance: -45,
          splitNumber: 5,
          lineStyle: {
            width: 2,
            color: 'var(--text-secondary)'
          }
        },
        splitLine: {
          distance: -52,
          length: 14,
          lineStyle: {
            width: 3,
            color: 'var(--text-secondary)'
          }
        },
        axisLabel: {
          distance: -20,
          color: 'var(--text-secondary)',
          fontSize: 20
        },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '-15%'],
          fontSize: 60,
          fontWeight: 'bolder',
          formatter: '{value}%',
          color: 'inherit'
        },
        data: [
          {
            value: cpu.toFixed(1)
          }
        ]
      }
    ]
  }
})

// Bar chart option
const barChartOption = computed(() => {
  const serverNames = props.servers.map(s => s.name)
  const cpuData = props.servers.map(s => s.metrics.cpu)
  const memoryData = props.servers.map(s => s.metrics.memory)
  
  return {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--text-primary)' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--secondary-bg)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    legend: {
      data: ['CPU', '内存'],
      textStyle: { color: 'var(--text-primary)' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: serverNames,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { 
        color: 'var(--text-secondary)',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)' },
      splitLine: { lineStyle: { color: 'var(--border-color)' } }
    },
    series: [
      {
        name: 'CPU',
        type: 'bar',
        data: cpuData,
        itemStyle: { color: 'var(--accent-blue)' }
      },
      {
        name: '内存',
        type: 'bar',
        data: memoryData,
        itemStyle: { color: 'var(--success-green)' }
      }
    ]
  }
})

// Pie chart option
const pieChartOption = computed(() => {
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
  const regionData = regions.map(region => {
    const servers = props.servers.filter(s => s.region === region)
    const totalNetwork = servers.reduce((sum, s) => sum + s.metrics.networkIn + s.metrics.networkOut, 0)
    return {
      name: region,
      value: totalNetwork
    }
  })
  
  return {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--text-primary)' },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--secondary-bg)',
      borderColor: 'var(--border-color)',
      textStyle: { color: 'var(--text-primary)' }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: 'var(--text-primary)' }
    },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: regionData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          color: 'var(--text-primary)'
        }
      }
    ]
  }
})

// Generate time series data
const generateTimeSeriesData = (): SystemMetrics[] => {
  const data: SystemMetrics[] = []
  const points = 60 // 60 data points
  
  for (let i = 0; i < points; i++) {
    data.push({
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      networkIn: Math.random() * 1000,
      networkOut: Math.random() * 1000,
      load1m: Math.random() * 10,
      timestamp: Date.now() - (points - i) * 1000
    })
  }
  
  return data
}

const onDimensionChange = () => {
  // Handle dimension change
  console.log('Dimension changed to:', selectedDimension.value)
}

const toggleTimeRange = () => {
  showTimeRange.value = !showTimeRange.value
}
</script>

<style scoped>
.chart {
  height: 300px;
  width: 100%;
}
</style>
