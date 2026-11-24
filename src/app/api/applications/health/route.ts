import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";

export async function GET() {
  try {
    const [pm2UpRes, cadvisorUpRes, nodeUpRes] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.PM2_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CADVISOR_UP).catch(() => []),
      prometheusClient.queryInstant('up{job="serverwatch-node"}').catch(() => []),
    ]);

    const pm2Up = pm2UpRes.length > 0 && pm2UpRes[0]?.value?.[1] === "1";
    const cadvisorUp = cadvisorUpRes.length > 0 && cadvisorUpRes[0]?.value?.[1] === "1";
    const nodeUp = nodeUpRes.length > 0 && nodeUpRes[0]?.value?.[1] === "1";

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      exporters: {
        nodeExporter: {
          job: "serverwatch-node",
          status: nodeUp ? "up" : "down",
          healthy: nodeUp,
        },
        cadvisor: {
          job: "serverwatch-cadvisor",
          status: cadvisorUp ? "up" : "down",
          healthy: cadvisorUp,
        },
        pm2Prometheus: {
          job: "serverwatch-pm2",
          status: pm2Up ? "up" : "down",
          healthy: pm2Up,
          notes: pm2Up
            ? "PM2 exporter connected"
            : "PM2 exporter not installed or scrape target down in prometheus.yml",
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to check exporter health",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
