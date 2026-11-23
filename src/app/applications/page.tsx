import React from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ApplicationTable } from "@/components/dashboard/application-table";
import { mockApplications } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Layers, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

export default function ApplicationsPage() {
  const dockerCount = mockApplications.filter((a) => a.type === "docker").length;
  const pm2Count = mockApplications.filter((a) => a.type === "pm2").length;
  const healthyCount = mockApplications.filter((a) => a.status === "healthy").length;
  const issueCount = mockApplications.filter((a) => a.status !== "healthy").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Monitored Applications"
        description="Daftar container Docker dan proses aplikasi PM2 yang berjalan di dalam VPS."
        systemStatus={{
          status: issueCount === 0 ? "healthy" : "warning",
          label: `${healthyCount}/${mockApplications.length} Services Healthy`,
        }}
      />

      {/* Runtimes Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-border/80">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Total Workloads
          </span>
          <div className="text-2xl font-bold text-text-primary mt-1 font-mono">
            {mockApplications.length}
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
            cAdvisor Agent
          </span>
          <div className="text-2xl font-bold text-text-primary mt-1 font-mono">
            Active
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            Telemetry ready for Phase 3
          </span>
        </Card>
      </div>

      {/* Applications Full Table */}
      <ApplicationTable applications={mockApplications} showSearch={true} />
    </div>
  );
}
