"use client";

import React from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ApplicationTable } from "@/components/dashboard/application-table";
import { useMetrics } from "@/hooks/use-metrics";
import { Card } from "@/components/ui/card";

export default function ApplicationsPage() {
  const { applications, isConnected } = useMetrics();

  const dockerCount = applications.filter((a) => a.type === "docker").length;
  const pm2Count = applications.filter((a) => a.type === "pm2").length;
  const healthyCount = applications.filter((a) => a.status === "healthy").length;
  const issueCount = applications.filter((a) => a.status !== "healthy").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Monitored Applications"
        description="Daftar container Docker dan proses aplikasi PM2 yang berjalan di dalam VPS."
        systemStatus={{
          status: isConnected ? "healthy" : "warning",
          label: isConnected
            ? `${healthyCount}/${applications.length} Services Healthy (Live)`
            : "Tidak Ada Data (Disconnected)",
        }}
      />

      {/* Runtimes Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-border/80">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Total Workloads
          </span>
          <div className="text-2xl font-bold text-text-primary mt-1 font-mono">
            {applications.length}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            {dockerCount} Docker • {pm2Count} PM2
          </span>
        </Card>

        <Card className="p-4 border-border/80">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Healthy Services
          </span>
          <div className="text-2xl font-bold text-primary mt-1 font-mono">
            {healthyCount}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            Normal operational state
          </span>
        </Card>

        <Card className="p-4 border-border/80">
          <span className="text-xs font-semibold text-warning uppercase tracking-wider">
            Requires Attention
          </span>
          <div className="text-2xl font-bold text-warning mt-1 font-mono">
            {issueCount}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            High memory / stopped
          </span>
        </Card>

        <Card className="p-4 border-border/80">
          <span className="text-xs font-semibold text-info uppercase tracking-wider">
            Monitoring Stack
          </span>
          <div className="text-2xl font-bold text-text-primary mt-1 font-mono">
            {applications.filter((a) => a.category === "monitoring").length} Active
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block truncate">
            Prometheus, Grafana, Node-Exp, cAdvisor
          </span>
        </Card>
      </div>

      {/* Applications Full Table */}
      <ApplicationTable applications={applications} showSearch={true} />
    </div>
  );
}
