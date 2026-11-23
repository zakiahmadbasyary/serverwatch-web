"use client";

import React, { Suspense, useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { MetricsProvider } from "@/components/providers/metrics-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MetricsProvider>
      <div className="min-h-screen flex bg-page-bg">
        <Suspense fallback={<aside className="hidden lg:block w-64 sticky top-0 h-screen bg-surface border-r border-border" />}>
          <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </Suspense>
        <div className="flex-1 flex flex-col min-w-0">
          <Suspense fallback={<header className="h-16 bg-surface border-b border-border" />}>
            <AppTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          </Suspense>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Suspense fallback={<div className="p-8 text-center text-text-secondary">Loading content...</div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </MetricsProvider>
  );
}
