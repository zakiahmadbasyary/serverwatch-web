import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";

export async function GET() {
  const health = await prometheusClient.checkHealth();

  return NextResponse.json(
    {
      success: health.isHealthy,
      connected: health.isHealthy,
      message: health.message,
      checkedAt: health.timestamp,
    },
    { status: health.isHealthy ? 200 : 503 }
  );
}
