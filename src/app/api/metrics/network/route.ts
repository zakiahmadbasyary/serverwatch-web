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
      const [rxMatrix, txMatrix] = await Promise.all([
        prometheusClient.queryRange(PROMQL.NETWORK_RECEIVE_BYTES_PER_SEC, start, end, stepParam),
        prometheusClient.queryRange(PROMQL.NETWORK_TRANSMIT_BYTES_PER_SEC, start, end, stepParam),
      ]);
      return NextResponse.json({ success: true, connected: true, rx: rxMatrix, tx: txMatrix });
    }

    const [rx, tx] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.NETWORK_RECEIVE_BYTES_PER_SEC),
      prometheusClient.queryInstant(PROMQL.NETWORK_TRANSMIT_BYTES_PER_SEC),
    ]);

    return NextResponse.json({
      success: true,
      connected: true,
      receive: rx,
      transmit: tx,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, error: err?.message || "Failed to query Network metrics" },
      { status: 503 }
    );
  }
}
