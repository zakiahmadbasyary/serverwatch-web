"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, RefreshCw, Clock, Server, CheckCircle2 } from "lucide-react";
import { SampleDataBadge } from "@/components/dashboard/status-badge";
import { mockSystemInfo } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface AppTopbarProps {
  onOpenSidebar: () => void;
}

export function AppTopbar({ onOpenSidebar }: AppTopbarProps) {
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("Just now");

  const getPageTitle = () => {
    if (pathname === "/") return "Server Overview";
    if (pathname.startsWith("/server")) return "Server Performance Detail";
    if (pathname.startsWith("/applications/")) return "Application Detail";
    if (pathname.startsWith("/applications")) return "Monitored Applications";
    return "Dashboard";
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const now = new Date();
      setLastRefreshed(
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 600);
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
            Target Host: <span className="font-mono font-medium text-text-primary">{mockSystemInfo.hostname}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Sample Data Badge */}
        <SampleDataBadge className="hidden md:inline-flex" />

        {/* Last updated indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary font-medium">
          <Clock className="w-3.5 h-3.5 text-text-secondary" />
          <span>Updated: {lastRefreshed}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-all active:scale-95",
            isRefreshing && "opacity-75 cursor-not-allowed"
          )}
          title="Refresh Data"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
