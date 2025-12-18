import { ref } from 'vue'

export type MetricType = 'cpu' | 'memory' | 'disk'

export interface SystemState {
    running: boolean
    selectedMetric: MetricType
}

// 全局状态，使用 reactive 实现响应式
export const systemState = ref<SystemState>({
    running: true,
    selectedMetric: 'cpu'
})

// 状态操作方法
export const setRunning = (status: boolean) => {
    systemState.value.running = status
}

export const setSelectedMetric = (metric: MetricType) => {
    systemState.value.selectedMetric = metric
}

export const getRunning = () => systemState.value.running
export const getSelectedMetric = () => systemState.value.selectedMetric
