"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MetricDataPoint } from "@/types/monitoring";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PerformanceChartProps {
  data: MetricDataPoint[];
  title?: string;
  description?: string;
  metricType?: "cpu" | "memory" | "network";
}

export function PerformanceChart({
  data,
  title = "Performance Trend",
  description = "CPU & Memory utilization over the last 1 hour",
  metricType = "cpu",
}: PerformanceChartProps) {
  const [selectedRange, setSelectedRange] = useState("1h");

  const ranges = ["1h", "6h", "24h", "7d"];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        {/* Range Selector */}
        <div className="flex items-center bg-page-bg p-1 rounded-xl border border-border self-start sm:self-auto">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                selectedRange === range
                  ? "bg-surface text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16843F" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#16843F" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3478B8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3478B8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE6DF" vertical={false} opacity={0.6} />
              <XAxis
                dataKey="time"
                stroke="#64736A"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#DCE6DF" }}
              />
              <YAxis
                stroke="#64736A"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #DCE6DF",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
                labelStyle={{ fontWeight: "bold", color: "#17251D", marginBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU Usage"
                stroke="#16843F"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#primaryGradient)"
              />
              <Area
                type="monotone"
                dataKey="memory"
                name="Memory Usage"
                stroke="#3478B8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#secondaryGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-6 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span className="font-medium text-text-primary">CPU Utilization</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-info" />
            <span className="font-medium text-text-primary">Memory Utilization</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
