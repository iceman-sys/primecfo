"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { FileText, Download, Calendar, ChevronDown, ChevronRight, Loader2, Printer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import { getReports, syncReports, SyncError, type ReportRange, type PeriodType } from "@/lib/api/client";
import { toastErrorWithProgress } from "@/app/components/ui/sonner";
import { flattenReportRows, humanizeAccountLabel } from "@/lib/reportUtils";
import type { FlatReportRow } from "@/lib/reportUtils";

const REPORT_TABS: Array<{ id: "pnl" | "balance_sheet" | "cash_flow"; label: string }> = [
  { id: "pnl", label: "Profit & Loss" },
  { id: "balance_sheet", label: "Balance Sheet" },
  { id: "cash_flow", label: "Cash Flow Statement" },
];

/** Build section boundaries: sectionStartIndices[s] = row index where section s starts (depth 0). */
function buildSectionStartIndices(flatRows: FlatReportRow[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < flatRows.length; i++) {
    if (flatRows[i].depth === 0) out.push(i);
  }
  return out;
}

function getSectionIndex(rowIndex: number, sectionStartIndices: number[]): number {
  for (let s = sectionStartIndices.length - 1; s >= 0; s--) {
    if (sectionStartIndices[s] <= rowIndex) return s;
  }
  return 0;
}

function ReportTable({
  activeReport,
  singlePeriod,
  rangeLabels,
  range,
  activeTab,
  collapsedSections,
  onToggleSection,
}: {
  activeReport: { raw_json: unknown; synced_at?: string };
  singlePeriod: { label?: string; start_date?: string; end_date?: string } | null;
  rangeLabels: Record<string, string>;
  range: string;
  activeTab: string;
  collapsedSections: Set<number>;
  onToggleSection: (sectionIndex: number) => void;
}) {
  const raw = activeReport.raw_json as Record<string, unknown>;
  const flatRows = useMemo(
    () => flattenReportRows((raw as { Rows?: unknown }).Rows).slice(0, 500),
    [raw]
  );
  const sectionStartIndices = useMemo(() => buildSectionStartIndices(flatRows), [flatRows]);
  const reportTitle = REPORT_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;

  if (flatRows.length === 0) {
    return (
      <pre className="text-xs bg-slate-900 p-3 rounded overflow-auto max-h-48 text-slate-400">
        {JSON.stringify(raw, null, 2).slice(0, 2000)}
        {JSON.stringify(raw).length > 2000 ? "…" : ""}
      </pre>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-xl font-semibold text-white">
            {singlePeriod?.label ?? rangeLabels[range]}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {singlePeriod?.start_date && singlePeriod?.end_date
              ? `${singlePeriod.start_date} – ${singlePeriod.end_date}`
              : ""}
            {activeReport.synced_at && (
              <> · Synced {new Date(activeReport.synced_at).toLocaleString()}</>
            )}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border border-slate-700/50 bg-slate-900/30">
        <table className="w-full border-collapse" aria-label={`${reportTitle}, ${singlePeriod?.label ?? range}`}>
          <caption className="sr-only">
            {reportTitle} for {singlePeriod?.label ?? range}
            {singlePeriod?.start_date && singlePeriod?.end_date && ` (${singlePeriod.start_date} – ${singlePeriod.end_date})`}
          </caption>
          <thead className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700/50 shadow-sm">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {flatRows.map((fr, rowIdx) => {
              const sectionIndex = getSectionIndex(rowIdx, sectionStartIndices);
              const isSectionHeaderRow = sectionStartIndices[sectionIndex] === rowIdx;
              const isCollapsed = collapsedSections.has(sectionIndex);
              const sectionRowCount = sectionIndex < sectionStartIndices.length - 1
                ? sectionStartIndices[sectionIndex + 1] - sectionStartIndices[sectionIndex]
                : flatRows.length - sectionStartIndices[sectionIndex];
              const canCollapse = isSectionHeaderRow && sectionRowCount > 1;
              if (isCollapsed && !isSectionHeaderRow) return null;

              const hasValue = fr.value !== undefined && fr.value !== "" && fr.value !== "-";
              const isSectionTotal = fr.isBold && hasValue;
              const isSectionTitleOnly = fr.isBold && !hasValue;

              let rowClass = "border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors ";
              if (isSectionTotal) {
                rowClass += "bg-slate-700/40 border-t border-slate-600/50 ";
              } else if (isSectionTitleOnly) {
                rowClass += "bg-slate-800/20 ";
              } else if (rowIdx % 2 === 1) {
                rowClass += "bg-slate-800/10 ";
              }

              return (
                <tr key={rowIdx} className={rowClass}>
                  <td
                    className={`py-2.5 px-4 text-sm ${isSectionTotal ? "font-semibold text-white" : isSectionTitleOnly ? "font-medium text-slate-400" : "text-slate-300"}`}
                    style={{ paddingLeft: `${16 + fr.depth * 24}px` }}
                  >
                    {canCollapse ? (
                      <button
                        type="button"
                        onClick={() => onToggleSection(sectionIndex)}
                        className="flex items-center gap-1.5 text-left w-full hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded"
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />
                        )}
                        {humanizeAccountLabel(fr.account || "") || "—"}
                      </button>
                    ) : (
                      <span>{humanizeAccountLabel(fr.account || "") || "—"}</span>
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-sm text-right tabular-nums ${isSectionTotal ? "font-semibold text-white" : isSectionTitleOnly ? "text-slate-500" : "text-slate-300"}`}
                  >
                    {hasValue ? fr.value : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {flatRows.length >= 500 && (
        <p className="text-xs text-slate-500 mt-2">Showing first 500 rows.</p>
      )}
    </>
  );
}

const VALID_RANGES: ReportRange[] = ["3m", "6m", "12m", "4q"];

const ReportViewer: React.FC = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedClient } = useClientContext();
  const [activeTab, setActiveTab] = useState<"pnl" | "balance_sheet" | "cash_flow">("pnl");
  const urlRange = searchParams.get("range");
  const initialRange: ReportRange =
    urlRange && VALID_RANGES.includes(urlRange as ReportRange) ? (urlRange as ReportRange) : "12m";
  const [range, setRange] = useState<ReportRange>(initialRange);
  const [periodType] = useState<PeriodType>("month");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    const r = searchParams.get("range");
    if (r && VALID_RANGES.includes(r as ReportRange)) setRange(r as ReportRange);
  }, [searchParams]);

  const rangeLabels: Record<ReportRange, string> = {
    "3m": "Last 3 Months",
    "6m": "Last 6 Months",
    "12m": "Last 12 Months",
    "4q": "Last 4 Quarters",
  };

  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ["reports", selectedClient?.id, range, periodType],
    queryFn: () => getReports(selectedClient!.id, range, periodType),
    enabled: !!selectedClient?.id,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncReports(selectedClient!.id, range, periodType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", selectedClient?.id, range, periodType] });
    },
    onError: (error) => {
      if (error instanceof SyncError && (error.code === "no_connection" || error.code === "needs_reauth")) {
        toastErrorWithProgress("QuickBooks is not connected", {
          description: "Connect QuickBooks to sync financial data.",
          duration: 10_000,
          action: {
            label: "Connect",
            onClick: () => router.push("/connect"),
          },
        });
      } else {
        toastErrorWithProgress(error instanceof Error ? error.message : "Sync failed", {
          duration: 10_000,
        });
      }
    },
  });

  /** One integrated report per report type for the selected range. */
  const activeReport = reportsData?.reports?.find(
    (r: { report_type: string }) => r.report_type === activeTab
  ) ?? null;
  const singlePeriod = reportsData?.periods?.[0] ?? null;

  if (!selectedClient) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        Select a client from the sidebar to view reports.
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Financial Reports</h3>
              <p className="text-xs text-slate-400">{selectedClient.companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white hover:bg-slate-600 transition-colors"
              >
                <Calendar className="w-4 h-4 text-slate-400" />
                {rangeLabels[range]}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {periodDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPeriodDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-20">
                    {(Object.keys(rangeLabels) as ReportRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRange(r);
                          setPeriodDropdownOpen(false);
                          router.replace(`${pathname}?range=${r}`, { scroll: false });
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-600 transition-colors ${
                          range === r ? "text-teal-400 bg-slate-600/50" : "text-slate-300"
                        }`}
                      >
                        {rangeLabels[r]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium rounded-lg hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50"
            >
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync from QuickBooks"}
            </button>
            <button
              type="button"
              disabled={!activeReport}
              onClick={() => {
                if (!activeReport) return;
                const raw = activeReport.raw_json as Record<string, unknown>;
                const rows = flattenReportRows((raw as { Rows?: unknown }).Rows);
                if (rows.length === 0) return;
                const header = "Account,Total\n";
                const body = rows.map((fr) => `"${humanizeAccountLabel(fr.account).replace(/"/g, '""')}","${(fr.value ?? "").replace(/"/g, '""')}"`).join("\n");
                const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${activeTab}-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Tabs - pill style like finance-dashboard */}
        <div className="flex gap-1 mt-5 bg-slate-700/30 rounded-lg p-1">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="p-8 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading reports…
        </div>
      )}

      {error && (
        <div className="p-6 text-center text-red-400 text-sm">
          {error instanceof Error ? error.message : "Failed to load reports"}
        </div>
      )}

      {!isLoading && !error && !reportsData?.reports?.length && (
        <div className="p-8 text-center text-slate-400 text-sm">
          No reports yet. Choose a range and click &quot;Sync from QuickBooks&quot; to pull P&L, Balance Sheet, and Cash Flow.
        </div>
      )}

      {!isLoading && reportsData?.reports?.length ? (
        <div className="p-6">
          {activeReport ? (
            <ReportTable
              activeReport={activeReport}
              singlePeriod={singlePeriod}
              rangeLabels={rangeLabels}
              range={range}
              activeTab={activeTab}
              collapsedSections={collapsedSections}
              onToggleSection={(sectionIndex) => {
                setCollapsedSections((prev) => {
                  const next = new Set(prev);
                  if (next.has(sectionIndex)) next.delete(sectionIndex);
                  else next.add(sectionIndex);
                  return next;
                });
              }}
            />
          ) : (
            <div className="text-center text-slate-500 text-sm">No data for this report type.</div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ReportViewer;
