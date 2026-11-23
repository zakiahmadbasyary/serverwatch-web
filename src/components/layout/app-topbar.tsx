"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, RefreshCw, Clock, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { useMetrics } from "@/hooks/use-metrics";
import { cn } from "@/lib/utils";

interface AppTopbarProps {
  onOpenSidebar: () => void;
}

export function AppTopbar({ onOpenSidebar }: AppTopbarProps) {
  const pathname = usePathname();
  const { isConnected, source, isRefreshing, lastUpdated, refresh, systemInfo } = useMetrics();

  const getPageTitle = () => {
    if (pathname === "/") return "Server Overview";
    if (pathname.startsWith("/server")) return "Server Performance Detail";
    if (pathname.startsWith("/applications/")) return "Application Detail";
    if (pathname.startsWith("/applications")) return "Monitored Applications";
    return "Dashboard";
  };

  return (
    <header className="h-16 bg-surface border-b border-border px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base lg:text-lg font-bold text-text-primary tracking-tight leading-none">
            {getPageTitle()}
          </h1>
          <p className="text-[11px] text-text-secondary mt-0.5 hidden sm:block">
            Target Host: <span className="font-mono font-medium text-text-primary">{systemInfo.hostname}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Connection Status Badge */}
        {isConnected ? (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Prometheus Live
          </span>
        ) : (
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-text-secondary border border-border"
            title="Prometheus unreachable. No data available."
          >
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Prometheus Disconnected (No Data)
          </span>
        )}

        {/* Last updated indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary font-medium">
          <Clock className="w-3.5 h-3.5 text-text-secondary" />
          <span>Updated: {lastUpdated}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-all active:scale-95",
            isRefreshing && "opacity-75 cursor-not-allowed"
          )}
          title="Refresh Metrics Now"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
