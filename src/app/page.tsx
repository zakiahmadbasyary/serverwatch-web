import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { ApplicationTable } from "@/components/dashboard/application-table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  mockOverviewMetrics,
  mockTrendData,
  mockApplications,
  mockSystemInfo,
} from "@/lib/mock-data";
import { CheckCircle2, AlertTriangle, Layers, Server, ArrowRight } from "lucide-react";

export default function OverviewPage() {
  const healthyCount = mockApplications.filter((a) => a.status === "healthy").length;
  const warningCount = mockApplications.filter((a) => a.status === "warning").length;
  const criticalCount = mockApplications.filter((a) => a.status === "critical").length;
  const issueCount = warningCount + criticalCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Server Overview"
        description="Ringkasan kondisi infrastruktur dan status aplikasi pada VPS produksi."
        systemStatus={{
          status: issueCount > 0 ? "warning" : "healthy",
          label: `${healthyCount}/${mockApplications.length} Services Operational`,
        }}
      >
        <Link
          href="/server"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-all shadow-xs"
        >
          <Server className="w-3.5 h-3.5" />
          <span>Server Performance</span>
        </Link>
      </PageHeader>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockOverviewMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Main Grid: Chart & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trend Chart (2 cols) */}
        <div className="lg:col-span-2">
          <PerformanceChart
            data={mockTrendData}
            title="Performance Trends"
            description="CPU & Memory utilization time-series (1-hour window)"
          />
        </div>

        {/* Application Summary Card (1 col) */}
        <div className="lg:col-span-1 flex flex-col justify-between">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Application Health</CardTitle>
              <CardDescription>
                Summary of {mockApplications.length} containers and runtimes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stat breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-primary-soft border border-primary/20">
                  <div className="text-xl font-bold text-primary">{healthyCount}</div>
                  <div className="text-[11px] font-medium text-text-secondary mt-0.5">Running</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FFF9E6] border border-warning/30">
                  <div className="text-xl font-bold text-warning">{warningCount}</div>
                  <div className="text-[11px] font-medium text-text-secondary mt-0.5">Warning</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FDF0F0] border border-danger/30">
                  <div className="text-xl font-bold text-danger">{criticalCount}</div>
                  <div className="text-[11px] font-medium text-text-secondary mt-0.5">Critical</div>
                </div>
              </div>

              {/* Host Quick Info */}
              <div className="rounded-xl border border-border p-3.5 space-y-2 bg-page-bg/50 text-xs">
                <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Host Environment
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Host:</span>
                  <span className="font-mono font-medium text-text-primary">
                    {mockSystemInfo.hostname}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>OS:</span>
                  <span className="font-medium text-text-primary">{mockSystemInfo.os}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Uptime:</span>
                  <span className="font-medium text-text-primary">{mockSystemInfo.uptime}</span>
                </div>
              </div>

              {/* Action Link */}
              <Link
                href="/applications"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary-soft text-primary hover:bg-primary hover:text-white transition-all group"
              >
                <span>Manage Applications</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monitored Applications Quick Table */}
      <ApplicationTable applications={mockApplications} limit={4} />
    </div>
  );
}
