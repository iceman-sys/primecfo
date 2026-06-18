"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { useReportRange } from "@/contexts/ReportRangeContext";
import { getAnalytics } from "@/lib/api/client";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const formatPercent = (n: number | null) => (n == null ? "N/A" : `${n.toFixed(1)}%`);

const formatRatio = (n: number | null) => (n == null ? "N/A" : n.toFixed(2));

export default function AnalyticsTab() {
  const { selectedClient } = useClientContext();
  const { range } = useReportRange();
  const clientId = selectedClient?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", clientId, range],
    queryFn: () => getAnalytics(clientId!, range),
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        Select a business to view analytics.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mr-3" />
        Loading analytics from QuickBooks…
      </div>
    );
  }

  if (error || !data?.hasData || !data.kpis) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-white font-medium mb-2">Unable to load chart data</p>
        <p className="text-slate-400 text-sm mb-4">
          {data?.error ?? (error instanceof Error ? error.message : "Connect QuickBooks and run Sync.")}
        </p>
        <Link href="/dashboard" className="text-teal-400 hover:text-teal-300 text-sm font-medium">
          Go to Dashboard to Sync →
        </Link>
      </div>
    );
  }

  const { kpis, trends } = data;
  const maxChartValue = Math.max(
    1,
    ...trends.flatMap((t) => [t.revenue, t.expenses])
  );

  const totalRevenue = trends.reduce((s, t) => s + t.revenue, 0);
  const totalExpenses = trends.reduce((s, t) => s + t.expenses, 0);

  return (
    <div className="space-y-6">
      {data.dataError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Data error detected in synced metrics. Re-sync from Dashboard and verify QBO P&amp;L totals.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Gross Margin" value={formatPercent(kpis.grossMargin)} />
        <KpiCard label="Net Margin" value={formatPercent(kpis.netMargin)} />
        <KpiCard label="Current Ratio" value={formatRatio(kpis.currentRatio)} />
        <KpiCard label="Quick Ratio" value={formatRatio(kpis.quickRatio)} subtitle="Cash + AR ÷ current liabilities" />
        <KpiCard
          label="DSO"
          value={kpis.dso != null ? `${Math.round(kpis.dso)} days` : "N/A"}
          subtitle={kpis.dsoNote ?? undefined}
        />
        <KpiCard
          label="DPO"
          value={kpis.dpo != null ? `${Math.round(kpis.dpo)} days` : "N/A"}
          subtitle={kpis.dpoNote ?? undefined}
        />
        <KpiCard label="Monthly Burn" value={kpis.burnRate != null ? formatCurrency(kpis.burnRate) : "N/A"} />
        <KpiCard
          label="Runway"
          value={kpis.runway != null ? `${kpis.runway.toFixed(1)} mo` : "N/A"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue vs Expenses Trend</h3>
          {trends.length === 0 ? (
            <p className="text-slate-400 text-sm">No monthly trend data. Run Sync with a 12-month range.</p>
          ) : (
            <>
              <div className="h-64 flex items-end justify-between gap-2">
                {trends.map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col justify-end gap-1 min-w-0">
                    <div
                      className="w-full bg-emerald-500 rounded-t min-h-[2px]"
                      style={{ height: `${Math.max(2, (item.revenue / maxChartValue) * 100)}%` }}
                    />
                    <div
                      className="w-full bg-red-500/80 rounded-b min-h-[2px]"
                      style={{ height: `${Math.max(2, (item.expenses / maxChartValue) * 100)}%` }}
                    />
                    <p className="text-xs text-center text-slate-500 truncate">{item.month}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <Legend color="bg-emerald-500" label="Revenue" />
                <Legend color="bg-red-500" label="Expenses" />
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Period Totals (synced)</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Total Revenue</span>
                <span className="text-sm font-medium text-emerald-400">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, totalRevenue > 0 ? (totalRevenue / (totalRevenue + totalExpenses)) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Total Expenses</span>
                <span className="text-sm font-medium text-red-400">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, totalExpenses > 0 ? (totalExpenses / (totalRevenue + totalExpenses)) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Aggregated from monthly QBO Profit &amp; Loss sync ({trends.length} periods).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Financial Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/reports?tab=reports&report=pnl&range=${range}`}
            className="p-4 border border-slate-600 rounded-xl hover:border-teal-500/40 hover:bg-slate-700/30 hover:-translate-y-0.5 text-left transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="font-medium text-white">Profit &amp; Loss Statement</h4>
            <p className="text-sm text-slate-500">Income statement for the period</p>
          </Link>
          <Link
            href={`/reports?tab=reports&report=balance_sheet&range=${range}`}
            className="p-4 border border-slate-600 rounded-xl hover:border-teal-500/40 hover:bg-slate-700/30 hover:-translate-y-0.5 text-left transition-all cursor-pointer"
          >
            <BarChart3 className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="font-medium text-white">Balance Sheet</h4>
            <p className="text-sm text-slate-500">Financial position snapshot</p>
          </Link>
          <Link
            href={`/reports?tab=reports&report=cash_flow&range=${range}`}
            className="p-4 border border-slate-600 rounded-xl hover:border-teal-500/40 hover:bg-slate-700/30 hover:-translate-y-0.5 text-left transition-all cursor-pointer"
          >
            <TrendingUp className="w-6 h-6 text-violet-400 mb-2" />
            <h4 className="font-medium text-white">Cash Flow Statement</h4>
            <p className="text-sm text-slate-500">Cash movement analysis</p>
          </Link>
          <div
            className="p-4 border border-slate-600/50 rounded-xl text-left opacity-50 cursor-not-allowed relative"
            title="Coming soon — custom reporting for a future release"
          >
            <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
            <PieChart className="w-6 h-6 text-amber-400 mb-2" />
            <h4 className="font-medium text-white">Custom Report Builder</h4>
            <p className="text-sm text-slate-500">Create custom financial reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
