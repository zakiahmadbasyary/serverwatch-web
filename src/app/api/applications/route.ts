import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import {
  transformPm2Applications,
  mergeContainerMetrics,
} from "@/services/prometheus/transformer";
import { MonitoredApplication, ApplicationsSummary } from "@/types/monitoring";

export async function GET() {
  try {
    const [
      pm2UpRes,
      statusRes,
      memRes,
      cpuRes,
      instanceRes,
      restartRes,
      uptimeRes,
      cadvisorUpRes,
      cadvisorCpuRes,
      cadvisorMemRes,
      pm2CpuCollectorUpRes,
      cpuCollectorRes,
      cpuCoresRes,
      processCountRes,
    ] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.PM2_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_STATUS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_TOTAL_MEM).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_INSTANCES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_RESTARTS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_UPTIME).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CADVISOR_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_CPU_USAGE).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_MEMORY_BYTES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_CPU_COLLECTOR_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU_PERCENT).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU_CORES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_PROCESS_COUNT).catch(() => []),
    ]);

    const pm2ExporterUp = pm2UpRes.length > 0 && pm2UpRes[0]?.value?.[1] === "1";
    const pm2CpuCollectorUp = pm2CpuCollectorUpRes.length > 0 && pm2CpuCollectorUpRes[0]?.value?.[1] === "1";
    const cadvisorUp = cadvisorUpRes.length > 0 && cadvisorUpRes[0]?.value?.[1] === "1";

    const pm2Apps = transformPm2Applications({
      statusResults: statusRes,
      memResults: memRes,
      cpuResults: cpuRes,
      instanceResults: instanceRes,
      restartResults: restartRes,
      uptimeResults: uptimeRes,
      cpuCollectorResults: cpuCollectorRes,
      cpuCoresResults: cpuCoresRes,
      processCountResults: processCountRes,
    });

    const dockerApps = mergeContainerMetrics(cadvisorCpuRes, cadvisorMemRes);

    const allApps: MonitoredApplication[] = [...pm2Apps, ...dockerApps];

    const onlineCount = allApps.filter((a) => a.status === "healthy").length;
    const stoppedCount = allApps.filter((a) => a.statusText === "Stopped" || a.status === "warning").length;
    const erroredCount = allApps.filter((a) => a.status === "critical").length;
    const unknownCount = allApps.filter((a) => a.status === "unknown").length;

    const summary: ApplicationsSummary = {
      total: allApps.length,
      pm2Count: pm2Apps.length,
      dockerCount: dockerApps.length,
      onlineCount,
      stoppedCount,
      erroredCount,
      unknownCount,
      pm2ExporterUp,
      pm2CpuCollectorUp,
      cadvisorUp,
    };

    return NextResponse.json({
      success: true,
      source: "prometheus",
      updatedAt: new Date().toISOString(),
      summary,
      data: allApps,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        source: "prometheus",
        updatedAt: new Date().toISOString(),
        summary: {
          total: 0,
          pm2Count: 0,
          dockerCount: 0,
          onlineCount: 0,
          stoppedCount: 0,
          erroredCount: 0,
          unknownCount: 0,
          pm2ExporterUp: false,
          pm2CpuCollectorUp: false,
          cadvisorUp: false,
        },
        error: err?.message || "Failed to load applications",
        data: [],
      },
      { status: 200 }
    );
  }
}
