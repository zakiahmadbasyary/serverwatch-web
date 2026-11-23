import { NextResponse } from "next/server";
import { prometheusClient } from "@/services/prometheus/client";
import { PROMQL } from "@/services/prometheus/queries";

export async function GET() {
  try {
    const [total, avail, usagePercent] = await Promise.all([
      prometheusClient.queryInstant(PROMQL.DISK_ROOT_TOTAL_BYTES),
      prometheusClient.queryInstant(PROMQL.DISK_ROOT_AVAILABLE_BYTES),
      prometheusClient.queryInstant(PROMQL.DISK_ROOT_USAGE_PERCENT),
    ]);

    return NextResponse.json({
      success: true,
      connected: true,
      rootPartition: {
        filesystem: "/dev/sda1",
        mount: "/",
        total,
        available: avail,
        usagePercent,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, error: err?.message || "Failed to query Disk metrics" },
      { status: 503 }
    );
  }
}
