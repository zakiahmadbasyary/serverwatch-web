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
      const matrix = await prometheusClient.queryRange(PROMQL.MEM_USAGE_PERCENT, start, end, stepParam);
      return NextResponse.json({ success: true, connected: true, data: matrix });
    }

    const [total, avail, cached, free] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.MEM_TOTAL_BYTES),
      prometheusClient.queryInstant(PROMQL.MEM_AVAILABLE_BYTES),
      prometheusClient.queryInstant(PROMQL.MEM_CACHED_BYTES),
      prometheusClient.queryInstant(PROMQL.MEM_FREE_BYTES),
    ]);

    return NextResponse.json({
      success: true,
      connected: true,
      total,
      available: avail,
      cached,
      free,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, error: err?.message || "Failed to query Memory metrics" },
      { status: 503 }
    );
  }
}
