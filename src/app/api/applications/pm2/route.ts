import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import { transformPm2Applications } from "@/services/prometheus/transformer";

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
      prometheusClient.queryInstant(PROMQL.PM2_CPU_COLLECTOR_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU_PERCENT).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU_CORES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_PROCESS_COUNT).catch(() => []),
    ]);

    const isExporterUp = pm2UpRes.length > 0 && pm2UpRes[0]?.value?.[1] === "1";
    const isCollectorUp = pm2CpuCollectorUpRes.length > 0 && pm2CpuCollectorUpRes[0]?.value?.[1] === "1";

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

    return NextResponse.json({
      success: true,
      source: "prometheus",
      type: "pm2",
      exporterUp: isExporterUp,
      collectorUp: isCollectorUp,
      updatedAt: new Date().toISOString(),
      data: pm2Apps,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        source: "prometheus",
        type: "pm2",
        exporterUp: false,
        collectorUp: false,
        error: err?.message || "Failed to query PM2 metrics from Prometheus",
        updatedAt: new Date().toISOString(),
        data: [],
      },
      { status: 200 }
    );
  }
}
