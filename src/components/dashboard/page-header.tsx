import React from "react";
import { StatusBadge, SampleDataBadge } from "@/components/dashboard/status-badge";
import { MetricStatus } from "@/types/monitoring";

interface PageHeaderProps {
  title: string;
  description: string;
  systemStatus?: {
    status: MetricStatus;
    label: string;
  };
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  systemStatus = { status: "healthy", label: "All Systems Operational" },
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-dark tracking-tight">
            {title}
          </h2>
          {systemStatus && (
            <StatusBadge status={systemStatus.status} label={systemStatus.label} />
          )}
        </div>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">{description}</p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <SampleDataBadge className="md:hidden" />
        {children}
      </div>
    </div>
  );
}
