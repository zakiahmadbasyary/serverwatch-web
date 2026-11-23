import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import {
  extractVectorValue,
  transformOverviewMetrics,
  transformRangeTrend,
  mergeContainerMetrics,
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
      prometheusClient.queryRange(PROMQL.CPU_USAGE_OVERALL, oneHourAgo, now, "300s"),
      prometheusClient.queryRange(PROMQL.MEM_USAGE_PERCENT, oneHourAgo, now, "300s"),
      prometheusClient.queryRange(PROMQL.NETWORK_RECEIVE_BYTES_PER_SEC, oneHourAgo, now, "300s"),
      prometheusClient.queryRange(PROMQL.NETWORK_TRANSMIT_BYTES_PER_SEC, oneHourAgo, now, "300s"),
      // Container queries
      prometheusClient.queryInstant(PROMQL.CONTAINER_CPU_USAGE).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_MEMORY_BYTES).catch(() => []),
    ]);

    const overviewMetrics = transformOverviewMetrics({
      cpuUsage: extractVectorValue(cpuRes, 48.6),
      memTotal: extractVectorValue(memTotalRes, 7.8 * 1024 * 1024 * 1024),
      memAvail: extractVectorValue(memAvailRes, 2.65 * 1024 * 1024 * 1024),
      memCached: extractVectorValue(memCachedRes, 1.20 * 1024 * 1024 * 1024),
      diskTotal: extractVectorValue(diskTotalRes, 96 * 1e9),
      diskAvail: extractVectorValue(diskAvailRes, 55 * 1e9),
      netRx: extractVectorValue(netRxRes, 1600 * 1024),
      netTx: extractVectorValue(netTxRes, 800 * 1024),
      load1: extractVectorValue(load1Res, 0.95),
      load5: extractVectorValue(load5Res, 0.88),
      load15: extractVectorValue(load15Res, 0.76),
    });

    const trendData =
      cpuTrendRes.length > 0
        ? transformRangeTrend(cpuTrendRes, memTrendRes, netRxTrendRes, netTxTrendRes, 42.7)
        : mockTrendData;

    const applications = mergeContainerMetrics(cadvisorCpuRes, cadvisorMemRes);

    return NextResponse.json({
      success: true,
      connected: true,
      source: "prometheus",
      timestamp: new Date().toISOString(),
      metrics: overviewMetrics,
      trendData,
      applications,
      systemInfo: mockSystemInfo,
    });
  } catch (err: any) {
    // Ketika Prometheus belum terhubung / SSH tunnel belum nyala:
    // Kembalikan connected: false dengan pesan yang jelas agar UI menampilkan Disconnected State
    return NextResponse.json(
      {
        success: false,
        connected: false,
        source: "mock-fallback",
        error: err?.message || "Cannot reach Prometheus server",
        timestamp: new Date().toISOString(),
        metrics: mockOverviewMetrics,
        trendData: mockTrendData,
        applications: mockApplications,
        systemInfo: mockSystemInfo,
      },
      { status: 200 }
    );
  }
}
