"use client";

import React from "react";
import { MetricsContext, useMetricsPolling } from "@/hooks/use-metrics";

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const metricsState = useMetricsPolling(30000); // Poll setiap 30 detik sesuai scrape interval

  return (
    <MetricsContext.Provider value={metricsState}>
      {children}
    </MetricsContext.Provider>
  );
}
