"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { FileText, Download, Loader2, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import { useReportRange } from "@/contexts/ReportRangeContext";
import {
  getReports,
  syncReports,
  SyncError,
  type ReportRange,
  type PeriodType,
  getBillingStatus,
} from "@/lib/api/client";
import { toastErrorWithProgress } from "@/app/components/ui/sonner";
import ReportRangePresetBar from "@/app/components/primecfo/ReportRangePresetBar";
import {
  humanizeAccountLabel,
  flattenReportRowsMulti,
  detectPnlNetIncomeAnomaly,
  type FlatMultiPeriodRow,
} from "@/lib/reportUtils";

type ActiveReport = "pnl" | "balance_sheet" | "cash_flow";

const REPORT_TABS: Array<{ id: ActiveReport; label: string }> = [
  { id: "pnl", label: "Profit & Loss" },
  { id: "balance_sheet", label: "Balance Sheet" },
  { id: "cash_flow", label: "Cash Flow Statement" },
];

const VALID_RANGES: ReportRange[] = ["3m", "6m", "12m", "4q"];

const DATE_PRESETS: { key: ReportRange; label: string }[] = [
  { key: "3m", label: "Last 3 Months" },
  { key: "6m", label: "Last 6 Months" },
  { key: "12m", label: "Last 12 Months" },
  { key: "4q", label: "Last 4 Quarters" },
];

function amountLooksNegative(cell: string): boolean {
  const t = cell.trim();
  if (t.startsWith("-")) return true;
  if (t.startsWith("(") && t.endsWith(")")) return true;
  return false;
}

/** Plain-English highlight lines (Understand / Act) — heuristic, fast, offline */
function heuristicReportSummary(
  activeReport: ActiveReport,
  titles: string[],
  rows: FlatMultiPeriodRow[]
): string {
  const lastCol = titles.length - 1;
  const totals = rows
    .filter((r) => r.rowKind === "grandTotal" || r.rowKind === "subtotal")
    .filter((r) => /total|net income|gross profit|operating/i.test(r.account));

  const pick = totals.slice(-4);
  if (pick.length === 0) {
    const big = rows
      .filter((r) => r.values.some((x) => x !== "$0"))
      .slice(-10)
      .map((r) => ({
        row: r,
        amt: parseFloat(String(r.values[lastCol]?.replace(/[$,(]/g, "") ?? "0")) || 0,
      }))
      .sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt))[0]?.row;

    const labelPeriod = titles[lastCol] ?? "the latest column";
    if (!big)
      return `Summarized ${REPORT_TABS.find((x) => x.id === activeReport)?.label}: no notable totals surfaced in this excerpt. Sync again once QuickBooks finishes aggregating periods.`;

    const lastAmt = big.values[lastCol] ?? "";
    const trend =
      titles.length >= 2
        ? ` Prior column (${titles[titles.length - 2]}): ${big.values[titles.length - 2]} — latest (${labelPeriod}) ${lastAmt}`
        : ` ${labelPeriod}: ${lastAmt}`;

    return `From your ${big.account}: ${lastAmt}.${trend} This mirrors the totals table above and is framed for readability (not personalized tax/accounting advice).`;
  }

  const lines = pick.map((t) => {
    const amt = lastCol >= 0 ? t.values[lastCol] ?? t.values[t.values.length - 1] : "";
    return `• ${t.account}: ${amt}`;
  });
  const title = REPORT_TABS.find((t) => t.id === activeReport)?.label ?? "Report";

  const periodNote =
    titles.length > 1
      ? ` Across ${titles[0]} through ${titles[titles.length - 1]}`
      : titles.length === 1
        ? ` For ${titles[0]}`
        : "";
  return `${title}${periodNote}, key takeaway lines:${"\n"}${lines.join("\n")}${"\n\n"}Use this as conversational context alongside your dashboards and advisor — not as a standalone audit artifact.`;
}

function ReportTableSkeleton({ periodSlots }: { periodSlots: number }) {
  const cols = Math.max(periodSlots + 1, 2);
  return (
    <div className="animate-pulse" aria-busy aria-label="Loading report table">
      {Array.from({ length: 12 }).map((_, ri) => (
        <div key={ri} className="flex gap-2 py-3 border-b border-slate-700/50">
          <div className="h-4 rounded flex-1 bg-slate-700 min-w-[40%]" />
          {Array.from({ length: cols - 1 }).map((__, ci) => (
            <div key={ci} className="h-4 rounded w-20 shrink-0 bg-slate-700" />
          ))}
        </div>
      ))}
    </div>
  );
}

function TabSelect(props: { value: ActiveReport; onChange: (v: ActiveReport) => void }) {
  return (
    <label className="md:hidden w-full min-h-[44px]">
      <span className="sr-only">Select report type</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as ActiveReport)}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm font-medium text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      >
        {REPORT_TABS.map((t) => (
          <option key={t.id} value={t.id} className="bg-slate-800">
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const ReportViewer: React.FC = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedClient, isLoading: clientsLoading } = useClientContext();
  const { range: globalRange, setRange: setGlobalRange } = useReportRange();

  const [activeReport, setActiveReport] = useState<ActiveReport>("pnl");
  /** Holds user selection until the URL ?range= param catches up (prevents highlight flicker). */
  const [pendingRange, setPendingRange] = useState<ReportRange | null>(null);

  const reportFromUrl = (value: string | null): ActiveReport | null => {
    if (value === "pnl" || value === "profit-loss" || value === "profit_and_loss") return "pnl";
    if (value === "balance_sheet" || value === "balance-sheet") return "balance_sheet";
    if (value === "cash_flow" || value === "cash-flow") return "cash_flow";
    return null;
  };

  const urlRangeParam = searchParams.get("range");
  const urlRange: ReportRange | null =
    urlRangeParam && VALID_RANGES.includes(urlRangeParam as ReportRange)
      ? (urlRangeParam as ReportRange)
      : null;

  const datePreset: ReportRange = pendingRange ?? urlRange ?? globalRange;

  // External navigation (back/forward, deep link) → sync global context
  useEffect(() => {
    if (urlRange && urlRange !== globalRange) {
      setGlobalRange(urlRange);
    }
  }, [urlRange, globalRange, setGlobalRange]);

  // Clear optimistic selection once URL reflects the click
  useEffect(() => {
    if (pendingRange && urlRange === pendingRange) {
      setPendingRange(null);
    }
  }, [urlRange, pendingRange]);

  useEffect(() => {
    const report = reportFromUrl(searchParams.get("report"));
    if (report) setActiveReport(report);
  }, [searchParams]);

  const periodType: PeriodType = datePreset === "4q" ? "quarter" : "month";
  const [collapsedAi, setCollapsedAi] = useState(false);

  const rangeLabels: Record<ReportRange, string> = {
    "3m": "Last 3 Months",
    "6m": "Last 6 Months",
    "12m": "Last 12 Months",
    "4q": "Last 4 Quarters",
  };

  const { data: billing } = useQuery({
    queryKey: ["billingStatus"],
    queryFn: () => getBillingStatus(),
    staleTime: 60_000,
  });

  const showAiPanel =
    billing?.currentPlan?.id === "starter" || billing?.currentPlan?.id === "growth";

  const { data: reportsData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["reports", selectedClient?.id, datePreset, periodType],
    queryFn: () => getReports(selectedClient!.id, datePreset, periodType),
    enabled: !!selectedClient?.id,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncReports(selectedClient!.id, datePreset, periodType),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["reports", selectedClient?.id, datePreset, periodType],
      }),
    onError: (syncErr: unknown) => {
      if (syncErr instanceof SyncError && (syncErr.code === "no_connection" || syncErr.code === "needs_reauth")) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else {
        toastErrorWithProgress(syncErr instanceof Error ? syncErr.message : "Sync failed", {
          duration: 10_000,
        });
      }
    },
  });

  const activeRow = reportsData?.reports?.find((r: { report_type: string }) => r.report_type === activeReport);
  const rangeLoading = isFetching || syncMutation.isPending;

  const { columnTitles, rows } = useMemo(() => {
    if (!activeRow?.raw_json) return { columnTitles: [] as string[], rows: [] as FlatMultiPeriodRow[] };
    return flattenReportRowsMulti(activeRow.raw_json as Record<string, unknown>);
  }, [activeRow]);

  const summaryText = useMemo(
    () => heuristicReportSummary(activeReport, columnTitles, rows),
    [activeReport, columnTitles, rows]
  );

  const pnlDataAnomaly = useMemo(
    () => activeReport === "pnl" && detectPnlNetIncomeAnomaly(rows),
    [activeReport, rows]
  );

  const onPresetChange = useCallback(
    (r: ReportRange) => {
      setPendingRange(r);
      setGlobalRange(r);
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", r);
      params.set("tab", "reports");
      params.set("report", activeReport);
      const nextUrl = `${pathname}?${params.toString()}`;
      window.history.replaceState(null, "", nextUrl);
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams, activeReport, setGlobalRange]
  );

  const onReportChange = useCallback(
    (report: ActiveReport) => {
      setActiveReport(report);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reports");
      params.set("report", report);
      if (!params.get("range")) params.set("range", datePreset);
      setGlobalRange(datePreset);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, datePreset, setGlobalRange]
  );

  const handleDownloadPdf = useCallback(() => {
    window.print();
  }, []);

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mr-3" />
        Loading your business…
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-8 text-center text-sm text-slate-400">
        Connect your business from the sidebar to view reports.
      </div>
    );
  }

  return (
    <div className="financial-report-print rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="px-5 py-5 sm:px-8 border-b border-slate-700/50 md:flex md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex items-start gap-3">
          <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {rangeLabels[datePreset]}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Financial Reports</h2>
            <p className="text-sm mt-1 text-slate-400">{humanizeAccountLabel(selectedClient.companyName)}</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="inline-flex justify-center items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 min-h-[44px]"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sync from QuickBooks
          </button>
          <button
            type="button"
            disabled={!activeRow?.raw_json || !rows.length}
            onClick={handleDownloadPdf}
            className="inline-flex justify-center items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-40 min-h-[44px]"
          >
            <Download className="w-4 h-4" aria-hidden />
            Download PDF
          </button>
        </div>
      </div>

      <div className="px-5 py-4 sm:px-8 pb-10">
        {/* Report tabs — desktop */}
        <div
          role="tablist"
          aria-label="Report type"
          className="hidden md:flex flex-wrap gap-1 p-1 rounded-xl border border-slate-700 bg-slate-900/50 w-fit mb-6"
        >
          {REPORT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeReport === t.id}
              onClick={() => onReportChange(t.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeReport === t.id
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="md:hidden mb-5">
          <TabSelect value={activeReport} onChange={onReportChange} />
        </div>

        {/* Date presets */}
        <ReportRangePresetBar
          presets={DATE_PRESETS}
          value={datePreset}
          onChange={onPresetChange}
          loading={rangeLoading}
          className="mb-6"
        />

        {rangeLoading && !syncMutation.isPending ? (
          <p className="mb-4 flex items-center gap-2 text-xs text-slate-500" role="status" aria-live="polite">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" aria-hidden />
            Loading {rangeLabels[datePreset]}…
          </p>
        ) : null}

        {pnlDataAnomaly && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Net Income summary rows look incorrect while expenses show activity. Try Sync again — if this persists,
            contact support to verify your QuickBooks connection.
          </div>
        )}

        {(isLoading && !reportsData) || syncMutation.isPending ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6">
            <ReportTableSkeleton periodSlots={Math.max(columnTitles.length, datePreset === "4q" ? 4 : 6)} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-center">
            <p className="text-sm text-red-300 mb-4">
              {error instanceof Error ? error.message : "Failed to load reports"}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl px-5 py-2.5 font-medium text-white min-h-[44px] bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 transition-all"
            >
              Retry
            </button>
          </div>
        ) : !reportsData?.reports?.length ? (
          <div className="text-center rounded-xl border border-slate-700/50 bg-slate-900/40 py-14 px-6 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-600" aria-hidden />
            <p className="text-sm">
              No reports yet — pick a preset and sync from QuickBooks to load P&amp;L, Balance Sheet, and Cash Flow.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`relative rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden transition-opacity duration-200 ${
                rangeLoading && rows.length ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {rangeLoading && rows.length ? (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]"
                  role="status"
                  aria-live="polite"
                  aria-label="Loading report data"
                >
                  <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-700">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    Updating…
                  </div>
                </div>
              ) : null}
              <div className="overflow-x-auto scrollbar-reports overscroll-x-contain">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    {REPORT_TABS.find((x) => x.id === activeReport)?.label ?? "Report"}, {rangeLabels[datePreset]}
                  </caption>
                  <thead className="bg-slate-800/80">
                    <tr>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 sticky left-0 z-30 border-b border-slate-700 bg-slate-800"
                      >
                        Line item
                      </th>
                      {columnTitles.map((title, i) => (
                        <th
                          key={String(i)}
                          scope="col"
                          className="text-right py-3 px-3 tabular-nums text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700 whitespace-nowrap"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows.length ? rows.slice(0, 300) : []).map((fr, ri) => {
                      const isSubtotal = fr.rowKind === "subtotal" || fr.rowKind === "grandTotal";
                      const isSection = fr.rowKind === "sectionHeader";
                      const fontWeight = isSubtotal || isSection ? 600 : 400;
                      const borderTop =
                        fr.rowKind === "grandTotal"
                          ? "3px double rgb(51 65 85)"
                          : fr.rowKind === "subtotal"
                            ? "1px solid rgb(51 65 85)"
                            : "none";

                      return (
                        <tr key={ri} style={{ borderTop }}>
                          <td
                            className={`sticky left-0 z-5 text-sm border-b border-slate-700/50 max-w-[280px] break-words ${
                              isSubtotal ? "text-white" : isSection ? "text-slate-200" : "text-slate-300"
                            } bg-slate-900/60`}
                            style={{
                              paddingLeft: `${16 + fr.depth * 20}px`,
                              fontWeight,
                              boxShadow: "4px 0 8px -4px rgba(0,0,0,0.3)",
                            }}
                          >
                            {fr.account}
                          </td>
                          {columnTitles.map((_t, ci) => {
                            const cell = fr.values[ci] ?? "$0";
                            const loss = amountLooksNegative(cell);
                            return (
                              <td
                                key={ci}
                                className={`tabular-nums whitespace-nowrap text-sm text-right py-3 px-3 border-b border-slate-700/50 ${
                                  loss ? "text-red-400" : isSubtotal ? "text-white" : "text-slate-300"
                                }`}
                                style={{ fontWeight: isSubtotal ? 600 : 500 }}
                              >
                                {cell.startsWith("-") ? `(${cell.replace(/^-/, "").trim()})` : cell}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(rows?.length ?? 0) >= 300 && (
                <p className="text-[11px] px-4 py-2 text-slate-500">Showing first 300 rows.</p>
              )}
            </div>

            {showAiPanel && rows.length ? (
              <div className="mt-6 rounded-xl border border-slate-700/50 overflow-hidden">
                <button
                  type="button"
                  id="reports-ai-summary-toggle"
                  onClick={() => setCollapsedAi((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left min-h-[48px] bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">AI summary of this report</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${collapsedAi ? "" : "rotate-180"}`}
                    aria-hidden
                  />
                </button>
                {!collapsedAi ? (
                  <div className="px-5 pb-5 border-t border-slate-700/50 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {summaryText}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportViewer;
