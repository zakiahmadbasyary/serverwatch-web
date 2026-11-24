import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import {
  extractVectorValue,
  transformOverviewMetrics,
  transformRangeTrend,
  mergeContainerMetrics,
  transformPm2Applications,
} from "@/services/prometheus/transformer";
import {
  mockOverviewMetrics,
  mockTrendData,
  mockApplications,
  mockSystemInfo,
} from "@/lib/mock-data";

export async function GET() {
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;

  try {
    // Jalankan query instan secara paralel untuk efisiensi
    const [
      cpuRes,
      memTotalRes,
      memAvailRes,
      memCachedRes,
      diskTotalRes,
      diskAvailRes,
      netRxRes,
      netTxRes,
      load1Res,
      load5Res,
      load15Res,
      // Trend historical 1 jam
      cpuTrendRes,
      memTrendRes,
      netRxTrendRes,
      netTxTrendRes,
      // Containers cAdvisor
      cadvisorCpuRes,
      cadvisorMemRes,
      // PM2 Metrics
      pm2StatusRes,
      pm2MemRes,
      pm2CpuRes,
      pm2InstanceRes,
      pm2RestartRes,
      pm2UptimeRes,
    ] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.CPU_USAGE_OVERALL),
      prometheusClient.queryInstant(PROMQL.MEM_TOTAL_BYTES),
      prometheusClient.queryInstant(PROMQL.MEM_AVAILABLE_BYTES),
      prometheusClient.queryInstant(PROMQL.MEM_CACHED_BYTES),
      prometheusClient.queryInstant(PROMQL.DISK_ROOT_TOTAL_BYTES),
      prometheusClient.queryInstant(PROMQL.DISK_ROOT_AVAILABLE_BYTES),
      prometheusClient.queryInstant(PROMQL.NETWORK_RECEIVE_BYTES_PER_SEC),
      prometheusClient.queryInstant(PROMQL.NETWORK_TRANSMIT_BYTES_PER_SEC),
      prometheusClient.queryInstant(PROMQL.LOAD_AVERAGE_1M),
      prometheusClient.queryInstant(PROMQL.LOAD_AVERAGE_5M),
      prometheusClient.queryInstant(PROMQL.LOAD_AVERAGE_15M),
      // Trend queries
      prometheusClient.queryRange(PROMQL.CPU_USAGE_OVERALL, oneHourAgo, now, "300s").catch(() => []),
      prometheusClient.queryRange(PROMQL.MEM_USAGE_PERCENT, oneHourAgo, now, "300s").catch(() => []),
      prometheusClient.queryRange(PROMQL.NETWORK_RECEIVE_BYTES_PER_SEC, oneHourAgo, now, "300s").catch(() => []),
      prometheusClient.queryRange(PROMQL.NETWORK_TRANSMIT_BYTES_PER_SEC, oneHourAgo, now, "300s").catch(() => []),
      // Container queries
      prometheusClient.queryInstant(PROMQL.CONTAINER_CPU_USAGE).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_MEMORY_BYTES).catch(() => []),
      // PM2 queries
      prometheusClient.queryInstant(PROMQL.PM2_APP_STATUS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_TOTAL_MEM).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_INSTANCES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_RESTARTS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_UPTIME).catch(() => []),
    ]);

    const memTotal = extractVectorValue(memTotalRes, 0);
    const diskTotal = extractVectorValue(diskTotalRes, 0);
    const diskAvail = extractVectorValue(diskAvailRes, 0);

    const diskUsed = Math.max(0, diskTotal - diskAvail);
    const diskPercent = diskTotal > 0 ? Number(((diskUsed / diskTotal) * 100).toFixed(1)) : 0;

    const overviewMetrics = transformOverviewMetrics({
      cpuUsage: extractVectorValue(cpuRes, 0),
      memTotal,
      memAvail: extractVectorValue(memAvailRes, 0),
      memCached: extractVectorValue(memCachedRes, 0),
      diskTotal,
      diskAvail,
      netRx: extractVectorValue(netRxRes, 0),
      netTx: extractVectorValue(netTxRes, 0),
      load1: extractVectorValue(load1Res, 0),
      load5: extractVectorValue(load5Res, 0),
      load15: extractVectorValue(load15Res, 0),
      isConnected: true,
    });

    const trendData =
      cpuTrendRes && cpuTrendRes.length > 0
        ? transformRangeTrend(cpuTrendRes, memTrendRes, netRxTrendRes, netTxTrendRes, diskPercent)
        : [];

    const pm2Apps = transformPm2Applications({
      statusResults: pm2StatusRes,
      memResults: pm2MemRes,
      cpuResults: pm2CpuRes,
      instanceResults: pm2InstanceRes,
      restartResults: pm2RestartRes,
      uptimeResults: pm2UptimeRes,
    });

    const dockerApps = mergeContainerMetrics(cadvisorCpuRes, cadvisorMemRes);
    const applications = [...pm2Apps, ...dockerApps];

    const liveSystemInfo = {
      hostname: "vps-ggp-prod",
      ipAddress: "127.0.0.1 (via Tunnel)",
      os: "Ubuntu Server",
      kernel: "Linux (Node Exporter)",
      uptime: "Online (Prometheus)",
      cores: 2,
      totalMemory: memTotal > 0 ? `${(memTotal / (1024 * 1024 * 1024)).toFixed(1)} GiB` : "-",
      totalDisk: diskTotal > 0 ? `${(diskTotal / 1e9).toFixed(1)} GB` : "-",
      cpuModel: "x86_64",
    };

    return NextResponse.json({
      success: true,
      connected: true,
      source: "prometheus",
      timestamp: new Date().toISOString(),
      metrics: overviewMetrics,
      trendData,
      applications,
      systemInfo: liveSystemInfo,
    });
  } catch (err: any) {
    // Ketika Prometheus belum terhubung / SSH tunnel belum nyala:
    // Tidak mengembalikan data dummy, kembalikan empty state kosong
    return NextResponse.json(
      {
        success: false,
        connected: false,
        source: "none",
        error: err?.message || "Cannot reach Prometheus server",
        timestamp: new Date().toISOString(),
        metrics: mockOverviewMetrics,
        trendData: [],
        applications: [],
        systemInfo: mockSystemInfo,
      },
      { status: 200 }
    );
  }
}
