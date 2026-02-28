"use client";

import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  PieChart,
} from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const formatPercent = (n: number) => `${n.toFixed(1)}%`;

const analyticsData = {
  kpis: {
    grossMargin: 42.5,
    netMargin: 18.3,
    currentRatio: 2.1,
    quickRatio: 1.8,
    dso: 45,
    dpo: 30,
    burnRate: 280000,
    runway: 10.2,
  },
  trends: {
    revenue: [
      { month: "Jul", value: 420000 },
      { month: "Aug", value: 485000 },
      { month: "Sep", value: 520000 },
      { month: "Oct", value: 510000 },
      { month: "Nov", value: 495000 },
    ],
    expenses: [
      { month: "Jul", value: 380000 },
      { month: "Aug", value: 410000 },
      { month: "Sep", value: 435000 },
      { month: "Oct", value: 420000 },
      { month: "Nov", value: 398000 },
    ],
  },
  budgetVariance: {
    revenue: { actual: 2430000, budget: 2500000, variance: -2.8 },
    expenses: { actual: 1865000, budget: 1800000, variance: 3.6 },
  },
};

const maxChartValue = 600000;

export default function AnalyticsTab() {
  const { kpis, trends, budgetVariance } = analyticsData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Gross Margin</p>
          <p className="text-xl font-bold text-white">{formatPercent(kpis.grossMargin)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-400">+2.3%</span>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Net Margin</p>
          <p className="text-xl font-bold text-white">{formatPercent(kpis.netMargin)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowDownRight className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-400">-0.8%</span>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Current Ratio</p>
          <p className="text-xl font-bold text-white">{kpis.currentRatio.toFixed(1)}</p>
          <span className="text-xs text-slate-500">Healthy</span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Quick Ratio</p>
          <p className="text-xl font-bold text-white">{kpis.quickRatio.toFixed(1)}</p>
          <span className="text-xs text-slate-500">Strong</span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Days Sales Outstanding</p>
          <p className="text-xl font-bold text-white">{kpis.dso} days</p>
          <span className="text-xs text-amber-400">Needs improvement</span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Days Payable Outstanding</p>
          <p className="text-xl font-bold text-white">{kpis.dpo} days</p>
          <span className="text-xs text-emerald-400">Optimal</span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Monthly Burn Rate</p>
          <p className="text-xl font-bold text-white">{formatCurrency(kpis.burnRate)}</p>
          <span className="text-xs text-slate-500">Avg last 3 months</span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Runway</p>
          <p className="text-xl font-bold text-white">{kpis.runway.toFixed(1)} mo</p>
          <span className="text-xs text-slate-500">At current burn</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Expenses Trend</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {trends.revenue.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end gap-1">
                <div
                  className="w-full bg-emerald-500 rounded-t min-h-[2px]"
                  style={{ height: `${(item.value / maxChartValue) * 100}%` }}
                />
                <div
                  className="w-full bg-red-500/80 rounded-b min-h-[2px]"
                  style={{ height: `${(trends.expenses[idx].value / maxChartValue) * 100}%` }}
                />
                <p className="text-xs text-center text-slate-500">{item.month}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-sm text-slate-400">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-slate-400">Expenses</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Budget vs Actual (YTD)</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Revenue</span>
                <span
                  className={`text-sm font-medium ${
                    budgetVariance.revenue.variance < 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {budgetVariance.revenue.variance}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Actual: {formatCurrency(budgetVariance.revenue.actual)}</span>
                  <span>Budget: {formatCurrency(budgetVariance.revenue.budget)}</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (budgetVariance.revenue.actual / budgetVariance.revenue.budget) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Expenses</span>
                <span
                  className={`text-sm font-medium ${
                    budgetVariance.expenses.variance > 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  +{budgetVariance.expenses.variance}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Actual: {formatCurrency(budgetVariance.expenses.actual)}</span>
                  <span>Budget: {formatCurrency(budgetVariance.expenses.budget)}</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (budgetVariance.expenses.actual / budgetVariance.expenses.budget) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Financial Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/reports"
            className="p-4 border border-slate-600 rounded-xl hover:bg-slate-700/30 text-left transition-colors"
          >
            <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="font-medium text-white">Profit & Loss Statement</h4>
            <p className="text-sm text-slate-500">Income statement for the period</p>
          </Link>
          <Link
            href="/reports"
            className="p-4 border border-slate-600 rounded-xl hover:bg-slate-700/30 text-left transition-colors"
          >
            <BarChart3 className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="font-medium text-white">Balance Sheet</h4>
            <p className="text-sm text-slate-500">Financial position snapshot</p>
          </Link>
          <Link
            href="/reports"
            className="p-4 border border-slate-600 rounded-xl hover:bg-slate-700/30 text-left transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-violet-400 mb-2" />
            <h4 className="font-medium text-white">Cash Flow Statement</h4>
            <p className="text-sm text-slate-500">Cash movement analysis</p>
          </Link>
          <button
            type="button"
            className="p-4 border border-slate-600 rounded-xl hover:bg-slate-700/30 text-left transition-colors"
          >
            <PieChart className="w-6 h-6 text-amber-400 mb-2" />
            <h4 className="font-medium text-white">Custom Report Builder</h4>
            <p className="text-sm text-slate-500">Create custom financial reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}
