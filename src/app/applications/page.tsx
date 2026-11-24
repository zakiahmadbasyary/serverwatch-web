"use client";

import React from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ApplicationTable } from "@/components/dashboard/application-table";
import { useMetrics } from "@/hooks/use-metrics";
import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

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

      {/* Informative notice if PM2 exporter has not been scraped yet */}
      {isConnected && pm2Count === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0 text-primary">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-bold text-text-primary">
                Modul PM2 Prometheus Belum Terdeteksi
              </span>
              <p className="text-text-secondary text-[11px] mt-0.5">
                Untuk menampilkan 15 proses PM2 secara real-time, pasang modul{" "}
                <code className="font-mono bg-page-bg px-1.5 py-0.5 rounded border border-border text-text-primary">
                  pm2-prom-module
                </code>{" "}
                di VPS dan tambahkan scrape target port{" "}
                <code className="font-mono bg-page-bg px-1.5 py-0.5 rounded border border-border text-text-primary">
                  9988
                </code>{" "}
                ke Prometheus.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-text-secondary bg-page-bg px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto border border-border">
            Target Standby
          </span>
        </div>
      )}

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
