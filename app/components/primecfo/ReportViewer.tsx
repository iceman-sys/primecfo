"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { FileText, Download, Loader2, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import {
  getReports,
  syncReports,
  SyncError,
  type ReportRange,
  type PeriodType,
  getBillingStatus,
} from "@/lib/api/client";
import { toastErrorWithProgress } from "@/app/components/ui/sonner";
import {
  humanizeAccountLabel,
  flattenReportRowsMulti,
  type FlatMultiPeriodRow,
} from "@/lib/reportUtils";

/** Financial Reports developer spec — design tokens (May 2026) */
const PAGE_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#E8E7E3";
const TABLE_HEADER_BG = "#F5F4F0";
const PRESET_ACTIVE = "#1B5E4B";
const TEXT_MAIN = "#1A1A1A";
const TEXT_NEGATIVE = "#C0392B";
const TEXT_SUBTOTAL = "#0F2238";

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
        <div
          key={ri}
          className={`flex gap-2 py-3 border-b`}
          style={{ borderColor: CARD_BORDER }}
        >
          <div className="h-4 rounded flex-1 bg-slate-200" style={{ minWidth: "40%" }} />
          {Array.from({ length: cols - 1 }).map((__, ci) => (
            <div key={ci} className="h-4 rounded w-20 shrink-0 bg-slate-200" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Mobile tab selector */
function TabSelect(props: {
  value: ActiveReport;
  onChange: (v: ActiveReport) => void;
}) {
  return (
    <label className="md:hidden w-full min-h-[44px]">
      <span className="sr-only">Select report type</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as ActiveReport)}
        className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium min-h-[44px]"
        style={{ borderColor: CARD_BORDER, color: TEXT_MAIN, background: CARD_BG }}
      >
        {REPORT_TABS.map((t) => (
          <option key={t.id} value={t.id}>
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
  const { selectedClient } = useClientContext();

  /** Spec: preserve preset when switching tabs; default 3 Months */
  const [activeReport, setActiveReport] = useState<ActiveReport>("pnl");
  const urlRange = searchParams.get("range");
  const initialRange: ReportRange =
    urlRange && VALID_RANGES.includes(urlRange as ReportRange) ? (urlRange as ReportRange) : "3m";
  const [datePreset, setDatePreset] = useState<ReportRange>(initialRange);
  useEffect(() => {
    const r = searchParams.get("range");
    if (r && VALID_RANGES.includes(r as ReportRange)) setDatePreset(r as ReportRange);
  }, [searchParams]);

  /** Last 4Q → summarize_column_by Quarter on sync (QB). */
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

  const { columnTitles, rows } = useMemo(() => {
    if (!activeRow?.raw_json) return { columnTitles: [] as string[], rows: [] as FlatMultiPeriodRow[] };
    return flattenReportRowsMulti(activeRow.raw_json as Record<string, unknown>);
  }, [activeRow]);

  const summaryText = useMemo(() => heuristicReportSummary(activeReport, columnTitles, rows), [activeReport, columnTitles, rows]);

  const onPresetChange = useCallback(
    (r: ReportRange) => {
      setDatePreset(r);
      router.replace(`${pathname}?range=${r}`, { scroll: false });
    },
    [pathname, router]
  );

  const handleDownloadPdf = useCallback(() => {
    window.print();
  }, []);

  if (!selectedClient) {
    return (
      <div
        className="rounded-2xl border p-8 text-center text-sm"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, color: "#64748b" }}
      >
        Select a client from the sidebar to view reports.
      </div>
    );
  }

  return (
    <div
      className="financial-report-print rounded-2xl border overflow-hidden mx-auto max-w-[1600px]"
      style={{ background: CARD_BG, borderColor: CARD_BORDER, fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
    >
      <div
        className="px-5 py-5 sm:px-8 border-b md:flex md:items-start md:justify-between md:gap-6"
        style={{ borderColor: CARD_BORDER }}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[2px] mb-1" style={{ color: "#64748b" }}>
            Client · {rangeLabels[datePreset]}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: TEXT_SUBTOTAL }}>
            Financial Reports
          </h2>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {humanizeAccountLabel(selectedClient.companyName)}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="inline-flex justify-center items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[#1B5E4B] hover:opacity-92 transition-opacity disabled:opacity-50 min-h-[44px]"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sync from QuickBooks
          </button>
          <button
            type="button"
            disabled={!activeRow?.raw_json || !rows.length}
            onClick={handleDownloadPdf}
            className="inline-flex justify-center items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold min-h-[44px]"
            style={{ borderColor: CARD_BORDER, color: TEXT_MAIN, background: PAGE_BG }}
          >
            <Download className="w-4 h-4" aria-hidden /> Download PDF
          </button>
        </div>
      </div>

      <div style={{ background: PAGE_BG }} className="px-5 py-4 sm:px-8 pb-10">
        {/* Report selector — desktop tab bar */}
        <div
          role="tablist"
          aria-label="Report type"
          className="hidden md:flex flex-wrap gap-1 p-1 rounded-xl border w-fit mb-6"
          style={{ borderColor: CARD_BORDER, background: "#f0eee8" }}
        >
          {REPORT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeReport === t.id}
              onClick={() => setActiveReport(t.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeReport === t.id ? "shadow-sm text-white" : ""
              }`}
              style={{
                ...(activeReport === t.id ? { background: PRESET_ACTIVE } : {}),
                ...(activeReport !== t.id ? { color: TEXT_MAIN } : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="md:hidden mb-5">
          <TabSelect value={activeReport} onChange={setActiveReport} />
        </div>

        {/* Date preset pills — spec: 4 controls; stack 2×2 under md */}
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 mb-6">
          {DATE_PRESETS.map((p) => {
            const on = datePreset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPresetChange(p.key)}
                disabled={syncMutation.isPending}
                className={`min-h-[44px] rounded-full px-4 py-2.5 text-sm font-semibold border transition-colors ${
                  on ? "text-white shadow-sm border-transparent" : ""
                }`}
                style={{
                  ...(on ? { background: PRESET_ACTIVE } : {}),
                  ...(!on
                    ? { borderColor: "#E8E7E3", background: "#fff", color: TEXT_MAIN }
                    : {}),
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {(isLoading && !reportsData) || syncMutation.isPending ? (
          <div
            className="rounded-2xl border p-6"
            style={{ borderColor: CARD_BORDER, background: CARD_BG }}
          >
            <ReportTableSkeleton periodSlots={Math.max(columnTitles.length, datePreset === "4q" ? 4 : 6)} />
          </div>
        ) : error ? (
          <div className="rounded-xl border px-6 py-5 text-center" style={{ borderColor: "#f5c2c7", background: "#fde8ea" }}>
            <p style={{ color: "#b02a37" }} className="text-sm mb-4">
              {error instanceof Error ? error.message : "Failed to load reports"}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl px-5 py-2.5 font-semibold text-white min-h-[44px]"
              style={{ background: PRESET_ACTIVE }}
            >
              Retry
            </button>
          </div>
        ) : !reportsData?.reports?.length ? (
          <div className="text-center rounded-2xl border py-14 px-6" style={{ borderColor: CARD_BORDER, background: CARD_BG, color: "#64748b" }}>
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" aria-hidden />
            <p>No reports yet — pick a preset and sync from QuickBooks to load P&amp;L, Balance Sheet, and Cash Flow.</p>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl border overflow-hidden transition-opacity duration-300 ${
                isFetching && rows.length ? "opacity-60" : "opacity-100"
              }`}
              style={{ borderColor: CARD_BORDER, background: CARD_BG }}
            >
              <div className="overflow-x-auto scrollbar-reports overscroll-x-contain">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">{REPORT_TABS.find((x) => x.id === activeReport)?.label ?? "Report"}, {rangeLabels[datePreset]} </caption>
                  <thead style={{ background: TABLE_HEADER_BG }}>
                    <tr>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 font-semibold uppercase tracking-[0.12em] sticky left-0 z-30 border-b"
                        style={{
                          borderColor: CARD_BORDER,
                          color: TEXT_SUBTOTAL,
                          fontSize: 13,
                          background: TABLE_HEADER_BG,
                        }}
                      >
                        Line item
                      </th>
                      {columnTitles.map((title, i) => (
                        <th
                          key={String(i)}
                          scope="col"
                          className="text-right py-3 px-3 tabular-nums font-semibold uppercase tracking-[0.12em] border-b whitespace-nowrap"
                          style={{ borderColor: CARD_BORDER, color: TEXT_SUBTOTAL, fontSize: 13 }}
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows.length ? rows.slice(0, 300) : []).map((fr, ri) => {
                      let borderTop = "none";
                      if (fr.rowKind === "grandTotal") borderTop = "3px double " + CARD_BORDER;
                      else if (fr.rowKind === "subtotal") borderTop = "1px solid " + CARD_BORDER;

                      let fontWeight = 400 as 400 | 600;
                      const bgRow = CARD_BG;

                      if (fr.rowKind === "subtotal" || fr.rowKind === "grandTotal") {
                        fontWeight = 600;
                      }
                      if (fr.rowKind === "sectionHeader") {
                        fontWeight = 600;
                      }

                      return (
                        <tr key={ri} style={{ borderTop }}>
                          <td
                            style={{
                              paddingLeft: `${16 + fr.depth * 20}px`,
                              fontWeight,
                              color: TEXT_SUBTOTAL,
                              background: bgRow,
                              position: "sticky",
                              left: 0,
                              zIndex: 5,
                              boxShadow: "4px 0 8px -4px rgba(0,0,0,0.08)",
                              fontSize: 14,
                              borderBottom: `1px solid ${CARD_BORDER}`,
                              maxWidth: 280,
                              wordBreak: "break-word",
                            }}
                          >
                            {fr.account}
                          </td>
                          {columnTitles.map((_t, ci) => {
                            const cell = fr.values[ci] ?? "$0";
                            const loss = amountLooksNegative(cell);
                            const amountFont = fontWeight >= 600 ? 500 : 500;
                            return (
                              <td
                                key={ci}
                                className="tabular-nums whitespace-nowrap"
                                style={{
                                  color: loss ? TEXT_NEGATIVE : TEXT_MAIN,
                                  padding: "12px",
                                  fontWeight: amountFont,
                                  textAlign: "right",
                                  fontSize: 14,
                                  borderBottom: `1px solid ${CARD_BORDER}`,
                                }}
                              >
                                {cell.startsWith("-")
                                  ? `(${cell.replace(/^-/, "").trim()})`
                                  : cell}
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
                <p className="text-[11px] px-4 py-2 opacity-75" style={{ color: "#64748b" }}>
                  Showing first 300 rows.
                </p>
              )}
            </div>

            {showAiPanel && rows.length ? (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                <button
                  type="button"
                  id="reports-ai-summary-toggle"
                  onClick={() => setCollapsedAi((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left min-h-[48px]"
                  style={{ background: CARD_BG, color: TEXT_SUBTOTAL }}
                >
                  <span className="text-sm font-semibold">AI summary of this report</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${collapsedAi ? "" : "rotate-180"}`} aria-hidden />
                </button>
                {!collapsedAi ? (
                  <div className="px-5 pb-5 border-t whitespace-pre-wrap text-sm leading-relaxed" style={{ borderColor: CARD_BORDER, color: TEXT_MAIN }}>
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
