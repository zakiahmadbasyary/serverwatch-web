import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";
import { mergeContainerMetrics } from "@/services/prometheus/transformer";

export async function GET() {
  try {
    const [cadvisorCpu, cadvisorMem] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.CONTAINER_CPU_USAGE),
      prometheusClient.queryInstant(PROMQL.CONTAINER_MEMORY_BYTES),
    ]);

    const applications = mergeContainerMetrics(cadvisorCpu, cadvisorMem);

    return NextResponse.json({
      success: true,
      connected: true,
      applications,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, error: err?.message || "Failed to query Container metrics" },
      { status: 503 }
    );
  }
}
