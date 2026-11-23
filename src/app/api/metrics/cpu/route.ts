import { NextRequest, NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const stepParam = searchParams.get("step") || "300s";

  try {
    if (startParam && endParam) {
      const start = parseInt(startParam, 10);
      const end = parseInt(endParam, 10);
      const matrix = await prometheusClient.queryRange(PROMQL.CPU_USAGE_OVERALL, start, end, stepParam);
      return NextResponse.json({ success: true, connected: true, data: matrix });
    }

    const [overall, perCore] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.CPU_USAGE_OVERALL),
      prometheusClient.queryInstant(PROMQL.CPU_USAGE_PER_CORE),
    ]);

    return NextResponse.json({
      success: true,
      connected: true,
      overall,
      perCore,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, error: err?.message || "Failed to query CPU metrics" },
      { status: 503 }
    );
  }
}
