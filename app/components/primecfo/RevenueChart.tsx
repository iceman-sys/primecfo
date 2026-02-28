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
  BarChart,
  Bar,
} from "recharts";
import { ChartDataPoint } from "@/lib/financialData";
import { BarChart3, TrendingUp } from "lucide-react";

interface RevenueChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-300 capitalize">{entry.name}:</span>
            <span className="text-white font-medium">${(entry.value / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [showProfit, setShowProfit] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Revenue & Expenses</h3>
          <p className="text-sm text-slate-400">Trailing 12-month performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfit(!showProfit)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              showProfit ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-slate-700 text-slate-300 border border-slate-600"
            }`}
          >
            {showProfit ? "Hide" : "Show"} Profit
          </button>
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setChartType("area")}
              className={`p-1.5 rounded-md transition-all ${chartType === "area" ? "bg-slate-600 text-white" : "text-slate-400"}`}
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded-md transition-all ${chartType === "bar" ? "bg-slate-600 text-white" : "text-slate-400"}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-1.5 bg-teal-400 rounded-full" />
          <span className="text-xs text-slate-400">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1.5 bg-slate-400 rounded-full" />
          <span className="text-xs text-slate-400">Expenses</span>
        </div>
        {showProfit && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-1.5 bg-violet-400 rounded-full" />
            <span className="text-xs text-slate-400">Profit</span>
          </div>
        )}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" stroke="#94a3b8" strokeWidth={2} fill="url(#colorExpenses)" strokeDasharray="5 5" />
              {showProfit && <Area type="monotone" dataKey="profit" stroke="#a78bfa" strokeWidth={2} fill="url(#colorProfit)" />}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#64748b" radius={[4, 4, 0, 0]} />
              {showProfit && <Bar dataKey="profit" fill="#a78bfa" radius={[4, 4, 0, 0]} />}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
