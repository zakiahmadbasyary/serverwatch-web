import React from "react";
import { MetricStatus } from "@/types/monitoring";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface StatusBadgeProps {
  status: MetricStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, label, size = "md", className }: StatusBadgeProps) {
  const config = {
    healthy: {
      color: "bg-primary-soft text-primary border-primary/20",
      dot: "bg-primary",
      defaultLabel: "Healthy",
      Icon: CheckCircle2,
    },
    warning: {
      color: "bg-[#FFF9E6] text-warning border-warning/30",
      dot: "bg-warning",
      defaultLabel: "Warning",
      Icon: AlertTriangle,
    },
    critical: {
      color: "bg-[#FDF0F0] text-danger border-danger/30",
      dot: "bg-danger",
      defaultLabel: "Critical",
      Icon: XCircle,
    },
    unknown: {
      color: "bg-gray-100 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
      defaultLabel: "Unknown",
      Icon: HelpCircle,
    },
  }[status] || {
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    defaultLabel: "Unknown",
    Icon: HelpCircle,
  };

  const displayText = label || config.defaultLabel;
  const isSmall = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors",
        isSmall ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.color,
        className
      )}
    >
      <span className={cn("rounded-full", isSmall ? "w-1.5 h-1.5" : "w-2 h-2", config.dot)} />
      <span>{displayText}</span>
    </span>
  );
}

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-yellow/30 text-[#855B00] border border-[#FFE27A]",
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#D99A18] animate-pulse" />
      Demo / Mock Data
    </span>
  );
}
