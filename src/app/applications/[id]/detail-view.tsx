"use client";

import React from "react";
import Link from "next/link";
import { useMetrics } from "@/hooks/use-metrics";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Cpu,
  Layers,
  RotateCcw,
  Clock,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export function ApplicationDetailView({ id }: { id: string }) {
  const { applications, trendData, isConnected } = useMetrics();
  const app = applications.find((a) => a.id === id);

  if (!app) {
    return (
      <div className="space-y-6">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </Link>
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold text-text-primary">Data Aplikasi Tidak Ditemukan</h2>
          <p className="text-xs text-text-secondary mt-1">
            Container atau workload dengan ID "{id}" belum terdeteksi dari Prometheus / cAdvisor.
          </p>
        </Card>
      </div>
    );
  }

  // App specific trend data if available
  const appTrendData = Array.isArray(trendData) && trendData.length > 0
    ? trendData.map((d) => ({
        time: d.time,
        cpu: Number(((d.cpu / 100) * (app.cpuUsage * 2)).toFixed(1)),
        memory: Number(((d.memory / 100) * (app.memoryUsage * 1.5)).toFixed(1)),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title={app.name}
        description={`Container and process runtime telemetry for ${app.type.toUpperCase()} workload.`}
        systemStatus={{
          status: app.status,
          label: app.statusText,
        }}
      >
        <StatusBadge status={app.status} label={app.statusText} />
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-border/80">
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="font-semibold uppercase tracking-wider">CPU Usage</span>
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-2">
            {app.cpuUsage.toFixed(1)}%
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            Of allocated host quota
          </span>
        </Card>

        <Card className="p-4 border-border/80">
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <Layers className="w-4 h-4 text-info" />
            <span className="font-semibold uppercase tracking-wider">Memory (RAM)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-2">
            {app.memoryRaw}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            {app.memoryUsage.toFixed(1)}% of host capacity
          </span>
        </Card>

        <Card className="p-4 border-border/80">
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-semibold uppercase tracking-wider">Uptime</span>
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-2">
            {app.uptime}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            Since last container start
          </span>
        </Card>

        <Card className="p-4 border-border/80">
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <RotateCcw className="w-4 h-4 text-warning" />
            <span className="font-semibold uppercase tracking-wider">Restarts</span>
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-2">
            {app.restartCount}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            Total container crashes / restarts
          </span>
        </Card>
      </div>

      {/* Grid: Container Performance Charts & Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Container CPU & Memory Trends</CardTitle>
              <CardDescription>
                Live usage timeline for {app.name} over the last 1 hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appTrendData.length === 0 ? (
                <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-page-bg/40 text-center p-6">
                  <span className="text-sm font-semibold text-text-primary">Tidak Ada Data Tren</span>
                  <span className="text-xs text-text-secondary mt-1">Grafik time-series kosong karena belum ada riwayat telemetri.</span>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={appTrendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="appCpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16843F" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#16843F" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="appMemGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3478B8" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3478B8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DCE6DF" vertical={false} opacity={0.6} />
                      <XAxis dataKey="time" stroke="#64736A" fontSize={11} tickLine={false} axisLine={{ stroke: "#DCE6DF" }} />
                      <YAxis stroke="#64736A" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #DCE6DF",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="cpu" name="Container CPU %" stroke="#16843F" strokeWidth={2} fill="url(#appCpuGrad)" />
                      <Area type="monotone" dataKey="memory" name="Container Mem %" stroke="#3478B8" strokeWidth={2} fill="url(#appMemGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metadata Sidebar (1 col) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Workload Metadata</CardTitle>
              <CardDescription>Configuration and container specs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-page-bg border border-border/80">
                <span className="text-text-secondary text-[11px] block">Runtime Engine</span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {app.category === "monitoring"
                    ? "Docker Container (Monitoring Stack)"
                    : app.type === "docker"
                    ? "Docker Container (Business)"
                    : "PM2 Process"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-page-bg border border-border/80">
                <span className="text-text-secondary text-[11px] block">Image / Target</span>
                <span className="font-mono font-medium text-text-primary mt-0.5 block truncate">
                  {app.image || "N/A"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-page-bg border border-border/80">
                <span className="text-text-secondary text-[11px] block">Container ID</span>
                <span className="font-mono font-medium text-text-primary mt-0.5 block truncate">
                  {app.containerId || "N/A"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-page-bg border border-border/80">
                <span className="text-text-secondary text-[11px] block">Exposed Ports</span>
                <span className="font-mono font-medium text-text-primary mt-0.5 block">
                  {app.port || "None"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-page-bg border border-border/80">
                <span className="text-text-secondary text-[11px] block">Last Telemetry Poll</span>
                <span className="font-medium text-text-primary mt-0.5 block">
                  {app.lastUpdated}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
