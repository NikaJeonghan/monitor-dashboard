// 全局数据引擎 - 统一管理所有数据流和状态

interface SystemMetrics {
    cpu: number
    memory: number
    disk: number
    networkIn: number
    networkOut: number
    timestamp: number
}

interface ServerData {
    id: string
    name: string
    region: string
    status: 'online' | 'offline' | 'warning' | 'error'
    metrics: SystemMetrics
    lastUpdate: number
}

interface Task {
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: number
    createdAt: number
    completedAt?: number
    priority: 'low' | 'medium' | 'high'
}

interface Alert {
    id: string
    type: 'error' | 'warning' | 'info'
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    timestamp: number
    acknowledged: boolean
}

interface DataEngine {
    // 数据管理
    getServerData: () => ServerData[]
    getSelectedServer: () => ServerData | null
    setSelectedServer: (id: string) => void
    clearSelectedServer: () => void

    // 任务管理
    getTasks: () => Task[]
    getTaskById: (id: string) => Task | null
    createTask: (task: Omit<Task, 'id'>) => Task
    updateTaskStatus: (id: string, status: Task['status']) => void
    completeTask: (id: string) => void

    // 告警管理
    getAlerts: () => Alert[]
    getAlertById: (id: string) => Alert | null
    createAlert: (alert: Omit<Alert, 'id'>) => Alert
    acknowledgeAlert: (id: string) => void
    clearAlert: (id: string) => void

    // 系统指标
    getSystemMetrics: () => SystemMetrics
    getAggregatedMetrics: () => { totalServers: number; avgCpu: number; avgMemory: number; avgDisk: number; totalNetworkIn: number; totalNetworkOut: number }
    getHealthStatus: () => { status: 'healthy' | 'warning' | 'critical'; issues: string[] }
    getLoadBalanceStatus: () => { status: 'balanced' | 'unbalanced' | 'critical'; details: string[] }

    // 时间控制
    getCurrentTime: () => number
    getTimeRange: () => { start: number; end: number }
    isPlaying: boolean
    setPlaybackPosition: (position: number) => void
    play: () => void
    pause: () => void
    stop: () => void
    setSpeed: (speed: number) => void

    // 数据生成配置
    getDataConfig: () => { updateInterval: number; serverCount: number; metricRange: { min: number; max: number } }
    setDataConfig: (config: Partial<{
        updateInterval: number
        serverCount: number
        metricRange: { min: number; max: number }
    }>) => void
}

class DataEngineImpl implements DataEngine {
    private servers: ServerData[] = []
    private selectedServerId: string | null = null
    private tasks: Task[] = []
    private alerts: Alert[] = []
    private updateInterval: number = 1000
    private serverCount: number = 8
    private metricRange = { min: 0, max: 100 }
    private currentTime: number = Date.now()
    private timeRange: { start: Date.now() - 300000, end: Date.now() }
  private isPlaying: boolean = false
  private playbackPosition: number = 0
  private playbackSpeed: number = 1

constructor() {
    this.initializeData()
    this.startDataGeneration()
    this.startAutoUpdate()
}

// 服务器管理
getServerData(): ServerData[] {
    return this.servers
}

getSelectedServer(): ServerData | null {
    return this.servers.find(s => s.id === this.selectedServerId) || null
}

setSelectedServer(id: string): void {
    this.selectedServerId = id
    console.log('选择服务器:', id)
}

clearSelectedServer(): void {
    this.selectedServerId = null
    console.log('清除服务器选择')
}

// 任务管理
getTasks(): Task[] {
    return this.tasks
}

getTaskById(id: string): Task | null {
    return this.tasks.find(t => t.id === id) || null
}

createTask(taskData: Omit<Task, 'id'>): Task {
    const task: Task = {
        ...taskData,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        createdAt: Date.now(),
        priority: taskData.priority || 'medium',
        progress: 0
    }
    this.tasks.push(task)
    console.log('创建任务:', task.name)
    return task
}

updateTaskStatus(id: string, status: Task['status']): void {
    const task = this.getTaskById(id)
    if(task) {
        task.status = status
        if (status === 'completed') {
            task.completedAt = Date.now()
        }
        console.log('更新任务状态:', task.name, status)
    }
}

completeTask(id: string): void {
    const task = this.getTaskById(id)
    if(task) {
        task.status = 'completed'
        task.progress = 100
        task.completedAt = Date.now()
        console.log('完成任务:', task.name)
    }
}

// 告警管理
getAlerts(): Alert[] {
    return this.alerts
}

getAlertById(id: string): Alert | null {
    return this.alerts.find(a => a.id === id) || null
}

createAlert(alertData: Omit<Alert, 'id'>): Alert {
    const alert: Alert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        acknowledged: false,
        severity: alertData.severity || 'medium'
    }
    this.alerts.push(alert)
    console.log('创建告警:', alert.message)
    return alert
}

acknowledgeAlert(id: string): void {
    const alert = this.getAlertById(id)
    if(alert) {
        alert.acknowledged = true
        console.log('确认告警:', alert.message)
    }
}

clearAlert(id: string): void {
    this.alerts = this.alerts.filter(a => a.id !== id)
    console.log('清除告警:', id)
}

// 系统指标计算
getSystemMetrics(): SystemMetrics {
    const onlineServers = this.servers.filter(s => s.status === 'online')
    const offlineCount = this.servers.length - onlineServers.length

    // 计算平均值
    const avgCpu = onlineServers.length > 0
        ? onlineServers.reduce((sum, s) => sum + s.metrics.cpu, 0) / onlineServers.length
        : 0

    const avgMemory = onlineServers.length > 0
        ? onlineServers.reduce((sum, s) => sum + s.metrics.memory, 0) / onlineServers.length
        : 0

    const avgDisk = onlineServers.length > 0
        ? onlineServers.reduce((sum, s) => sum + s.metrics.disk, 0) / onlineServers.length
        : 0

    const totalNetworkIn = onlineServers.reduce((sum, s) => sum + s.metrics.networkIn, 0)
    const totalNetworkOut = onlineServers.reduce((sum, s) => sum + s.metrics.networkOut, 0)

    // 健康状态判断
    const issues: string[] = []
    if (avgCpu > 80) issues.push('CPU使用率过高')
    if (avgMemory > 85) issues.push('内存使用率过高')
    if (avgDisk > 90) issues.push('磁盘使用率过高')
    if (offlineCount > this.servers.length * 0.2) issues.push('服务器离线率过高')

    const healthStatus = issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'warning' : 'critical'

    return {
        cpu: avgCpu,
        memory: avgMemory,
        disk: avgDisk,
        networkIn: totalNetworkIn,
        networkOut: totalNetworkOut,
        timestamp: Date.now()
    }
}

getAggregatedMetrics() {
    const systemMetrics = this.getSystemMetrics()
    return {
        totalServers: this.servers.length,
        avgCpu: systemMetrics.cpu,
        avgMemory: systemMetrics.memory,
        avgDisk: systemMetrics.disk,
        totalNetworkIn: systemMetrics.networkIn,
        totalNetworkOut: systemMetrics.networkOut
    }
}

getHealthStatus() {
    const systemMetrics = this.getSystemMetrics()
    const status = systemMetrics.issues.length === 0 ? 'healthy' : systemMetrics.issues.length <= 2 ? 'warning' : 'critical'

    return {
        status,
        issues: systemMetrics.issues,
        timestamp: Date.now()
    }
}

getLoadBalanceStatus() {
    const servers = this.servers.filter(s => s.status === 'online')
    if (servers.length === 0) {
        return {
            status: 'critical',
            details: ['没有在线服务器'],
            timestamp: Date.now()
        }
    }

    // 计算负载标准差
    const cpuValues = servers.map(s => s.metrics.cpu)
    const avgCpu = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
    const maxCpu = Math.max(...cpuValues)
    const cpuStdDev = Math.sqrt(cpuValues.reduce((sum, val) => Math.pow(val - avgCpu, 2), 0) / cpuValues.length)

    const details: string[] = []
    if (maxCpu - avgCpu > avgCpu * 0.5) details.push('CPU负载不均衡')
    if (cpuStdDev > 20) details.push('CPU负载波动过大')
    if (servers.length < 3) details.push('服务器数量不足')

    const status = details.length === 0 ? 'balanced' : details.length <= 2 ? 'unbalanced' : 'critical'

    return {
        status,
        details,
        timestamp: Date.now()
    }
}

// 时间控制
getCurrentTime(): number {
    return this.currentTime
}

getTimeRange() {
    return this.timeRange
}

isPlaying(): boolean {
    return this.isPlaying
}

setPlaybackPosition(position: number): void {
    this.playbackPosition = position
}

play(): void {
    this.isPlaying = true
    this.startPlayback()
}

pause(): void {
    this.isPlaying = false
}

stop(): void {
    this.isPlaying = false
}

setSpeed(speed: number): void {
    this.playbackSpeed = speed
}

// 数据生成配置
getDataConfig() {
    return {
        updateInterval: this.updateInterval,
        serverCount: this.serverCount,
        metricRange: this.metricRange
    }
}

setDataConfig(config: Partial<{
    updateInterval: number
    serverCount: number
    metricRange: { min: number; max: number }
}>) {
    if (config.updateInterval !== undefined) {
        this.updateInterval = config.updateInterval
    }
    if (config.serverCount !== undefined) {
        this.serverCount = config.serverCount
    }
    if (config.metricRange !== undefined) {
        this.metricRange = config.metricRange
    }
    console.log('更新数据配置:', config)
}

  // 私有方法
  private initializeData(): void {
    this.generateServers()
    this.generateTasks()
    this.generateAlerts()
}

  private generateServers(): void {
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
    const serverNames = ['Server-1', 'Server-2', 'Server-3', 'Server-4', 'Server-5', 'Server-6', 'Server-7', 'Server-8']

    this.servers = serverNames.map((name, index) => ({
        id: `server-${index + 1}`,
        name,
        region: regions[index % regions.length],
        status: Math.random() > 0.8 ? 'online' : 'offline',
        metrics: {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            disk: Math.random() * 100,
            networkIn: Math.random() * 1000,
            networkOut: Math.random() * 1000,
            lastUpdate: Date.now()
        }
    }))
}

  private generateTasks(): void {
    const taskNames = ['数据备份', '系统扫描', '日志分析', '性能优化', '安全检查']
    const priorities = ['low', 'medium', 'high'] as const

    this.tasks = taskNames.map((name, index) => {
        const priority = priorities[index % priorities.length] as 'high'
        const status = Math.random() > 0.5 ? 'running' : 'pending'
        const progress = status === 'completed' ? 100 : Math.random() * 80

        return {
            id: `task-${index + 1}`,
            name,
            status,
            priority,
            progress,
            createdAt: Date.now() - Math.random() * 10000 * (index + 1),
            completedAt: status === 'completed' ? Date.now() - Math.random() * 5000 : undefined
        }
    })
}

  private generateAlerts(): void {
    const alertMessages = [
        'CPU使用率超过阈值',
        '内存不足警告',
        '磁盘空间不足',
        '网络连接异常',
        '安全威胁检测',
        '系统响应时间过长'
    ]

    this.alerts = alertMessages.map((message, index) => {
        const severities = ['critical', 'high', 'medium', 'low'] as const
        const severity = severities[index % severities.length] as 'high'
        const acknowledged = Math.random() > 0.7

        return {
            id: `alert-${index + 1}`,
            message,
            severity,
            timestamp: Date.now() - Math.random() * 5000 * (index + 1),
            acknowledged
        }
    })
}

  private startDataGeneration(): void {
    // 定期更新服务器状态
    setInterval(() => {
    this.servers = this.servers.map(server => ({
        ...server,
        metrics: {
            ...server.metrics,
            cpu: server.status === 'online'
                ? Math.max(10, server.metrics.cpu + (Math.random() - 0.5) * 20)
                : server.metrics.cpu,
            memory: server.status === 'online'
                ? Math.max(20, server.metrics.memory + (Math.random() - 0.5) * 30)
                : server.metrics.memory,
            disk: server.status === 'online'
                ? Math.max(5, server.metrics.disk + (Math.random() - 0.5) * 15)
                : server.metrics.disk,
            networkIn: server.status === 'online'
                ? Math.max(100, server.metrics.networkIn + (Math.random() - 0.5) * 500)
                : server.metrics.networkIn,
            networkOut: server.status === 'online'
                ? Math.max(100, server.metrics.networkOut + (Math.random() - 0.5) * 500)
                : server.metrics.networkOut,
            lastUpdate: Date.now()
        },
        lastUpdate: Date.now()
    }))
}, 2000)
  }

  private startAutoUpdate(): void {
    this.startDataGeneration()
}

  private startPlayback(): void {
    if(this.updateInterval > 0) {
    this.playbackInterval = setInterval(() => {
        if (this.isPlaying) {
            this.playbackPosition = (this.playbackPosition + 1) % 300
            this.currentTime = this.timeRange.start + this.playbackPosition * 1000
        } else {
            clearInterval(this.playbackInterval!)
            this.playbackInterval = null
        }
    }, this.updateInterval / this.playbackSpeed)
}
  }

  private stopAutoUpdate(): void {
    if(this.playbackInterval) {
    clearInterval(this.playbackInterval!)
    this.playbackInterval = null
}
  }
}

// 导出接口
export { DataEngine }

// 创建全局实例
export const dataEngine: DataEngine = new DataEngineImpl()
