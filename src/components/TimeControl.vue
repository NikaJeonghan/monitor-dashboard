<template>
  <div class="time-control">
    <div class="control-header">
      <h4 class="control-title">历史回放控制</h4>
      <div class="mode-toggle">
        <button 
          class="mode-btn" 
          :class="{ active: mode === 'live' }"
          @click="setMode('live')"
        >
          实时监控
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: mode === 'historical' }"
          @click="setMode('historical')"
        >
          历史回放
        </button>
      </div>
    </div>

    <div v-if="mode === 'historical'" class="time-controls">
      <div class="time-range-selector">
        <label class="range-label">时间范围:</label>
        <select 
          v-model="selectedTimeRange" 
          class="time-select"
          @change="onTimeRangeChange"
        >
          <option v-for="range in timeRanges" :key="range.value" :value="range.value">
            {{ range.label }}
          </option>
        </select>
      </div>

      <div class="time-slider-container">
        <label class="slider-label">时间位置:</label>
        <input
          type="range"
          v-model="currentTimePosition"
          :min="0"
          :max="maxPosition"
          class="time-slider"
          @input="onTimePositionChange"
        />
        <div class="time-display">
          {{ formatTime(currentTime) }}
        </div>
      </div>

      <div class="playback-controls">
        <button 
          class="playback-btn"
          :class="{ playing: isPlaying }"
          @click="togglePlayback"
        >
          {{ isPlaying ? '暂停' : '播放' }}
        </button>
        <button class="playback-btn" @click="resetPosition">
          重置
        </button>
        <div class="speed-control">
          <label class="speed-label">播放速度:</label>
          <select v-model="playbackSpeed" class="speed-select">
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
        </div>
      </div>
    </div>

    <div v-else class="live-indicator">
      <div class="live-dot"></div>
      <span>实时数据流</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { dataService } from '../services/dataService'

const emit = defineEmits<{
  'timeRangeChange': { start: number; end: number }
  'timePositionChange': number
  'modeChange': 'live' | 'historical'
}>()

// 状态管理
const mode = ref<'live' | 'historical'>('live')
const selectedTimeRange = ref(5) // 默认5分钟
const currentTimePosition = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const playbackInterval = ref<number | null>(null)

// 时间范围选项
const timeRanges = [
  { value: 5, label: '最近 5 分钟' },
  { value: 10, label: '最近 10 分钟' },
  { value: 15, label: '最近 15 分钟' }
]

// 计算属性
const maxPosition = computed(() => {
  return selectedTimeRange.value * 60 - 1
})

const currentTime = computed(() => {
  const timeRange = dataService.getHistoryTimeRange()
  const timeOffset = currentTimePosition.value * 1000
  return timeRange.end - (selectedTimeRange.value * 60 * 1000) + timeOffset
})

// 方法
const setMode = (newMode: 'live' | 'historical') => {
  mode.value = newMode
  if (newMode === 'live') {
    stopPlayback()
    emit('modeChange', 'live')
  } else {
    emit('modeChange', 'historical')
    initializeHistoricalMode()
  }
}

const onTimeRangeChange = () => {
  currentTimePosition.value = 0
  initializeHistoricalMode()
}

const onTimePositionChange = () => {
  emit('timePositionChange', currentTime.value)
}

const togglePlayback = () => {
  isPlaying.value = !isPlaying.value
  
  if (isPlaying.value) {
    startPlayback()
  } else {
    stopPlayback()
  }
}

const resetPosition = () => {
  currentTimePosition.value = 0
  emit('timePositionChange', currentTime.value)
  if (isPlaying.value) {
    stopPlayback()
    startPlayback()
  }
}

const initializeHistoricalMode = () => {
  const timeRange = selectedTimeRange.value * 60 * 1000
  const now = Date.now()
  const timeRangeObj = {
    start: now - timeRange,
    end: now
  }
  emit('timeRangeChange', timeRangeObj)
}

const startPlayback = () => {
  if (playbackInterval.value) return
  
  const interval = 1000 / playbackSpeed.value
  playbackInterval.value = window.setInterval(() => {
    if (currentTimePosition.value < maxPosition.value) {
      currentTimePosition.value++
      emit('timePositionChange', currentTime.value)
    } else {
      // 播放结束，循环播放
      currentTimePosition.value = 0
      emit('timePositionChange', currentTime.value)
    }
  }, interval)
}

const stopPlayback = () => {
  if (playbackInterval.value) {
    clearInterval(playbackInterval.value)
    playbackInterval.value = null
  }
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  initializeHistoricalMode()
})

onUnmounted(() => {
  stopPlayback()
})
</script>

<style scoped>
.time-control {
  background-color: var(--secondary-bg);
  border-radius: 6px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.control-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-blue);
  margin: 0;
}

.mode-toggle {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background-color: var(--primary-bg);
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
}

.mode-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.mode-btn.active {
  background-color: var(--accent-blue);
  color: white;
  border-color: var(--accent-blue);
}

.time-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-range-selector,
.time-slider-container,
.playback-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-label,
.slider-label,
.speed-label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 60px;
}

.time-select,
.speed-select {
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  background-color: var(--primary-bg);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 12px;
}

.time-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.time-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--accent-blue);
  cursor: pointer;
}

.time-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--accent-blue);
  cursor: pointer;
  border: none;
}

.time-display {
  min-width: 80px;
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: center;
  padding: 4px 8px;
  background-color: var(--primary-bg);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.playback-controls {
  flex-wrap: wrap;
}

.playback-btn {
  padding: 8px 16px;
  background-color: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.playback-btn:hover {
  background-color: var(--success-green);
  transform: translateY(-1px);
}

.playback-btn.playing {
  background-color: var(--error-red);
}

.playback-btn.playing:hover {
  background-color: var(--warning-yellow);
}

.speed-control {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--primary-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.live-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--success-green);
  animation: live-pulse 2s infinite;
}

@keyframes live-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@media (max-width: 768px) {
  .control-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .time-controls {
    gap: 12px;
  }
  
  .time-range-selector,
  .time-slider-container,
  .playback-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .speed-control {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>
