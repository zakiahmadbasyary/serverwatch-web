import {
  ServerMetric,
  MetricDataPoint,
  MonitoredApplication,
  DiskPartition,
  ServerSystemInfo,
} from "@/types/monitoring";

/**
 * Empty Default State
 * Tidak ada data dummy. Jika data asli belum tersedia dari Prometheus,
 * nilai dikosongkan (empty state) sesuai arahan pengguna.
 */

export const mockSystemInfo: ServerSystemInfo = {
  hostname: "-",
  ipAddress: "-",
  os: "-",
  kernel: "-",
  uptime: "-",
  cores: 0,
  totalMemory: "-",
  totalDisk: "-",
  cpuModel: "-",
};

export const mockOverviewMetrics: ServerMetric[] = [
  {
    id: "cpu",
    label: "CPU Usage",
    value: 0,
    unit: "%",
    formattedValue: "- %",
    status: "unknown",
    statusText: "No Connection",
    detail: "Menunggu koneksi Prometheus",
  },
  {
    id: "memory",
    label: "Memory Usage",
    value: 0,
    unit: "%",
    formattedValue: "- / - GiB",
    status: "unknown",
    statusText: "No Connection",
    detail: "Menunggu koneksi Prometheus",
  },
  {
    id: "disk",
    label: "Disk Usage",
    value: 0,
    unit: "%",
    formattedValue: "- / - GB",
    status: "unknown",
    statusText: "No Connection",
    detail: "Menunggu koneksi Prometheus",
  },
  {
    id: "network",
    label: "Network Traffic",
    value: 0,
    unit: "KB/s",
    formattedValue: "- KB/s",
    status: "unknown",
    statusText: "No Connection",
    detail: "Menunggu koneksi Prometheus",
  },
];

export const mockTrendData: MetricDataPoint[] = [];

export const mockDiskPartitions: DiskPartition[] = [];

export const mockApplications: MonitoredApplication[] = [];
