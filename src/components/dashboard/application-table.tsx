"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MonitoredApplication } from "@/types/monitoring";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Search, ChevronRight, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicationTableProps {
  applications: MonitoredApplication[];
  showSearch?: boolean;
  limit?: number;
}

export function ApplicationTable({
  applications,
  showSearch = true,
  limit,
}: ApplicationTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.image && app.image.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === "all" ? true : app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const displayedApps = limit ? filtered.slice(0, limit) : filtered;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle>Monitored Applications & Containers</CardTitle>
          <CardDescription>
            Docker containers and PM2 application runtimes status
          </CardDescription>
        </div>

        {showSearch && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search container..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-page-bg border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-text-primary"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-1.5 px-3 text-xs bg-page-bg border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-page-bg/70 border-b border-border text-text-secondary font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-5">Application / Name</th>
                <th className="py-3 px-4">Runtime</th>
                <th className="py-3 px-4">CPU</th>
                <th className="py-3 px-4">Memory</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Uptime</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {displayedApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-text-secondary">
                    No applications match your filter criteria.
                  </td>
                </tr>
              ) : (
                displayedApps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-primary-soft/30 transition-colors group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-text-primary text-sm group-hover:text-primary transition-colors">
                        {app.name}
                      </div>
                      <div className="text-[11px] text-text-secondary font-mono">
                        {app.image || app.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                          app.type === "docker"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        )}
                      >
                        {app.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                      {app.cpuUsage.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-medium text-text-primary">
                        {app.memoryRaw}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {app.memoryUsage.toFixed(1)}% of host
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status} label={app.statusText} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {app.uptime}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-all"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {limit && applications.length > limit && (
          <div className="p-4 border-t border-border/80 bg-[#FAFCFA] text-center">
            <Link
              href="/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              <span>View all {applications.length} applications</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
