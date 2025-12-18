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

class DataService {
    private servers: ServerData[] = [];
    private tasks: Task[] = [];
    private alerts: Alert[] = [];
    private historySize = 300; // 5 minutes at 1 second intervals
    private dataHistory: Map<string, SystemMetrics[]> = new Map();
    private updateInterval: number | null = null;
    private lastUpdateTime: number = 0;

    constructor() {
        this.initializeData();
        this.startAutoUpdate();
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
            if (systemState.value.running) {
                try {
                    this.updateData();
                    this.lastUpdateTime = Date.now();
                } catch (error) {
                    console.error('数据更新失败:', error);
                    // 不中断更新，继续下次尝试
                }
            }
        }, 1500); // 1.5秒更新间隔，满足1-2秒要求
    }

    // 停止自动更新
    public stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        // 保持状态，不重置lastUpdateTime
    }

    // 获取最后更新时间
    public getLastUpdateTime(): number {
        return this.lastUpdateTime;
    }

    // 刷新数据
    public refreshData() {
        // 清空历史数据
        this.dataHistory.clear();

        // 重新初始化数据
        this.servers = [];
        this.tasks = [];
        this.alerts = [];

        this.initializeData();
    }

    private initializeData() {
        // Initialize servers
        const serverNames = [
            'web-server-01', 'web-server-02', 'db-primary', 'db-replica',
            'cache-node-01', 'cache-node-02', 'api-gateway', 'load-balancer'
        ];

        const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

        this.servers = serverNames.map((name, index) => ({
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

        this.tasks = taskNames.map((name, index) => ({
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

        this.alerts = alertMessages.slice(0, 5).map((message, index) => ({
            id: `alert-${index + 1}`,
            timestamp: Date.now() - Math.floor(Math.random() * 1800000),
            source: this.servers[0]?.name || 'unknown',
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Alert['severity'],
            message
        }));

        // Initialize history
        this.servers.forEach(server => {
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
        return {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            disk: Math.random() * 100,
            networkIn: Math.random() * 1000,
            networkOut: Math.random() * 1000,
            load1m: Math.random() * 10,
            timestamp: Date.now()
        };
    }

    public updateData() {
        this.servers.forEach(server => {
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

            // Update history
            const history = this.dataHistory.get(server.id) || [];
            history.push(newMetrics);
            if (history.length > this.historySize) {
                history.shift();
            }
            this.dataHistory.set(server.id, history);
        });

        // Update tasks
        this.tasks.forEach(task => {
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

            const server = this.servers[Math.floor(Math.random() * this.servers.length)] || this.servers[0];
            const newAlert: Alert = {
                id: `alert-${Date.now()}`,
                timestamp: Date.now(),
                source: server?.name || 'unknown',
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Alert['severity'],
                message: alertMessages[Math.floor(Math.random() * alertMessages.length)] || 'Unknown alert'
            };

            this.alerts.unshift(newAlert);
            if (this.alerts.length > 50) {
                this.alerts.pop();
            }
        }
    }

    public getServers(): ServerData[] {
        return this.servers;
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
        const totalServers = this.servers.length;
        if (totalServers === 0) return this.generateMetrics();

        const aggregated = this.servers.reduce((acc, server) => ({
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
        if (!filter) return this.tasks;

        const lowerFilter = filter.toLowerCase();
        return this.tasks.filter(task =>
            task.name.toLowerCase().includes(lowerFilter) ||
            task.cluster.toLowerCase().includes(lowerFilter) ||
            task.status.toLowerCase().includes(lowerFilter)
        );
    }

    public getAlerts(): Alert[] {
        return this.alerts.sort((a, b) => b.timestamp - a.timestamp);
    }

    // 增强的健康状态检查，基于阈值规则实时变化
    public getHealthStatus(): { overall: 'healthy' | 'warning' | 'error'; message: string } {
        const totalServers = this.servers.length;

        // 健康度规则示例：cpu > 85% 或 mem > 90% 或 load1m > 5 判为不健康
        const criticalServers = this.servers.filter(server =>
            server.metrics.cpu > 85 ||
            server.metrics.memory > 90 ||
            server.metrics.load1m > 5
        );

        const warningServers = this.servers.filter(server =>
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
        const networkValues = this.servers.map(s => s.metrics.networkIn + s.metrics.networkOut);
        const max = Math.max(...networkValues);
        const min = Math.min(...networkValues);

        if (min === 0 || this.servers.length === 0) {
            return { status: 'balanced', message: 'Load distribution normal' };
        }

        const ratio = max / min;

        if (ratio > 3) {
            // 找出流量最大和最小的服务器
            const maxServer = this.servers.find(s => (s.metrics.networkIn + s.metrics.networkOut) === max);
            const minServer = this.servers.find(s => (s.metrics.networkIn + s.metrics.networkOut) === min);

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
            const serverStates = this.servers.map(server => {
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
            servers: this.servers.map(server => {
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
}

export const dataService = new DataService();
