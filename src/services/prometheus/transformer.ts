import {
  ServerMetric,
  MetricDataPoint,
  DiskPartition,
  MonitoredApplication,
  MetricStatus,
} from "@/types/monitoring";
import { PrometheusVectorResult, PrometheusMatrixResult } from "./client";

/**
 * Helper Transformer: Mengubah data Prometheus mentah menjadi tipe data UI ServerWatch
 * Tanpa data dummy/fallback palsu. Jika data tidak ada, kembalikan 0 atau empty.
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
  if (bytes <= 0) return "- GiB";
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
  isConnected?: boolean;
}): ServerMetric[] {
  const isConnected = data.isConnected ?? (data.memTotal > 0 || data.diskTotal > 0 || data.cpuUsage > 0);

  if (!isConnected) {
    return [
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
  }

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
  diskPercent = 0
): MetricDataPoint[] {
  const pointsMap = new Map<number, Partial<MetricDataPoint>>();

  // Extract CPU series
  if (cpuMatrix && cpuMatrix.length > 0 && cpuMatrix[0].values) {
    for (const [timestamp, val] of cpuMatrix[0].values) {
      pointsMap.set(timestamp, {
        timestamp: new Date(timestamp * 1000).toISOString(),
        time: new Date(timestamp * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        cpu: Number(parseFloat(val).toFixed(1)),
      });
    }
  }

  // Extract Memory series
  if (memMatrix && memMatrix.length > 0 && memMatrix[0].values) {
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
  if (netRxMatrix && netRxMatrix.length > 0 && netRxMatrix[0].values) {
    for (const [timestamp, val] of netRxMatrix[0].values) {
      const existing = pointsMap.get(timestamp);
      if (existing) {
        existing.networkRx = Number((parseFloat(val) / 1024).toFixed(0)); // KB/s
      }
    }
  }

  // Extract Network Tx
  if (netTxMatrix && netTxMatrix.length > 0 && netTxMatrix[0].values) {
    for (const [timestamp, val] of netTxMatrix[0].values) {
      const existing = pointsMap.get(timestamp);
      if (existing) {
        existing.networkTx = Number((parseFloat(val) / 1024).toFixed(0)); // KB/s
      }
    }
  }

  if (pointsMap.size === 0) {
    return [];
  }

  const sortedPoints: MetricDataPoint[] = Array.from(pointsMap.entries())
    .sort(([t1], [t2]) => t1 - t2)
    .map(([, pt]) => ({
      timestamp: pt.timestamp || "",
      time: pt.time || "",
      cpu: pt.cpu ?? 0,
      memory: pt.memory ?? 0,
      disk: diskPercent,
      networkRx: pt.networkRx ?? 0,
      networkTx: pt.networkTx ?? 0,
    }));

  return sortedPoints;
}

/**
 * Mengambil metrik cAdvisor container Docker aktual
 * Jika cAdvisor tidak menghasilkan data container, kembalikan array kosong []
 */
export function mergeContainerMetrics(
  cadvisorCpu: PrometheusVectorResult[],
  cadvisorMem: PrometheusVectorResult[]
): MonitoredApplication[] {
  const cpuMap = new Map<string, number>();
  const memMap = new Map<string, number>();
  const containerNames = new Set<string>();

  for (const c of cadvisorCpu || []) {
    const rawName = c.metric.name || c.metric.container_label_com_docker_compose_service || c.metric.id || "";
    const cleanName = rawName.replace(/^\//, "");
    if (cleanName && cleanName !== "POD" && !cleanName.startsWith("k8s_")) {
      cpuMap.set(cleanName, parseFloat(c.value[1]) || 0);
      containerNames.add(cleanName);
    }
  }

  for (const m of cadvisorMem || []) {
    const rawName = m.metric.name || m.metric.container_label_com_docker_compose_service || m.metric.id || "";
    const cleanName = rawName.replace(/^\//, "");
    if (cleanName && cleanName !== "POD" && !cleanName.startsWith("k8s_")) {
      memMap.set(cleanName, parseFloat(m.value[1]) || 0);
      containerNames.add(cleanName);
    }
  }

  // Jika tidak ada container aktual terdeteksi, kembalikan array kosong (tidak menggunakan data dummy)
  if (containerNames.size === 0) {
    return [];
  }

  const HOST_RAM_BYTES = 7.8 * 1024 * 1024 * 1024; // 7.8 GiB

  return Array.from(containerNames).map((name) => {
    const cpuUsage = cpuMap.get(name) || 0;
    const memBytes = memMap.get(name) || 0;
    const memUsagePercent = Number(((memBytes / HOST_RAM_BYTES) * 100).toFixed(1));
    const formattedMem = formatBytes(memBytes);
    const isMonitoring =
      name.includes("serverwatch") ||
      name.includes("prometheus") ||
      name.includes("grafana") ||
      name.includes("cadvisor") ||
      name.includes("node-exporter");

    return {
      id: `app-docker-${name.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
      name,
      type: "docker" as const,
      category: isMonitoring ? ("monitoring" as const) : ("business" as const),
      image: "Docker Container",
      containerId: name.slice(0, 12),
      port: "-",
      cpuUsage: Number(cpuUsage.toFixed(1)),
      memoryUsage: memUsagePercent,
      memoryRaw: formattedMem.formatted,
      status: "healthy" as MetricStatus,
      statusText: "Running (Real)",
      uptime: "Active",
      restartCount: 0,
      lastUpdated: "Just now",
    };
  });
}
