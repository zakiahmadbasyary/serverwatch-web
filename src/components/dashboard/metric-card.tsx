import React from "react";
import { Cpu, HardDrive, Network, Layers, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ServerMetric } from "@/types/monitoring";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  metric: ServerMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const getIcon = () => {
    switch (metric.id) {
      case "cpu":
        return Cpu;
      case "memory":
        return Layers;
      case "disk":
        return HardDrive;
      case "network":
        return Network;
      default:
        return Cpu;
    }
  };

  const Icon = getIcon();

  const getTrendIcon = () => {
    if (metric.trend === "up") return TrendingUp;
    if (metric.trend === "down") return TrendingDown;
    return Minus;
  };

  const TrendIcon = getTrendIcon();

  // Progress percentage (bounded 0 to 100)
  const percent = Math.min(Math.max(metric.value, 0), 100);

  const getProgressColor = () => {
    if (metric.status === "critical") return "bg-danger";
    if (metric.status === "warning") return "bg-warning";
    return "bg-primary";
  };

  return (
    <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-all border-border/80">
      <div>
        {/* Header row: Icon, Label, Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {metric.label}
              </span>
              <div className="text-[11px] text-text-secondary">
                {metric.statusText}
              </div>
            </div>
          </div>
          <StatusBadge status={metric.status} size="sm" />
        </div>

        {/* Value and change */}
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {metric.formattedValue}
          </div>
          {metric.change && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded",
                metric.trend === "up" && metric.id !== "network"
                  ? "text-warning bg-[#FFF9E6]"
                  : "text-primary bg-primary-soft"
              )}
            >
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{metric.change}</span>
            </div>
          )}
        </div>

        {/* Progress bar for percent metrics */}
        {metric.unit === "%" && (
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", getProgressColor())}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Detail description footer */}
      {metric.detail && (
        <div className="mt-4 pt-3 border-t border-border/60 text-xs text-text-secondary flex items-center justify-between">
          <span className="truncate">{metric.detail}</span>
        </div>
      )}
    </Card>
  );
}
