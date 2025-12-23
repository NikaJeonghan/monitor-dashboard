export interface SystemMetrics {
    cpu: number;
    memory: number;
    disk: number;
    networkIn: number;
    networkOut: number;
    load1m: number;
    timestamp: number;
}

export interface Task {
    id: string;
    name: string;
    cluster: string;
    status: 'queued' | 'running' | 'failed' | 'completed';
    progress: number;
    startTime: number;
}

export interface Alert {
    id: string;
    timestamp: number;
    source: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
}

export interface ServerData {
    id: string;
    name: string;
    region: string;
    metrics: SystemMetrics;
    status: 'healthy' | 'warning' | 'error';
}

import { systemState } from './systemState'
import { ref, computed, type Ref } from 'vue'

class DataService {
    // 基础只读数据源
    private baseServersRef: Ref<ServerData[]> = ref([]);
    private baseHistoryRef: Ref<Map<string, SystemMetrics[]>> = ref(new Map());

    // 任务和告警数据（保持现有逻辑）
    private tasks: Ref<Task[]> = ref([]);
    private alerts: Ref<Alert[]> = ref([]);
    private historySize = 300; // 5 minutes at 1 second intervals
    private updateInterval: number | null = null;
    private lastUpdateTime: number = 0;

    // 向后兼容的私有属性
    private get servers() { return this.baseServersRef; }
    private get dataHistory() { return this.baseHistoryRef.value; }

    // 区分实时数据流和历史回放快照
    private realTimeHistoryRef: Ref<Map<string, SystemMetrics[]>> = ref(new Map());
    private playbackHistoryRef: Ref<Map<string, SystemMetrics[]>> = ref(new Map());
    private historicalSnapshotRef: Ref<{
        servers: ServerData[];
        aggregatedMetrics: SystemMetrics[];
        timeRange: { start: number; end: number }
    } | null> = ref(null);

    constructor() {
        this.initializeData();
        this.initializeRealTimeHistory();
        this.startAutoUpdate();

        // 初始化computed视图层
        this.initializeComputedViews();
    }

    // 启动自动更新 - 确保每1-2秒更新一次
    public startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // 恢复时不丢失状态，立即更新一次
        if (this.lastUpdateTime === 0) {
            this.updateData();
            this.lastUpdateTime = Date.now();
        }

        this.updateInterval = window.setInterval(() => {
            // 只有在运行状态下才执行更新
            if (systemState.value.running) {
                try {
                    this.updateData();
                    this.lastUpdateTime = Date.now();
                    console.log('数据已更新 - 时间:', new Date().toLocaleTimeString());
                } catch (error) {
                    console.error('数据更新失败:', error);
                    // 不中断更新，继续下次尝试
                }
            } else {
                console.log('数据流已暂停，停止更新');
            }
        }, 1500); // 1.5秒更新间隔，满足1-2秒要求
    }

    // 停止自动更新
    public stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('数据更新定时器已停止');
        }
        // 保持状态，不重置lastUpdateTime
    }

    // 获取最后更新时间
    public getLastUpdateTime(): number {
        return this.lastUpdateTime;
    }

    // 刷新数据 - 产生明显不同的数据
    public refreshData() {
        // 清空历史数据
        this.dataHistory.clear();

        // 生成全新的数据状态，确保有明显变化
        this.generateFreshData();
    }

    // 生成全新的数据状态
    private generateFreshData() {
        // 重置服务器数据，使用不同的基准值
        const serverNames = [
            'web-server-01', 'web-server-02', 'db-primary', 'db-replica',
            'cache-node-01', 'cache-node-02', 'api-gateway', 'load-balancer'
        ];

        const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

        // 使用时间戳作为随机种子，确保每次刷新都不同
        const seed = Date.now();
        const randomSeeded = (min: number, max: number) => {
            const x = Math.sin(seed + Math.random()) * 10000;
            return min + (x - Math.floor(x)) * (max - min);
        };

        this.servers.value = serverNames.map((name, index) => {
            // 生成不同的基准状态
            const statusSeed = randomSeeded(0, 1);
            let status: 'healthy' | 'warning' | 'error' = 'healthy';
            let cpuBase = 20 + randomSeeded(0, 40);
            let memBase = 30 + randomSeeded(0, 40);

            if (statusSeed > 0.7) {
                status = 'warning';
                cpuBase = 60 + randomSeeded(0, 25);
                memBase = 70 + randomSeeded(0, 20);
            } else if (statusSeed > 0.85) {
                status = 'error';
                cpuBase = 80 + randomSeeded(0, 15);
                memBase = 85 + randomSeeded(0, 10);
            }

            return {
                id: `server-${index + 1}`,
                name,
                region: regions[index % regions.length] || 'us-east-1',
                metrics: {
                    cpu: Math.min(95, Math.max(5, cpuBase + randomSeeded(-10, 10))),
                    memory: Math.min(95, Math.max(10, memBase + randomSeeded(-10, 10))),
                    disk: Math.min(90, Math.max(20, 40 + randomSeeded(0, 30))),
                    networkIn: Math.max(50, randomSeeded(100, 1500)),
                    networkOut: Math.max(50, randomSeeded(100, 1200)),
                    load1m: Math.min(8, Math.max(0.1, cpuBase / 10 + randomSeeded(-1, 1))),
                    timestamp: Date.now()
                },
                status
            };
        });

        // 生成新的任务状态
        const taskNames = [
            'Database Backup', 'Log Rotation', 'Cache Cleanup', 'Security Scan',
            'Performance Analysis', 'Data Migration', 'System Update', 'Health Check'
        ];

        this.tasks.value = taskNames.map((name, index) => {
            const statusRandom = randomSeeded(0, 1);
            let status: Task['status'] = 'queued';
            let progress = 0;

            if (statusRandom > 0.6) {
                status = 'running';
                progress = Math.floor(randomSeeded(10, 90));
            } else if (statusRandom > 0.8) {
                status = 'completed';
                progress = 100;
            } else if (statusRandom > 0.95) {
                status = 'failed';
                progress = Math.floor(randomSeeded(20, 80));
            }

            return {
                id: `task-${index + 1}`,
                name,
                cluster: `cluster-${(index % 3) + 1}`,
                status,
                progress,
                startTime: Date.now() - Math.floor(randomSeeded(0, 7200000)) // 0-2小时前
            };
        });

        // 生成新的告警
        const alertMessages = [
            'High CPU usage detected',
            'Memory usage above threshold',
            'Disk space running low',
            'Network latency increased',
            'Service response time degraded',
            'Database connection pool exhausted',
            'Cache miss rate high',
            'Load balancer health check failed'
        ];

        // 随机生成3-8个新告警
        const alertCount = Math.floor(randomSeeded(3, 8));
        this.alerts.value = Array.from({ length: alertCount }, (_, index) => {
            const server = this.servers.value[Math.floor(randomSeeded(0, this.servers.value.length))];
            return {
                id: `alert-${Date.now()}-${index}`,
                timestamp: Date.now() - Math.floor(randomSeeded(0, 3600000)), // 0-1小时内
                source: server?.name || 'unknown',
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(randomSeeded(0, 4))] as Alert['severity'],
                message: alertMessages[Math.floor(randomSeeded(0, alertMessages.length))] || 'Unknown alert'
            };
        }).sort((a, b) => b.timestamp - a.timestamp);

        // 重新初始化历史数据
        this.servers.value.forEach(server => {
            const history: SystemMetrics[] = [];
            for (let i = 0; i < this.historySize; i++) {
                history.push({
                    ...server.metrics,
                    timestamp: Date.now() - (this.historySize - i) * 1000,
                    // 为历史数据添加一些变化
                    cpu: Math.max(5, Math.min(95, server.metrics.cpu + randomSeeded(-15, 15))),
                    memory: Math.max(10, Math.min(95, server.metrics.memory + randomSeeded(-10, 10))),
                    networkIn: Math.max(50, server.metrics.networkIn + randomSeeded(-200, 200)),
                    networkOut: Math.max(50, server.metrics.networkOut + randomSeeded(-150, 150))
                });
            }
            this.dataHistory.set(server.id, history);
        });
    }

    private initializeData() {
        // Initialize servers
        const serverNames = [
            'web-server-01', 'web-server-02', 'db-primary', 'db-replica',
            'cache-node-01', 'cache-node-02', 'api-gateway', 'load-balancer'
        ];

        const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

        this.servers.value = serverNames.map((name, index) => ({
            id: `server-${index + 1}`,
            name,
            region: regions[index % regions.length] || 'us-east-1',
            metrics: this.generateMetrics(),
            status: 'healthy'
        }));

        // Initialize tasks
        const taskNames = [
            'Database Backup', 'Log Rotation', 'Cache Cleanup', 'Security Scan',
            'Performance Analysis', 'Data Migration', 'System Update', 'Health Check'
        ];

        this.tasks.value = taskNames.map((name, index) => ({
            id: `task-${index + 1}`,
            name,
            cluster: `cluster-${(index % 3) + 1}`,
            status: ['queued', 'running', 'failed', 'completed'][Math.floor(Math.random() * 4)] as Task['status'],
            progress: Math.floor(Math.random() * 101),
            startTime: Date.now() - Math.floor(Math.random() * 3600000)
        }));

        // Initialize alerts
        const alertMessages = [
            'High CPU usage detected',
            'Memory usage above threshold',
            'Disk space running low',
            'Network latency increased',
            'Service response time degraded',
            'Database connection pool exhausted',
            'Cache miss rate high',
            'Load balancer health check failed'
        ];

        this.alerts.value = alertMessages.slice(0, 5).map((message, index) => ({
            id: `alert-${index + 1}`,
            timestamp: Date.now() - Math.floor(Math.random() * 1800000),
            source: this.servers.value[0]?.name || 'unknown',
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Alert['severity'],
            message
        }));

        // Initialize history
        this.servers.value.forEach(server => {
            const history: SystemMetrics[] = [];
            for (let i = 0; i < this.historySize; i++) {
                history.push({
                    ...this.generateMetrics(),
                    timestamp: Date.now() - (this.historySize - i) * 1000
                });
            }
            this.dataHistory.set(server.id, history);
        });
    }

    private generateMetrics(): SystemMetrics {
        // 生成更真实的数据变化，增加波动性
        const baseCpu = 30 + Math.random() * 40; // 基础CPU使用率 30-70%
        const baseMemory = 40 + Math.random() * 35; // 基础内存使用率 40-75%

        return {
            cpu: Math.max(5, Math.min(95, baseCpu + (Math.random() - 0.5) * 20)), // 5-95%范围，更大波动
            memory: Math.max(10, Math.min(95, baseMemory + (Math.random() - 0.5) * 15)), // 10-95%范围
            disk: Math.max(20, Math.min(90, 60 + Math.random() * 25)), // 磁盘相对稳定
            networkIn: Math.max(50, Math.random() * 1500), // 网络流量变化更大
            networkOut: Math.max(50, Math.random() * 1200),
            load1m: Math.max(0.1, Math.min(8, baseCpu / 10 + (Math.random() - 0.5) * 2)), // 负载与CPU相关
            timestamp: Date.now()
        };
    }

    public updateData() {
        // 只有在运行状态下才更新数据
        if (!systemState.value.running) {
            console.log('系统状态为暂停，跳过数据更新');
            return;
        }

        this.servers.value.forEach(server => {
            const newMetrics = this.generateMetrics();
            server.metrics = newMetrics;

            // Update server status based on enhanced health rules
            // 健康度规则：cpu > 85% 或 mem > 90% 或 load1m > 5 判为不健康
            if (newMetrics.cpu > 85 || newMetrics.memory > 90 || newMetrics.load1m > 5) {
                server.status = 'error';
            } else if (newMetrics.cpu > 70 || newMetrics.memory > 80 || newMetrics.load1m > 3) {
                server.status = 'warning';
            } else {
                server.status = 'healthy';
            }

            // Update real-time history
            const realTimeHistory = this.realTimeHistoryRef.value.get(server.id) || [];
            const newRealTimeHistory = [...realTimeHistory, newMetrics];
            if (newRealTimeHistory.length > this.historySize) {
                newRealTimeHistory.shift();
            }
            this.realTimeHistoryRef.value.set(server.id, newRealTimeHistory);

            // Update legacy history for backward compatibility
            const history = this.dataHistory.get(server.id) || [];
            history.push(newMetrics);
            if (history.length > this.historySize) {
                history.shift();
            }
            this.dataHistory.set(server.id, history);
        });

        // Update tasks
        this.tasks.value.forEach(task => {
            if (task.status === 'running') {
                task.progress = Math.min(100, task.progress + Math.floor(Math.random() * 5));
                if (task.progress === 100) {
                    task.status = 'completed';
                }
            } else if (task.status === 'queued' && Math.random() < 0.1) {
                task.status = 'running';
            } else if (task.status === 'completed' && Math.random() < 0.05) {
                task.status = 'queued';
                task.progress = 0;
                task.startTime = Date.now();
            }
        });

        // Occasionally generate new alerts
        if (Math.random() < 0.02) {
            const alertMessages = [
                'High CPU usage detected',
                'Memory usage above threshold',
                'Disk space running low',
                'Network latency increased',
                'Service response time degraded'
            ];

            const server = this.servers.value[Math.floor(Math.random() * this.servers.value.length)] || this.servers.value[0];
            const newAlert: Alert = {
                id: `alert-${Date.now()}`,
                timestamp: Date.now(),
                source: server?.name || 'unknown',
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Alert['severity'],
                message: alertMessages[Math.floor(Math.random() * alertMessages.length)] || 'Unknown alert'
            };

            this.alerts.value.unshift(newAlert);
            if (this.alerts.value.length > 50) {
                this.alerts.value.pop();
            }
        }
    }

    public getServers(): ServerData[] {
        return this.servers.value;
    }

    public getServerHistory(serverId: string, timeRange?: { start: number; end: number }): SystemMetrics[] {
        const history = this.dataHistory.get(serverId) || [];

        if (!timeRange) {
            return history;
        }

        return history.filter(metric =>
            metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
        );
    }

    public getAggregatedMetrics(): SystemMetrics {
        const totalServers = this.servers.value.length;
        if (totalServers === 0) return this.generateMetrics();

        const aggregated = this.servers.value.reduce((acc, server) => ({
            cpu: acc.cpu + server.metrics.cpu,
            memory: acc.memory + server.metrics.memory,
            disk: acc.disk + server.metrics.disk,
            networkIn: acc.networkIn + server.metrics.networkIn,
            networkOut: acc.networkOut + server.metrics.networkOut,
            load1m: acc.load1m + server.metrics.load1m,
            timestamp: Date.now()
        }), { cpu: 0, memory: 0, disk: 0, networkIn: 0, networkOut: 0, load1m: 0, timestamp: Date.now() });

        return {
            cpu: aggregated.cpu / totalServers,
            memory: aggregated.memory / totalServers,
            disk: aggregated.disk / totalServers,
            networkIn: aggregated.networkIn / totalServers,
            networkOut: aggregated.networkOut / totalServers,
            load1m: aggregated.load1m / totalServers,
            timestamp: Date.now()
        };
    }

    public getTasks(filter?: string): Task[] {
        if (!filter) return this.tasks.value;

        const lowerFilter = filter.toLowerCase();
        return this.tasks.value.filter(task =>
            task.name.toLowerCase().includes(lowerFilter) ||
            task.cluster.toLowerCase().includes(lowerFilter) ||
            task.status.toLowerCase().includes(lowerFilter)
        );
    }

    public getAlerts(): Alert[] {
        return this.alerts.value.sort((a, b) => b.timestamp - a.timestamp);
    }

    // 增强的健康状态检查，基于阈值规则实时变化
    public getHealthStatus(): { overall: 'healthy' | 'warning' | 'error'; message: string } {
        const totalServers = this.servers.value.length;

        // 健康度规则示例：cpu > 85% 或 mem > 90% 或 load1m > 5 判为不健康
        const criticalServers = this.servers.value.filter(server =>
            server.metrics.cpu > 85 ||
            server.metrics.memory > 90 ||
            server.metrics.load1m > 5
        );

        const warningServers = this.servers.value.filter(server =>
            server.metrics.cpu > 70 ||
            server.metrics.memory > 80 ||
            server.metrics.load1m > 3
        );

        if (criticalServers.length > 0) {
            const criticalDetails = criticalServers.map(s =>
                `${s.name}(CPU:${s.metrics.cpu.toFixed(1)}%, MEM:${s.metrics.memory.toFixed(1)}%, LOAD:${s.metrics.load1m.toFixed(2)})`
            ).join(', ');
            return {
                overall: 'error',
                message: `${criticalServers.length} server(s) critical: ${criticalDetails}`
            };
        } else if (warningServers.length > 0) {
            return {
                overall: 'warning',
                message: `${warningServers.length} server(s) need attention (cpu > 70% or mem > 80% or load1m > 3)`
            };
        } else {
            return {
                overall: 'healthy',
                message: `All ${totalServers} systems operational`
            };
        }
    }

    // 增强的负载均衡状态检查，基于网络流量分布
    public getLoadBalanceStatus(): { status: 'balanced' | 'skewed'; message: string } {
        // 统计各服务器 netIn/netOut 分布，若最大值/最小值比值 > 3 视为"倾斜"
        const networkValues = this.servers.value.map(s => s.metrics.networkIn + s.metrics.networkOut);
        const max = Math.max(...networkValues);
        const min = Math.min(...networkValues);

        if (min === 0 || this.servers.value.length === 0) {
            return { status: 'balanced', message: 'Load distribution normal' };
        }

        const ratio = max / min;

        if (ratio > 3) {
            // 找出流量最大和最小的服务器
            const maxServer = this.servers.value.find(s => (s.metrics.networkIn + s.metrics.networkOut) === max);
            const minServer = this.servers.value.find(s => (s.metrics.networkIn + s.metrics.networkOut) === min);

            return {
                status: 'skewed',
                message: `Load imbalance: ${maxServer?.name}(${(max / 1024).toFixed(1)}KB/s) vs ${minServer?.name}(${(min / 1024).toFixed(1)}KB/s), ratio: ${ratio.toFixed(2)}x`
            };
        } else {
            return {
                status: 'balanced',
                message: `Load distribution balanced (ratio: ${ratio.toFixed(2)}x)`
            };
        }
    }

    // 获取更新状态信息
    public getUpdateStatus(): { isUpdating: boolean; lastUpdate: number; updateInterval: number } {
        return {
            isUpdating: this.updateInterval !== null,
            lastUpdate: this.lastUpdateTime,
            updateInterval: 1500 // 1.5秒
        };
    }

    // 获取历史数据时间范围
    public getHistoryTimeRange(): { start: number; end: number; availableMinutes: number } {
        const now = Date.now();
        const availableMinutes = Math.min(15, Math.floor(this.historySize / 60)); // 最多15分钟
        const start = now - (availableMinutes * 60 * 1000);

        return {
            start,
            end: now,
            availableMinutes
        };
    }

    // 获取指定时间范围的历史数据
    public getHistoricalData(timeRangeMinutes: number): {
        servers: ServerData[];
        aggregatedMetrics: SystemMetrics[];
        timeRange: { start: number; end: number }
    } {
        const now = Date.now();
        const end = now;
        const start = now - (timeRangeMinutes * 60 * 1000);

        // 获取历史指标数据
        const historicalMetrics: SystemMetrics[] = [];
        for (let i = 0; i < timeRangeMinutes * 60; i++) {
            const timestamp = start + (i * 1000);
            const serverStates = this.servers.value.map(server => {
                const history = this.dataHistory.get(server.id);
                const historicalPoint = history?.find(m =>
                    Math.abs(m.timestamp - timestamp) < 1000
                );

                return {
                    id: server.id,
                    name: server.name,
                    region: server.region,
                    metrics: historicalPoint || server.metrics,
                    status: this.getServerStatus(historicalPoint || server.metrics)
                };
            });

            // 计算该时间点的聚合指标
            const totalServers = serverStates.length;
            const aggregated = serverStates.reduce((acc, server) => ({
                cpu: acc.cpu + server.metrics.cpu,
                memory: acc.memory + server.metrics.memory,
                disk: acc.disk + server.metrics.disk,
                networkIn: acc.networkIn + server.metrics.networkIn,
                networkOut: acc.networkOut + server.metrics.networkOut,
                load1m: acc.load1m + server.metrics.load1m,
                timestamp
            }), { cpu: 0, memory: 0, disk: 0, networkIn: 0, networkOut: 0, load1m: 0, timestamp });

            historicalMetrics.push({
                cpu: aggregated.cpu / totalServers,
                memory: aggregated.memory / totalServers,
                disk: aggregated.disk / totalServers,
                networkIn: aggregated.networkIn / totalServers,
                networkOut: aggregated.networkOut / totalServers,
                load1m: aggregated.load1m / totalServers,
                timestamp
            });
        }

        return {
            servers: this.servers.value.map(server => {
                const history = this.dataHistory.get(server.id) || [];
                const timeRangeHistory = history.filter(m =>
                    m.timestamp >= start && m.timestamp <= end
                );
                return {
                    ...server,
                    metrics: timeRangeHistory[timeRangeHistory.length - 1] || server.metrics
                };
            }),
            aggregatedMetrics: historicalMetrics,
            timeRange: { start, end }
        };
    }

    private getServerStatus(metrics: SystemMetrics): 'healthy' | 'warning' | 'error' {
        if (metrics.cpu > 85 || metrics.memory > 90 || metrics.load1m > 5) {
            return 'error';
        } else if (metrics.cpu > 70 || metrics.memory > 80 || metrics.load1m > 3) {
            return 'warning';
        } else {
            return 'healthy';
        }
    }

    // 新增：获取当前活跃的历史数据源
    public getActiveHistoryData(): Map<string, SystemMetrics[]> {
        const viewMode = systemState.value.viewMode;
        if (viewMode === 'historical') {
            return this.playbackHistoryRef.value;
        } else {
            return this.realTimeHistoryRef.value;
        }
    }

    // 新增：创建历史快照
    public createHistoricalSnapshot(timeRangeMinutes: number) {
        console.log('创建历史快照，时间范围:', timeRangeMinutes, '分钟');
        const snapshot = this.getHistoricalData(timeRangeMinutes);
        this.historicalSnapshotRef.value = snapshot;

        // 更新播放历史数据
        const playbackHistory = new Map<string, SystemMetrics[]>();
        snapshot.servers.forEach(server => {
            const serverHistory = this.getServerHistory(server.id, snapshot.timeRange);
            playbackHistory.set(server.id, serverHistory);
        });
        this.playbackHistoryRef.value = playbackHistory;

        console.log('历史快照创建完成，数据点数量:', snapshot.aggregatedMetrics.length);
    }

    // 新增：获取根据当前状态过滤的时序数据
    public getFilteredTimeSeriesData(): SystemMetrics[] {
        const viewMode = systemState.value.viewMode;
        const selectedServerId = systemState.value.selectedServerId;
        const timeRangeStart = systemState.value.timeRangeStart;
        const timeRangeEnd = systemState.value.timeRangeEnd;

        console.log('获取过滤时序数据 - 模式:', viewMode, '服务器:', selectedServerId);

        let sourceData: SystemMetrics[] = [];

        if (viewMode === 'historical' && this.historicalSnapshotRef.value) {
            // 历史模式：使用快照数据
            sourceData = this.historicalSnapshotRef.value.aggregatedMetrics;
            console.log('使用历史快照数据，数据点:', sourceData.length);
        } else {
            // 实时模式：使用实时数据
            const activeHistory = this.getActiveHistoryData();
            const allHistoryData: SystemMetrics[] = [];

            // 合并所有服务器的历史数据
            activeHistory.forEach((history, serverId) => {
                if (!selectedServerId || serverId === selectedServerId) {
                    allHistoryData.push(...history);
                }
            });

            // 按时间戳排序并去重
            const uniqueData = new Map<number, SystemMetrics>();
            allHistoryData.forEach(metric => {
                if (!uniqueData.has(metric.timestamp)) {
                    uniqueData.set(metric.timestamp, metric);
                }
            });

            sourceData = Array.from(uniqueData.values()).sort((a, b) => a.timestamp - b.timestamp);
            console.log('使用实时数据，数据点:', sourceData.length);
        }

        // 应用时间范围过滤
        if (timeRangeStart && timeRangeEnd) {
            sourceData = sourceData.filter(metric =>
                metric.timestamp >= timeRangeStart && metric.timestamp <= timeRangeEnd
            );
            console.log('时间范围过滤后数据点:', sourceData.length);
        }

        // 限制数据点数量以提高性能
        if (sourceData.length > 300) {
            sourceData = sourceData.slice(-300);
        }

        return sourceData;
    }

    // 新增：获取过滤后的服务器数据
    public getFilteredServers(): ServerData[] {
        const selectedServerId = systemState.value.selectedServerId;
        const viewMode = systemState.value.viewMode;

        let servers = this.servers.value;

        if (viewMode === 'historical' && this.historicalSnapshotRef.value) {
            servers = this.historicalSnapshotRef.value.servers;
        }

        if (selectedServerId) {
            servers = servers.filter(server => server.id === selectedServerId);
        }

        return servers;
    }

    // 新增：初始化实时历史数据
    public initializeRealTimeHistory() {
        this.servers.value.forEach(server => {
            const initialHistory: SystemMetrics[] = [];
            for (let i = 0; i < 60; i++) { // 初始1分钟数据
                initialHistory.push({
                    ...server.metrics,
                    timestamp: Date.now() - (60 - i) * 1000
                });
            }
            this.realTimeHistoryRef.value.set(server.id, initialHistory);
        });
        console.log('实时历史数据初始化完成');
    }

    // 新增：初始化computed视图层
    public initializeComputedViews() {
        // activeServers - 根据当前状态过滤的服务器数据
        this.activeServers = computed(() => {
            const selectedServerId = systemState.value.selectedServerId;
            const viewMode = systemState.value.viewMode;

            let servers = this.baseServersRef.value;

            if (viewMode === 'historical' && this.historicalSnapshotRef.value) {
                servers = this.historicalSnapshotRef.value.servers;
            }

            if (selectedServerId) {
                servers = servers.filter(server => server.id === selectedServerId);
            }

            return servers;
        });

        // activeHistory - 根据当前状态过滤的历史数据
        this.activeHistory = computed(() => {
            const viewMode = systemState.value.viewMode;
            const selectedServerId = systemState.value.selectedServerId;
            const timeRangeStart = systemState.value.timeRangeStart;
            const timeRangeEnd = systemState.value.timeRangeEnd;
            const playbackIndex = systemState.value.playbackIndex;

            let sourceHistory = new Map<string, SystemMetrics[]>();

            if (viewMode === 'historical') {
                sourceHistory = this.playbackHistoryRef.value;

                // 在历史回放模式下，根据playbackIndex切片数据
                if (playbackIndex > 0) {
                    const slicedHistory = new Map<string, SystemMetrics[]>();
                    sourceHistory.forEach((history, serverId) => {
                        const endIndex = Math.min(playbackIndex, history.length);
                        slicedHistory.set(serverId, history.slice(0, endIndex));
                    });
                    sourceHistory = slicedHistory;
                }
            } else {
                sourceHistory = this.realTimeHistoryRef.value;
            }

            // 应用服务器筛选
            if (selectedServerId) {
                const filteredHistory = new Map<string, SystemMetrics[]>();
                const serverHistory = sourceHistory.get(selectedServerId);
                if (serverHistory) {
                    filteredHistory.set(selectedServerId, serverHistory);
                }
                sourceHistory = filteredHistory;
            }

            // 应用时间范围筛选
            if (timeRangeStart && timeRangeEnd) {
                const timeFilteredHistory = new Map<string, SystemMetrics[]>();
                sourceHistory.forEach((history, serverId) => {
                    const filteredData = history.filter(metric =>
                        metric.timestamp >= timeRangeStart && metric.timestamp <= timeRangeEnd
                    );
                    if (filteredData.length > 0) {
                        timeFilteredHistory.set(serverId, filteredData);
                    }
                });
                sourceHistory = timeFilteredHistory;
            }

            return sourceHistory;
        });

        console.log('Computed视图层初始化完成');
    }

    // 公开的computed属性
    public activeServers: any;
    public activeHistory: any;
}

export const dataService = new DataService();
