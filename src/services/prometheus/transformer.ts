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
        existing.networkRx = Number((parseFloat(val) / 1024).toFixed(3)); // KB/s (3 desimal agar nilai B/s tidak terbulatkan ke 0)
      }
    }
  }

  // Extract Network Tx
  if (netTxMatrix && netTxMatrix.length > 0 && netTxMatrix[0].values) {
    for (const [timestamp, val] of netTxMatrix[0].values) {
      const existing = pointsMap.get(timestamp);
      if (existing) {
        existing.networkTx = Number((parseFloat(val) / 1024).toFixed(3)); // KB/s (3 desimal agar nilai B/s tidak terbulatkan ke 0)
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
 * Memfilter cgroup root, systemd services/slices, dan pause container
 * Jika cAdvisor tidak menghasilkan data container aktual, kembalikan array kosong []
 */
export function mergeContainerMetrics(
  cadvisorCpu: PrometheusVectorResult[],
  cadvisorMem: PrometheusVectorResult[]
): MonitoredApplication[] {
  const cpuMap = new Map<string, number>();
  const memMap = new Map<string, number>();
  const imageMap = new Map<string, string>();
  const idMap = new Map<string, string>();
  const containerNames = new Set<string>();

  // Filter cgroup non-container: root cgroup, system slices, user sessions, systemd services
  const isSystemCgroup = (id: string, name: string) => {
    if (!id && !name) return true;
    if (id === "/" || id === "/init.scope" || id === "/system.slice" || id === "/user.slice") return true;
    if (name === "POD" || name.startsWith("k8s_")) return true;
    // Discard all host systemd units (service, socket, swap, slice) unless it has a valid container name
    if (!name) {
      if (
        id.endsWith(".service") ||
        id.endsWith(".socket") ||
        id.endsWith(".slice") ||
        id.endsWith(".scope") ||
        id.endsWith(".swap") ||
        id.startsWith("/system.slice") ||
        id.startsWith("/user.slice")
      ) {
        // Only keep if it is an actual docker container hash (e.g. :docker:<hash> or docker-<hash>)
        if (
          id.includes(":docker:") ||
          (id.includes("docker-") && !id.includes("docker.service") && !id.includes("docker.socket"))
        ) {
          return false;
        }
        return true;
      }
    }
    return false;
  };

  for (const c of cadvisorCpu || []) {
    const rawName = c.metric.name || "";
    const rawId = c.metric.id || "";
    if (isSystemCgroup(rawId, rawName)) continue;

    const containerIdentifier = rawName || (rawId.includes("docker:") ? rawId.split("docker:")[1].slice(0, 12) : rawId.replace(/^\//, "").slice(0, 12));
    if (containerIdentifier) {
      cpuMap.set(containerIdentifier, parseFloat(c.value[1]) || 0);
      if (c.metric.image) imageMap.set(containerIdentifier, c.metric.image);
      if (rawId) idMap.set(containerIdentifier, rawId);
      containerNames.add(containerIdentifier);
    }
  }

  for (const m of cadvisorMem || []) {
    const rawName = m.metric.name || "";
    const rawId = m.metric.id || "";
    if (isSystemCgroup(rawId, rawName)) continue;

    const containerIdentifier = rawName || (rawId.includes("docker:") ? rawId.split("docker:")[1].slice(0, 12) : rawId.replace(/^\//, "").slice(0, 12));
    if (containerIdentifier) {
      memMap.set(containerIdentifier, parseFloat(m.value[1]) || 0);
      if (m.metric.image) imageMap.set(containerIdentifier, m.metric.image);
      if (rawId) idMap.set(containerIdentifier, rawId);
      containerNames.add(containerIdentifier);
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
    const image = imageMap.get(name) || "Docker Container";
    const rawId = idMap.get(name) || name;
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
      image,
      containerId: rawId.slice(0, 12),
      port: "-",
      cpuUsage: Number(cpuUsage.toFixed(1)),
      cpuPercent: Number(cpuUsage.toFixed(1)),
      memoryUsage: memUsagePercent,
      memoryBytes: memBytes > 0 ? memBytes : null,
      memoryMiB: memBytes > 0 ? Number((memBytes / (1024 * 1024)).toFixed(1)) : null,
      memoryRaw: formattedMem.formatted,
      status: "healthy" as MetricStatus,
      statusText: "Running (Real)",
      uptime: "Active (cAdvisor)",
      uptimeSeconds: null,
      restartCount: 0,
      metricsAvailable: ["container_cpu_usage_seconds_total", "container_memory_working_set_bytes"],
      lastUpdated: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };
  });
}

/**
 * Helper memformat durasi detik menjadi hari/jam/menit
 */
export function formatSecondsToUptime(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Status mapping numerik pm2-prom-module:
 * 0 = unknown, 1 = online/running, 2 = pending, 3 = stopped, 4 = errored
 */
export function mapPm2Status(statusCode: number): { status: MetricStatus; statusText: string } {
  switch (statusCode) {
    case 1:
      return { status: "healthy", statusText: "Online" };
    case 2:
      return { status: "warning", statusText: "Pending" };
    case 3:
      return { status: "warning", statusText: "Stopped" };
    case 4:
      return { status: "critical", statusText: "Errored" };
    default:
      return { status: "unknown", statusText: "Unknown" };
  }
}

/**
 * Transform data metrik PM2 dari Prometheus exporter (pm2-prom-module)
 */
export function transformPm2Applications(data: {
  statusResults: PrometheusVectorResult[];
  memResults?: PrometheusVectorResult[];
  cpuResults?: PrometheusVectorResult[];
  instanceResults?: PrometheusVectorResult[];
  restartResults?: PrometheusVectorResult[];
  uptimeResults?: PrometheusVectorResult[];
  cpuCollectorResults?: PrometheusVectorResult[];
  cpuCoresResults?: PrometheusVectorResult[];
  processCountResults?: PrometheusVectorResult[];
}): MonitoredApplication[] {
  const HOST_RAM_BYTES = 7.8 * 1024 * 1024 * 1024; // 7.8 GiB
  const apps: MonitoredApplication[] = [];
  const seenApps = new Set<string>();

  const memMap = new Map<string, number>();
  for (const m of data.memResults || []) {
    const name = m.metric.app || m.metric.name || "";
    if (name) memMap.set(name, parseFloat(m.value[1]) || 0);
  }

  const cpuMap = new Map<string, number>();
  for (const c of data.cpuResults || []) {
    const name = c.metric.app || c.metric.name || "";
    if (name) cpuMap.set(name, parseFloat(c.value[1]) || 0);
  }

  const cpuCollectorMap = new Map<string, number>();
  for (const c of data.cpuCollectorResults || []) {
    const name = c.metric.app || c.metric.name || "";
    if (name) cpuCollectorMap.set(name, parseFloat(c.value[1]) || 0);
  }

  const cpuCoresMap = new Map<string, number>();
  for (const c of data.cpuCoresResults || []) {
    const name = c.metric.app || c.metric.name || "";
    if (name) cpuCoresMap.set(name, parseFloat(c.value[1]) || 0);
  }

  const processCountMap = new Map<string, number>();
  for (const p of data.processCountResults || []) {
    const name = p.metric.app || p.metric.name || "";
    if (name) processCountMap.set(name, parseInt(p.value[1], 10) || 0);
  }

  const instanceMap = new Map<string, number>();
  for (const inst of data.instanceResults || []) {
    const name = inst.metric.app || inst.metric.name || "";
    if (name) instanceMap.set(name, parseInt(inst.value[1], 10) || 1);
  }

  const restartMap = new Map<string, number>();
  for (const r of data.restartResults || []) {
    const name = r.metric.app || r.metric.name || "";
    if (name) restartMap.set(name, parseInt(r.value[1], 10) || 0);
  }

  const uptimeMap = new Map<string, number>();
  for (const u of data.uptimeResults || []) {
    const name = u.metric.app || u.metric.name || "";
    if (name) uptimeMap.set(name, parseFloat(u.value[1]) || 0);
  }

  for (const s of data.statusResults || []) {
    const appName = s.metric.app || s.metric.name || "";
    if (!appName || seenApps.has(appName)) continue;
    seenApps.add(appName);

    const statusCode = parseInt(s.value[1], 10);
    const { status, statusText } = mapPm2Status(statusCode);
    const exporterEndpoint = s.metric.instance || "172.20.0.1:9988";

    const memBytes = memMap.get(appName) ?? 0;
    const memMiB = memBytes > 0 ? Number((memBytes / (1024 * 1024)).toFixed(1)) : null;
    const memUsagePercent = memBytes > 0 ? Number(((memBytes / HOST_RAM_BYTES) * 100).toFixed(1)) : 0;
    
    // Gunakan metrik Linux /proc process tree CPU collector jika tersedia (sudah dinormalisasi terhadap 2 vCPU)
    const hasCollectorCpu = cpuCollectorMap.has(appName);
    const rawCpuPercent = hasCollectorCpu ? cpuCollectorMap.get(appName)! : (cpuMap.get(appName) ?? 0);
    const normalizedCpuPercent = rawCpuPercent > 0 && rawCpuPercent < 0.1
      ? Number(rawCpuPercent.toFixed(2))
      : Number(rawCpuPercent.toFixed(1));

    const cpuCores = cpuCoresMap.has(appName) ? Number(cpuCoresMap.get(appName)!.toFixed(4)) : null;
    const processCount = processCountMap.has(appName) ? processCountMap.get(appName)! : null;
    const instances = instanceMap.get(appName) ?? 1;
    const restarts = restartMap.get(appName) ?? 0;
    const uptimeSec = uptimeMap.get(appName);

    const availableMetrics: string[] = ["pm2_app_status"];
    if (memMap.has(appName)) availableMetrics.push("pm2_app_total_memory");
    if (cpuMap.has(appName)) availableMetrics.push("pm2_app_average_cpu");
    if (hasCollectorCpu) availableMetrics.push("serverwatch_pm2_app_cpu_percent");
    if (cpuCores !== null) availableMetrics.push("serverwatch_pm2_app_cpu_cores");
    if (processCount !== null) availableMetrics.push("serverwatch_pm2_app_process_count");
    if (instanceMap.has(appName)) availableMetrics.push("pm2_app_instances");
    if (restartMap.has(appName)) availableMetrics.push("pm2_app_restart_count");
    if (uptimeMap.has(appName)) availableMetrics.push("pm2_app_uptime");

    apps.push({
      id: `app-pm2-${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
      name: appName,
      type: "pm2",
      category: "business",
      image: "Node.js (PM2)",
      exporterEndpoint,
      containerId: undefined, // PM2 proses bukan Docker container
      port: "-",
      cpuUsage: normalizedCpuPercent,
      cpuPercent: normalizedCpuPercent,
      cpuCores,
      processCount,
      memoryUsage: memUsagePercent,
      memoryBytes: memBytes > 0 ? memBytes : null,
      memoryMiB: memMiB,
      memoryRaw: memBytes > 0 ? formatBytes(memBytes).formatted : "—",
      status,
      statusText,
      uptime: formatSecondsToUptime(uptimeSec),
      uptimeSeconds: uptimeSec ?? null,
      restartCount: restarts,
      instances,
      metricsAvailable: availableMetrics,
      lastUpdated: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  return apps;
}
