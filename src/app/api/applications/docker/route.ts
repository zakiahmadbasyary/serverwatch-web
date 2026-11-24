import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import { mergeContainerMetrics } from "@/services/prometheus/transformer";

export async function GET() {
  try {
    const [cadvisorUpRes, cadvisorCpuRes, cadvisorMemRes] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.CADVISOR_UP).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_CPU_USAGE).catch(() => []),
      prometheusClient.queryInstant(PROMQL.CONTAINER_MEMORY_BYTES).catch(() => []),
    ]);

    const isCadvisorUp = cadvisorUpRes.length > 0 && cadvisorUpRes[0]?.value?.[1] === "1";
    const dockerApps = mergeContainerMetrics(cadvisorCpuRes, cadvisorMemRes);

    return NextResponse.json({
      success: true,
      source: "prometheus",
      type: "docker",
      exporterUp: isCadvisorUp,
      updatedAt: new Date().toISOString(),
      data: dockerApps,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        source: "prometheus",
        type: "docker",
        exporterUp: false,
        error: err?.message || "Failed to query Docker container metrics from cAdvisor",
        updatedAt: new Date().toISOString(),
        data: [],
      },
      { status: 200 }
    );
  }
}
