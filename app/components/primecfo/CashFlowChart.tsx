"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartDataPoint } from "@/lib/financialData";
import { Wallet } from "lucide-react";

interface CashFlowChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
        <p className="text-sm text-white font-semibold">${(payload[0].value / 1000).toFixed(1)}K</p>
      </div>
    );
  }
  return null;
};

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Cash Position</h3>
          <p className="text-sm text-slate-400">12-month cash balance trend</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full">
          <Wallet className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-semibold text-teal-400">$0</span>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cash" stroke="#06b6d4" strokeWidth={2.5} fill="url(#cashGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
