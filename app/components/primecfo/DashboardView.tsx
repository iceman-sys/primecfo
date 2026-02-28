"use client";

import React, { useState } from "react";
import { RefreshCw, Calendar, ChevronDown, Download, Loader2, AlertTriangle, X, Link2 } from "lucide-react";
import MetricCards from "./MetricCards";
import RevenueChart from "./RevenueChart";
import CashFlowChart from "./CashFlowChart";
import AIInsights from "./AIInsights";
import { MetricCard, ChartDataPoint, AIInsight, Client, timeAgo } from "@/lib/financialData";

export type DashboardRange = "3m" | "6m" | "12m" | "4q";

const PERIOD_OPTIONS: { range: DashboardRange; label: string }[] = [
  { range: "3m", label: "Last 3 Months" },
  { range: "6m", label: "Last 6 Months" },
  { range: "12m", label: "Trailing 12 Months" },
  { range: "4q", label: "Last 4 Quarters" },
];

interface DashboardViewProps {
  metrics: MetricCard[];
  chartData: ChartDataPoint[];
  insights: AIInsight[];
  client: Client | null;
  onNavigate: (view: string) => void;
  selectedPeriodLabel?: string;
  range?: DashboardRange;
  onPeriodChange?: (range: DashboardRange) => void;
  onSync?: () => void;
  syncing?: boolean;
  isLoading?: boolean;
  loadError?: unknown;
  hasSyncedData?: boolean;
  /** Show inline warning when sync failed due to QuickBooks not connected */
  showSyncConnectionWarning?: boolean;
  onDismissSyncWarning?: () => void;
  onConnectClick?: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  chartData,
  insights,
  client,
  onNavigate,
  selectedPeriodLabel = "Trailing 12 Months",
  range = "12m",
  onPeriodChange,
  onSync,
  syncing = false,
  isLoading = false,
  loadError,
  hasSyncedData = false,
  showSyncConnectionWarning = false,
  onDismissSyncWarning,
  onConnectClick,
}) => {
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  return (
    <div>
      {showSyncConnectionWarning && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">QuickBooks is not connected</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect QuickBooks to sync financial data for this client.
            </p>
            {onConnectClick && (
              <button
                type="button"
                onClick={onConnectClick}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm font-medium hover:bg-amber-500/30 transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Connect QuickBooks
              </button>
            )}
          </div>
          {onDismissSyncWarning && (
            <button
              type="button"
              onClick={onDismissSyncWarning}
              aria-label="Dismiss"
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">
            {client?.companyName || "Select a client"} — {selectedPeriodLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white hover:bg-slate-600 transition-colors"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">{selectedPeriodLabel}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {periodDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPeriodDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-20">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.range}
                      onClick={() => {
                        onPeriodChange?.(opt.range);
                        setPeriodDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-600 transition-colors ${
                        range === opt.range ? "text-teal-400 bg-slate-600/50" : "text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onSync}
            disabled={syncing || !client?.id}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium rounded-lg hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing..." : "Sync"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {(syncing || isLoading) && (
        <div className="mb-6 bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-teal-400">
              {syncing ? "Syncing financial data from QuickBooks..." : "Loading dashboard..."}
            </p>
            <p className="text-xs text-slate-400">
              {syncing ? "Pulling latest reports and calculating metrics" : "Fetching summary and trends"}
            </p>
          </div>
        </div>
      )}

      {!!loadError && !syncing && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {loadError instanceof Error ? (loadError as Error).message : "Failed to load dashboard data"}
        </div>
      )}

      {!isLoading && !loadError && client && !hasSyncedData && !syncing && (
        <div className="mb-6 bg-slate-700/30 border border-slate-600 rounded-xl p-4 text-slate-400 text-sm">
          No financial data yet. Click &quot;Sync&quot; to pull reports from QuickBooks and see metrics and trends here.
        </div>
      )}

      <div className="mb-6">
        <MetricCards metrics={metrics} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={chartData} />
        <CashFlowChart data={chartData} />
      </div>

      <div className="mb-6">
        <AIInsights insights={insights} compact />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate("reports")}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-teal-500/30 hover:bg-slate-800 transition-all text-left group"
        >
          <p className="text-sm font-semibold text-white mb-1 group-hover:text-teal-400 transition-colors">View Full Reports</p>
          <p className="text-xs text-slate-400">P&L, Balance Sheet, Cash Flow</p>
        </button>
        <button
          onClick={() => onNavigate("insights")}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-violet-500/30 hover:bg-slate-800 transition-all text-left group"
        >
          <p className="text-sm font-semibold text-white mb-1 group-hover:text-violet-400 transition-colors">All AI Insights</p>
          <p className="text-xs text-slate-400">{insights.length} insights available</p>
        </button>
        <button
          onClick={() => onNavigate("connect")}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-slate-800 transition-all text-left group"
        >
          <p className="text-sm font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">Connection Status</p>
          <p className="text-xs text-slate-400">{client?.qbStatus === "connected" ? `Last sync ${timeAgo(client.lastSync)}` : "Not connected"}</p>
        </button>
      </div>
    </div>
  );
};

export default DashboardView;
