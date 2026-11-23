"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  ServerMetric,
  MetricDataPoint,
  MonitoredApplication,
  ServerSystemInfo,
} from "@/types/monitoring";
import {
  mockOverviewMetrics,
  mockTrendData,
  mockApplications,
  mockSystemInfo,
} from "@/lib/mock-data";

interface MetricsContextType {
  metrics: ServerMetric[];
  trendData: MetricDataPoint[];
  applications: MonitoredApplication[];
  systemInfo: ServerSystemInfo;
  isConnected: boolean;
  source: "prometheus" | "mock-fallback";
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: string;
  refresh: () => Promise<void>;
}

export function useMetricsPolling(pollIntervalMs = 30000) {
  const [metrics, setMetrics] = useState<ServerMetric[]>(mockOverviewMetrics);
  const [trendData, setTrendData] = useState<MetricDataPoint[]>(mockTrendData);
  const [applications, setApplications] = useState<MonitoredApplication[]>(mockApplications);
  const [systemInfo, setSystemInfo] = useState<ServerSystemInfo>(mockSystemInfo);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [source, setSource] = useState<"prometheus" | "mock-fallback">("mock-fallback");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Initializing...");

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);

    try {
      const res = await fetch("/api/metrics/overview", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();

      if (json.metrics) setMetrics(json.metrics);
      if (json.trendData) setTrendData(json.trendData);
      if (json.applications) setApplications(json.applications);
      if (json.systemInfo) setSystemInfo(json.systemInfo);

      setIsConnected(Boolean(json.connected));
      setSource(json.source || "mock-fallback");
      setError(json.connected ? null : json.error || "Prometheus is not connected");

      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err: any) {
      setIsConnected(false);
      setSource("mock-fallback");
      setError(err?.message || "Failed to fetch metrics");
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(false);

    if (pollIntervalMs > 0) {
      const intervalId = setInterval(() => {
        fetchMetrics(false);
      }, pollIntervalMs);

      return () => clearInterval(intervalId);
    }
  }, [fetchMetrics, pollIntervalMs]);

  const refresh = useCallback(async () => {
    await fetchMetrics(true);
  }, [fetchMetrics]);

  return {
    metrics,
    trendData,
    applications,
    systemInfo,
    isConnected,
    source,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
  };
}

// Global Metrics Context Provider
export const MetricsContext = createContext<MetricsContextType | null>(null);

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error("useMetrics must be used within a MetricsProvider");
  }
  return ctx;
}
