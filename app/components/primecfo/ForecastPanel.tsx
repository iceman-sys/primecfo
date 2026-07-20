"use client";

import React, { useState } from "react";
import type { ForecastApiResponse } from "@/lib/api/client";
import type { HistoricCashPoint } from "@/app/components/primecfo/ForecastChart";
import ForecastChart from "@/app/components/primecfo/ForecastChart";
import { formatFullCurrency } from "@/lib/financialData";

interface ForecastPanelProps {
  data: ForecastApiResponse | null;
  loading?: boolean;
  error?: Error | null;
  /** Approximate trailing cash (~14 points) plotted left of forecast per product spec */
  historicTrail?: HistoricCashPoint[];
}

function labelForDay(offset: number): string {
  return offset === 0 ? "Today" : `Day ${offset}`;
}

/** Cash outlook from live QBO pulls (tier-gated horizon). */
const ForecastPanel: React.FC<ForecastPanelProps> = ({ data, loading, error, historicTrail }) => {
  const [beforeDraws, setBeforeDraws] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 text-slate-400 text-sm">
        Loading cash outlook…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-6 text-red-300 text-sm">
        {error.message}
      </div>
    );
  }

  if (!data?.forecast) {
    if (data?.upgradeMessage) {
      return (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 text-sm text-slate-400">
          <h3 className="text-lg font-semibold text-white mb-2">Cash flow outlook</h3>
          <p>{data.upgradeMessage}</p>
          <a
            href="/pricing"
            className="inline-flex mt-3 text-teal-400 hover:text-teal-300 font-medium"
          >
            View plans →
          </a>
        </div>
      );
    }
    return null;
  }

  const { forecast, capabilities, summary } = data;
  const { components, horizonDays } = forecast;
  const activeSeries =
    beforeDraws && forecast.seriesBeforeDraws?.length
      ? forecast.seriesBeforeDraws
      : forecast.series;

  const todayPoint = activeSeries.find((p) => p.dayOffset === 0);
  const horizonPoint = activeSeries.length ? activeSeries[activeSeries.length - 1] : undefined;

  const intermediatePoints = horizonPoint
    ? activeSeries.filter((p) => p.dayOffset !== 0 && p.dayOffset !== horizonPoint.dayOffset)
    : [];

  const methodology =
    components.scenarioMethodology ??
    "Scenarios are based on your last 6 months of actual reconciled cash flow (20th–80th percentile months).";

  const shortfall = beforeDraws ? null : forecast.worstCaseShortfall ?? null;

  return (
    <div className="rounded-xl border border-teal-500/20 bg-slate-800/50 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Cash flow outlook</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {capabilities.forecastDays}-day horizon · {capabilities.tier.toUpperCase()} tier
            {capabilities.scenarios ? " · Scenarios available" : ""}
          </p>
        </div>
        <p className="text-xs text-slate-500">As of {forecast.asOf}</p>
      </div>

      {(components.avgMonthlyOwnerDraws ?? 0) > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Owner draws:</span>
          <div className="inline-flex rounded-lg border border-slate-700/60 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setBeforeDraws(false)}
              className={`px-3 py-1.5 transition-colors ${
                !beforeDraws
                  ? "bg-teal-500/20 text-teal-200"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              At your current draw pace
            </button>
            <button
              type="button"
              onClick={() => setBeforeDraws(true)}
              className={`px-3 py-1.5 transition-colors border-l border-slate-700/60 ${
                beforeDraws
                  ? "bg-teal-500/20 text-teal-200"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              Before draws
            </button>
          </div>
          <span className="text-[11px] text-slate-600">
            Median draw ~{formatFullCurrency(components.avgMonthlyOwnerDraws ?? 0)}/mo
          </span>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {todayPoint ? (
          <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              {labelForDay(todayPoint.dayOffset)}
            </p>
            <p className="text-xl font-semibold text-white mt-1">
              {formatFullCurrency(todayPoint.expected)}
            </p>
          </div>
        ) : null}
        {horizonPoint && horizonPoint.dayOffset !== 0 ? (
          <div className="rounded-lg bg-slate-900/50 border border-teal-500/40 px-4 py-3 ring-1 ring-teal-500/20">
            <p className="text-[11px] uppercase tracking-wide text-teal-500/90">
              Day {horizonPoint.dayOffset} · Plan horizon
            </p>
            <p className="text-xl font-semibold text-white mt-1">
              {formatFullCurrency(horizonPoint.expected)}
            </p>
            {horizonPoint.optimistic != null && horizonPoint.conservative != null ? (
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                Range {formatFullCurrency(horizonPoint.conservative)} –{" "}
                {formatFullCurrency(horizonPoint.optimistic)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ForecastChart
        series={activeSeries}
        horizonDays={forecast.horizonDays ?? capabilities.forecastDays}
        showScenarios={capabilities.scenarios}
        historic={historicTrail}
        shortfall={shortfall}
        methodologyHint={methodology}
      />

      {intermediatePoints.length > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Along the way</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {intermediatePoints.map((pt) => (
              <div key={pt.dayOffset} className="min-w-[120px]">
                <p className="text-[11px] text-slate-500">{labelForDay(pt.dayOffset)}</p>
                <p className="text-sm font-medium text-slate-200">
                  {formatFullCurrency(pt.expected)}
                </p>
              </div>
            ))}
          </div>
          {horizonDays > 30 ? (
            <p className="text-[11px] text-slate-600 mt-2 leading-snug">
              Each 30-day step compounds median monthly net cash from your last{" "}
              {components.scenarioSampleCount ?? 6} reconciled months
              {beforeDraws ? " (before owner draws)" : " (at your current draw pace)"}. Day{" "}
              {horizonDays} shows the full {horizonDays}-day projection.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="text-xs text-slate-500 space-y-1 border-t border-slate-700/40 pt-4">
        <p>
          Expected monthly net (
          {components.recurringBasis === "cash_flow_statement"
            ? "median of reconciled CF months"
            : "trailing P&L net income fallback"}
          ):{" "}
          <span className="text-slate-300">
            {formatFullCurrency(forecast.components.estimatedRecurringMonthly)}
          </span>
        </p>
        <p className="text-[11px] text-slate-600 leading-snug" title={methodology}>
          {capabilities.scenarios
            ? components.scenarioUsedDefaults
              ? " Best / Expected / Worst use limited-history defaults — fewer than 3 reconciled full months available."
              : ` Best / Expected / Worst use the median and 20th–80th percentile months from your last ${components.scenarioSampleCount ?? 6} reconciled cash-flow months${
                  components.scenarioBestMonthlyNet != null &&
                  components.scenarioWorstMonthlyNet != null
                    ? ` (${formatFullCurrency(components.scenarioWorstMonthlyNet)} – ${formatFullCurrency(components.scenarioBestMonthlyNet)}/mo)`
                    : ""
                }.`
            : ""}
        </p>
        <p className="text-[11px] text-slate-600">
          Open AR (Balance Sheet): {formatFullCurrency(forecast.components.expectedInflowsWeighted)} ·
          open AP (Balance Sheet): {formatFullCurrency(forecast.components.expectedOutflowsBills)}
        </p>
        <p className="pt-1 text-slate-600">
          Trailing revenue {formatFullCurrency(summary.avgMonthlyRevenue)} · expense{" "}
          {formatFullCurrency(summary.avgMonthlyExpense)} · AR {formatFullCurrency(summary.arTotal)}
        </p>
        {forecast.components.balanceSheetCash != null &&
        forecast.components.bankVsStatementDelta != null ? (
          <p className="pt-2 text-[11px] text-slate-600 border-t border-slate-700/30">
            Balance Sheet cash (statement):{" "}
            {formatFullCurrency(forecast.components.balanceSheetCash)} · Δ vs bank accounts query:{" "}
            {formatFullCurrency(forecast.components.bankVsStatementDelta)}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ForecastPanel;
