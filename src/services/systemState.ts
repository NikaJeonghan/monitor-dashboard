import { ref } from 'vue'

export type MetricType = 'cpu' | 'memory' | 'disk'
export type ViewMode = 'live' | 'historical'

export interface SystemState {
    running: boolean
    selectedMetric: MetricType
    viewMode: ViewMode
    selectedServerId: string | null
    timeRangeStart: number | null
    timeRangeEnd: number | null
    playbackIndex: number
}

// 全局状态，使用 reactive 实现响应式
export const systemState = ref<SystemState>({
    running: true,
    selectedMetric: 'cpu',
    viewMode: 'live',
    selectedServerId: null,
    timeRangeStart: null,
    timeRangeEnd: null,
    playbackIndex: 0
})

// 状态操作方法
export const setRunning = (status: boolean) => {
    systemState.value.running = status
}

export const setSelectedMetric = (metric: MetricType) => {
    systemState.value.selectedMetric = metric
}

export const setViewMode = (mode: ViewMode) => {
    systemState.value.viewMode = mode
}

export const setSelectedServerId = (serverId: string | null) => {
    systemState.value.selectedServerId = serverId
}

export const setTimeRange = (start: number | null, end: number | null) => {
    systemState.value.timeRangeStart = start
    systemState.value.timeRangeEnd = end
}

export const getRunning = () => systemState.value.running
export const getSelectedMetric = () => systemState.value.selectedMetric
export const getViewMode = () => systemState.value.viewMode
export const getSelectedServerId = () => systemState.value.selectedServerId
export const getTimeRange = () => ({ start: systemState.value.timeRangeStart, end: systemState.value.timeRangeEnd })
export const getPlaybackIndex = () => systemState.value.playbackIndex

export const setPlaybackIndex = (index: number) => {
    systemState.value.playbackIndex = index
}
