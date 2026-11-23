import {
  ServerMetric,
  MetricDataPoint,
  DiskPartition,
  MonitoredApplication,
  MetricStatus,
} from "@/types/monitoring";
import { PrometheusVectorResult, PrometheusMatrixResult } from "./client";
import { mockApplications } from "@/lib/mock-data";

/**
 * Helper Transformer: Mengubah data Prometheus mentah menjadi tipe data UI ServerWatch
 */

export function extractVectorValue(result: PrometheusVectorResult[] | undefined, fallback = 0): number {
  if (!result || result.length === 0 || !result[0].value) return fallback;
  const val = parseFloat(result[0].value[1]);
  return isNaN(val) ? fallback : val;
}

export function formatBytes(bytes: number, decimals = 1): { value: number; formatted: string } {
  if (bytes <= 0) return { value: 0, formatted: "0 B" };
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  return { value: val, formatted: `${val} ${sizes[i]}` };
}

/**
 * Format bytes to GiB (standard RAM display)
 */
export function formatBytesToGiB(bytes: number): string {
  const gib = bytes / (1024 * 1024 * 1024);
  return `${gib.toFixed(2)} GiB`;
}

/**
 * Transform data instant query ke 4 Overview Metric Cards
 */
export function transformOverviewMetrics(data: {
  cpuUsage: number;
  memTotal: number;
  memAvail: number;
  memCached: number;
  diskTotal: number;
  diskAvail: number;
  netRx: number; // bytes/sec
  netTx: number; // bytes/sec
  load1: number;
  load5: number;
  load15: number;
}): ServerMetric[] {
  const memUsedBytes = Math.max(0, data.memTotal - data.memAvail);
  const memUsagePercent = data.memTotal > 0 ? (memUsedBytes / data.memTotal) * 100 : 0;

  const diskUsedBytes = Math.max(0, data.diskTotal - data.diskAvail);
  const diskUsagePercent = data.diskTotal > 0 ? (diskUsedBytes / data.diskTotal) * 100 : 0;

  const netTotalBytesPerSec = data.netRx + data.netTx;
  const netRxFormatted = formatBytes(data.netRx);
  const netTxFormatted = formatBytes(data.netTx);
  const netTotalFormatted = formatBytes(netTotalBytesPerSec);

  // Status evaluasi
  const getStatus = (val: number, warnThreshold = 75, critThreshold = 90): MetricStatus => {
    if (val >= critThreshold) return "critical";
    if (val >= warnThreshold) return "warning";
    return "healthy";
  };

  return [
    {
      id: "cpu",
      label: "CPU Usage",
      value: Number(data.cpuUsage.toFixed(1)),
      unit: "%",
      formattedValue: `${data.cpuUsage.toFixed(1)}%`,
      status: getStatus(data.cpuUsage, 80, 95),
      statusText: data.cpuUsage > 80 ? "Heavy Load" : "Normal Load",
      detail: `2 vCPU (Load avg: ${data.load1.toFixed(2)}, ${data.load5.toFixed(2)}, ${data.load15.toFixed(2)})`,
    },
    {
      id: "memory",
      label: "Memory Usage",
      value: Number(memUsagePercent.toFixed(1)),
      unit: "%",
      formattedValue: `${formatBytesToGiB(memUsedBytes)} / ${formatBytesToGiB(data.memTotal)}`,
      status: getStatus(memUsagePercent, 80, 95),
      statusText: memUsagePercent > 80 ? "High Memory" : "Stable Allocation",
      detail: `Used: ${formatBytesToGiB(memUsedBytes)} • Cache: ${formatBytesToGiB(data.memCached)} • Free: ${formatBytesToGiB(data.memAvail)}`,
    },
    {
      id: "disk",
      label: "Disk Usage",
      value: Number(diskUsagePercent.toFixed(1)),
      unit: "%",
      formattedValue: `${(diskUsedBytes / 1e9).toFixed(1)} / ${(data.diskTotal / 1e9).toFixed(1)} GB`,
      status: getStatus(diskUsagePercent, 80, 90),
      statusText: diskUsagePercent > 80 ? "Attention Needed" : "Adequate Free Space",
      detail: `Root (/) partition • ${(data.diskAvail / 1e9).toFixed(1)} GB available`,
    },
    {
      id: "network",
      label: "Network Traffic",
      value: Number(netTotalFormatted.value.toFixed(1)),
      unit: netTotalFormatted.formatted.split(" ")[1] || "KB/s",
      formattedValue: netTotalFormatted.formatted + "/s",
      status: "healthy",
      statusText: "Steady Flow",
      detail: `Rx: ${netRxFormatted.formatted}/s • Tx: ${netTxFormatted.formatted}/s`,
    },
  ];
}

/**
 * Transform range query data ke format MetricDataPoint Recharts
 */
export function transformRangeTrend(
  cpuMatrix: PrometheusMatrixResult[],
  memMatrix: PrometheusMatrixResult[],
  netRxMatrix: PrometheusMatrixResult[],
  netTxMatrix: PrometheusMatrixResult[],
  diskPercentFallback = 42.7
): MetricDataPoint[] {
  const pointsMap = new Map<number, Partial<MetricDataPoint>>();

  // Extract CPU series
  if (cpuMatrix.length > 0 && cpuMatrix[0].values) {
    for (const [timestamp, val] of cpuMatrix[0].values) {
      pointsMap.set(timestamp, {
        timestamp: new Date(timestamp * 1000).toISOString(),
        time: new Date(timestamp * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        cpu: Number(parseFloat(val).toFixed(1)),
      });
    }
  }

  // Extract Memory series
  if (memMatrix.length > 0 && memMatrix[0].values) {
    for (const [timestamp, val] of memMatrix[0].values) {
      const existing = pointsMap.get(timestamp) || {
        timestamp: new Date(timestamp * 1000).toISOString(),
        time: new Date(timestamp * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      existing.memory = Number(parseFloat(val).toFixed(1));
      pointsMap.set(timestamp, existing);
    }
  }

  // Extract Network Rx
  if (netRxMatrix.length > 0 && netRxMatrix[0].values) {
    for (const [timestamp, val] of netRxMatrix[0].values) {
      const existing = pointsMap.get(timestamp);
      if (existing) {
        existing.networkRx = Number((parseFloat(val) / 1024).toFixed(0)); // KB/s
      }
    }
  }

  // Extract Network Tx
  if (netTxMatrix.length > 0 && netTxMatrix[0].values) {
    for (const [timestamp, val] of netTxMatrix[0].values) {
      const existing = pointsMap.get(timestamp);
      if (existing) {
        existing.networkTx = Number((parseFloat(val) / 1024).toFixed(0)); // KB/s
      }
    }
  }

  const sortedPoints: MetricDataPoint[] = Array.from(pointsMap.entries())
    .sort(([t1], [t2]) => t1 - t2)
    .map(([, pt]) => ({
      timestamp: pt.timestamp || "",
      time: pt.time || "",
      cpu: pt.cpu ?? 0,
      memory: pt.memory ?? 0,
      disk: diskPercentFallback,
      networkRx: pt.networkRx ?? 0,
      networkTx: pt.networkTx ?? 0,
    }));

  return sortedPoints;
}

/**
 * Menggabungkan metrik cAdvisor container Docker aktual dengan daftar aplikasi PM2
 */
export function mergeContainerMetrics(
  cadvisorCpu: PrometheusVectorResult[],
  cadvisorMem: PrometheusVectorResult[]
): MonitoredApplication[] {
  // Peta hasil cAdvisor: key = container name
  const cpuMap = new Map<string, number>();
  const memMap = new Map<string, number>();

  for (const c of cadvisorCpu) {
    const rawName = c.metric.name || c.metric.id || "";
    const cleanName = rawName.replace(/^\//, "");
    if (cleanName) {
      cpuMap.set(cleanName, parseFloat(c.value[1]) || 0);
    }
  }

  for (const m of cadvisorMem) {
    const rawName = m.metric.name || m.metric.id || "";
    const cleanName = rawName.replace(/^\//, "");
    if (cleanName) {
      memMap.set(cleanName, parseFloat(m.value[1]) || 0);
    }
  }

  const HOST_RAM_BYTES = 7.8 * 1024 * 1024 * 1024; // 7.8 GiB

  return mockApplications.map((app) => {
    if (app.type !== "docker") {
      // Pertahankan workload PM2 (akan diintegrasikan khusus pada Phase 4)
      return app;
    }

    // Jika container Docker ditemukan di cAdvisor
    const actualCpu = cpuMap.get(app.name);
    const actualMemBytes = memMap.get(app.name);

    if (actualCpu !== undefined || actualMemBytes !== undefined) {
      const cpuUsage = actualCpu !== undefined ? Number(actualCpu.toFixed(1)) : app.cpuUsage;
      const memBytes = actualMemBytes !== undefined ? actualMemBytes : 0;
      const memUsagePercent = Number(((memBytes / HOST_RAM_BYTES) * 100).toFixed(1));
      const formattedMem = formatBytes(memBytes);

      return {
        ...app,
        cpuUsage,
        memoryUsage: memUsagePercent,
        memoryRaw: formattedMem.formatted,
        status: "healthy" as MetricStatus,
        statusText: "Running (Prometheus)",
        lastUpdated: "Just now",
      };
    }

    return app;
  });
}
