import { NextRequest, NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import {
  transformPm2Applications,
  mergeContainerMetrics,
  transformRangeTrend,
} from "@/services/prometheus/transformer";
import { MonitoredApplication } from "@/types/monitoring";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  try {
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;

    // Fetch instant data to find matching application
    const [
      statusRes,
      memRes,
      cpuRes,
      instanceRes,
      restartRes,
      uptimeRes,
      cadvisorCpuRes,
      cadvisorMemRes,
    ] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.PM2_APP_STATUS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_TOTAL_MEM).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_INSTANCES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_RESTARTS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_UPTIME).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_CPU_USAGE).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_MEMORY_BYTES).catch(() => []),
    ]);

    const pm2Apps = transformPm2Applications({
      statusResults: statusRes,
      memResults: memRes,
      cpuResults: cpuRes,
      instanceResults: instanceRes,
      restartResults: restartRes,
      uptimeResults: uptimeRes,
    });

    const dockerApps = mergeContainerMetrics(cadvisorCpuRes, cadvisorMemRes);
    const allApps: MonitoredApplication[] = [...pm2Apps, ...dockerApps];

    // Find by ID or by name
    const app = allApps.find(
      (a) =>
        a.id.toLowerCase() === decodedId.toLowerCase() ||
        a.name.toLowerCase() === decodedId.toLowerCase()
    );

    if (!app) {
      return NextResponse.json(
        {
          success: false,
          source: "prometheus",
          data: null,
          error: `Application with ID or name '${decodedId}' not found`,
        },
        { status: 404 }
      );
    }

    // Query 1-hour historical range query for this application
    let appCpuRange: any[] = [];
    let appMemRange: any[] = [];

    if (app.type === "pm2") {
      const escapedName = app.name.replace(/"/g, '\\"');
      const [cpuMatrix, memMatrix] = await Promise.all([
        prometheusClient
          .queryRange(
            `pm2_app_average_cpu{app="${escapedName}"} or pm2_app_average_cpu{name="${escapedName}"}`,
            oneHourAgo,
            now,
            "60s"
          )
          .catch(() => []),
        prometheusClient
          .queryRange(
            `pm2_app_total_memory{app="${escapedName}"} or pm2_app_total_memory{name="${escapedName}"}`,
            oneHourAgo,
            now,
            "60s"
          )
          .catch(() => []),
      ]);
      appCpuRange = cpuMatrix;
      appMemRange = memMatrix;
    } else {
      const escapedName = app.name.replace(/"/g, '\\"');
      const escapedId = (app.containerId || "").replace(/"/g, '\\"');
      const [cpuMatrix, memMatrix] = await Promise.all([
        prometheusClient
          .queryRange(
            `rate(container_cpu_usage_seconds_total{name="${escapedName}"}[5m]) * 100 or rate(container_cpu_usage_seconds_total{id=~".*${escapedId}.*"}[5m]) * 100`,
            oneHourAgo,
            now,
            "60s"
          )
          .catch(() => []),
        prometheusClient
          .queryRange(
            `container_memory_working_set_bytes{name="${escapedName}"} or container_memory_working_set_bytes{id=~".*${escapedId}.*"}`,
            oneHourAgo,
            now,
            "60s"
          )
          .catch(() => []),
      ]);
      appCpuRange = cpuMatrix;
      appMemRange = memMatrix;
    }

    const HOST_RAM_BYTES = 7.8 * 1024 * 1024 * 1024;
    // Map memory matrix to % of host RAM if present
    const normalizedMemMatrix = appMemRange.map((series) => ({
      ...series,
      values: series.values.map(([ts, val]: [number, string]) => [
        ts,
        String(((parseFloat(val) / HOST_RAM_BYTES) * 100).toFixed(1)),
      ]),
    }));

    const history = transformRangeTrend(appCpuRange, normalizedMemMatrix, [], [], 0);

    const appWithHistory: MonitoredApplication = {
      ...app,
      history,
    };

    return NextResponse.json({
      success: true,
      source: "prometheus",
      data: appWithHistory,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        source: "prometheus",
        data: null,
        error: err?.message || "Failed to query application detail",
      },
      { status: 500 }
    );
  }
}
