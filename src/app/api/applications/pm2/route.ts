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
    ] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.PM2_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_STATUS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_TOTAL_MEM).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_CPU).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_INSTANCES).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_RESTARTS).catch(() => []),
      prometheusClient.queryInstant(PROMQL.PM2_APP_UPTIME).catch(() => []),
    ]);

    const isExporterUp = pm2UpRes.length > 0 && pm2UpRes[0]?.value?.[1] === "1";

    const pm2Apps = transformPm2Applications({
      statusResults: statusRes,
      memResults: memRes,
      cpuResults: cpuRes,
      instanceResults: instanceRes,
      restartResults: restartRes,
      uptimeResults: uptimeRes,
    });

    return NextResponse.json({
      success: true,
      source: "prometheus",
      type: "pm2",
      exporterUp: isExporterUp,
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
        error: err?.message || "Failed to query PM2 metrics from Prometheus",
        updatedAt: new Date().toISOString(),
        data: [],
      },
      { status: 200 }
    );
  }
}
