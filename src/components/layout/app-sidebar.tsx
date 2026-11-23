"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Layers,
  Radio,
  ExternalLink,
  X,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      name: "Server Performance",
      href: "/server",
      icon: Server,
      active: pathname.startsWith("/server"),
    },
    {
      name: "Applications",
      href: "/applications",
      icon: Layers,
      active: pathname.startsWith("/applications"),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-base text-text-primary tracking-tight leading-tight">
                ServerWatch
              </div>
              <div className="text-[11px] font-medium text-text-secondary leading-none">
                Infrastructure Monitoring
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  item.active
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    item.active ? "text-primary" : "text-text-secondary"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status Card */}
        <div className="p-4 border-t border-border bg-[#FBFDFB]">
          <div className="rounded-xl border border-border/80 bg-surface p-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-text-primary mb-1">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                Phase 2 Prototype
              </span>
              <span className="text-[10px] text-primary bg-primary-soft px-1.5 py-0.5 rounded font-mono">
                UI Mock
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Monitoring node exporter & cAdvisor siap dihubungkan di Phase 3.
            </p>
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-secondary">
              <span>ServerWatch Web</span>
              <span className="font-mono">v0.2.0</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
