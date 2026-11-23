export type MetricStatus = "healthy" | "warning" | "critical" | "unknown";

export interface ServerMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  formattedValue: string;
  status: MetricStatus;
  statusText?: string;
  change?: string;
  trend?: "up" | "down" | "stable";
  detail?: string;
}

export interface MetricDataPoint {
  timestamp: string;
  time: string;
  cpu: number;
  memory: number;
  disk?: number;
  networkRx?: number; // KB/s
  networkTx?: number; // KB/s
}

export interface MonitoredApplication {
  id: string;
  name: string;
  type: "docker" | "pm2";
  category?: "business" | "monitoring"; // Pembeda antara workload bisnis dan stack monitoring
  image?: string;
  containerId?: string;
  port?: string;
  cpuUsage: number;
  memoryUsage: number; // Persentase penggunaan RAM container/proses terhadap total RAM VPS (7.8 GiB)
  memoryRaw: string;   // Penggunaan RAM aktual container/proses (misal: "245 MB")
  status: MetricStatus;
  statusText: string;
  uptime: string;
  restartCount: number;
  lastUpdated: string;
}

export interface DiskPartition {
  filesystem: string;
  mount: string;
  size: string;
  used: string;
  available: string;
  usePercent: number;
}

export interface ServerSystemInfo {
  hostname: string;
  ipAddress: string;
  os: string;
  kernel: string;
  uptime: string;
  cores: number;
  totalMemory: string;
  totalDisk: string;
  cpuModel: string;
}
