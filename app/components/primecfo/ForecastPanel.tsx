"use client";

import React from "react";
import type { ForecastApiResponse } from "@/lib/api/client";
import { formatFullCurrency } from "@/lib/financialData";

interface ForecastPanelProps {
  data: ForecastApiResponse | null;
  loading?: boolean;
  error?: Error | null;
}

function labelForDay(offset: number): string {
  return offset === 0 ? "Today" : `Day ${offset}`;
}

/** Cash outlook from live QBO pulls (tier-gated horizon). */
const ForecastPanel: React.FC<ForecastPanelProps> = ({ data, loading, error }) => {
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

  if (!data?.forecast) return null;

  const { forecast, capabilities, summary } = data;
  const { series, components, horizonDays } = forecast;

  const todayPoint = series.find((p) => p.dayOffset === 0);
  const horizonPoint = series.length ? series[series.length - 1] : undefined;
  const collectionPct = Math.round((components.collectionRate ?? 0.85) * 100);

  const intermediatePoints = horizonPoint
    ? series.filter((p) => p.dayOffset !== 0 && p.dayOffset !== horizonPoint.dayOffset)
    : [];

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

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {todayPoint ? (
          <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{labelForDay(todayPoint.dayOffset)}</p>
            <p className="text-xl font-semibold text-white mt-1">{formatFullCurrency(todayPoint.expected)}</p>
          </div>
        ) : null}
        {horizonPoint && horizonPoint.dayOffset !== 0 ? (
          <div className="rounded-lg bg-slate-900/50 border border-teal-500/40 px-4 py-3 ring-1 ring-teal-500/20">
            <p className="text-[11px] uppercase tracking-wide text-teal-500/90">
              Day {horizonPoint.dayOffset} · Plan horizon
            </p>
            <p className="text-xl font-semibold text-white mt-1">{formatFullCurrency(horizonPoint.expected)}</p>
            {horizonPoint.optimistic != null && horizonPoint.conservative != null ? (
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                Range {formatFullCurrency(horizonPoint.conservative)} – {formatFullCurrency(horizonPoint.optimistic)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {intermediatePoints.length > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Along the way</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {intermediatePoints.map((pt) => (
              <div key={pt.dayOffset} className="min-w-[120px]">
                <p className="text-[11px] text-slate-500">{labelForDay(pt.dayOffset)}</p>
                <p className="text-sm font-medium text-slate-200">{formatFullCurrency(pt.expected)}</p>
              </div>
            ))}
          </div>
          {horizonDays > 30 ? (
            <p className="text-[11px] text-slate-600 mt-2 leading-snug">
              Day 30 is the same operating window (invoices and bills due within 30 days) on every tier. The day{" "}
              {horizonDays} figure adds the extended outlook from your trailing P&amp;L.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="text-xs text-slate-500 space-y-1 border-t border-slate-700/40 pt-4">
        <p>
          Weighted inflows ({collectionPct}% default on open invoices due within 30 days):{" "}
          <span className="text-slate-300">{formatFullCurrency(forecast.components.expectedInflowsWeighted)}</span>
        </p>
        <p>
          Bills due in window:{" "}
          <span className="text-slate-300">{formatFullCurrency(forecast.components.expectedOutflowsBills)}</span>
        </p>
        <p>
          Recurring / operating estimate (trailing avg expense):{" "}
          <span className="text-slate-300">
            {formatFullCurrency(forecast.components.estimatedRecurringMonthly)}
          </span>
        </p>
        <p className="pt-1 text-slate-600">
          Trailing revenue {formatFullCurrency(summary.avgMonthlyRevenue)} · expense{" "}
          {formatFullCurrency(summary.avgMonthlyExpense)} · AR {formatFullCurrency(summary.arTotal)}
        </p>
      </div>
    </div>
  );
};

export default ForecastPanel;
