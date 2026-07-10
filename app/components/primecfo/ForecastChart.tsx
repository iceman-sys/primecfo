"use client";

import React, { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { ForecastSeriesPoint } from "@/lib/api/client";

const NEG_ALERT = "#c0392b";
const BEST = "#2A9D8F";
const EXPECTED = "#1B5E4B";
const WORST = "#c0392b";
const HISTORY = "#64748b";
const AXIS_MUTED = "#475569";

export type HistoricCashPoint = { offset: number; cash: number };

type Point = ForecastSeriesPoint;

function formatAxisTick(n: number): string {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type ForecastChartProps = {
  series: Point[];
  horizonDays: number;
  showScenarios: boolean;
  historic?: HistoricCashPoint[];
  /** When worst case would go negative — callout instead of deep negative line. */
  shortfall?: { amount: number; dayOffset: number } | null;
  methodologyHint?: string;
};

/**
 * Chart uses sparse anchor points only (not one row per day) to avoid main-thread freezes
 * from Recharts re-rendering ~100 interpolated points.
 */
const ForecastChart: React.FC<ForecastChartProps> = ({
  series,
  horizonDays,
  showScenarios,
  historic = [],
  shortfall = null,
  methodologyHint,
}) => {
  const [height, setHeight] = useState(280);

  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w < 768) setHeight(200);
      else if (w < 1024) setHeight(240);
      else setHeight(280);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const chartRows = useMemo(() => {
    const rows: Array<{
      day: number;
      history?: number;
      expected?: number;
      best?: number;
      worst?: number;
    }> = [];

    // Sparse historic trail (at most ~8 points)
    if (historic.length > 0) {
      const sorted = [...historic].sort((a, b) => a.offset - b.offset);
      const step = Math.max(1, Math.floor(sorted.length / 8));
      for (let i = 0; i < sorted.length; i += step) {
        const h = sorted[i]!;
        rows.push({ day: h.offset, history: h.cash });
      }
      const lastH = sorted[sorted.length - 1]!;
      if (rows[rows.length - 1]?.day !== lastH.offset) {
        rows.push({ day: lastH.offset, history: lastH.cash });
      }
    }

    const sortedSeries = [...series].sort((a, b) => a.dayOffset - b.dayOffset);
    for (const p of sortedSeries) {
      if (p.dayOffset > horizonDays) continue;
      const existing = rows.find((r) => r.day === p.dayOffset);
      const worstRaw = showScenarios ? p.conservative : undefined;
      // Floor displayed worst case at $0 — shortfall is shown as a callout
      const worst = worstRaw != null ? Math.max(worstRaw, 0) : undefined;
      const payload = {
        expected: p.expected,
        best: showScenarios ? p.optimistic : undefined,
        worst,
      };
      if (existing) {
        Object.assign(existing, payload);
      } else {
        rows.push({ day: p.dayOffset, ...payload });
      }
    }

    return rows.sort((a, b) => a.day - b.day);
  }, [historic, horizonDays, series, showScenarios]);

  const vals = chartRows.flatMap((r) =>
    [r.history, r.expected, r.best, r.worst].filter((x): x is number => typeof x === "number")
  );
  const maxVal = vals.length ? Math.max(...vals) : 0;
  const minVal = vals.length ? Math.min(...vals, 0) : 0;
  // Floor y-axis at $0 so bands stay visible; never stretch into deep negatives
  const yMin = 0;
  const pad = Math.max(Math.abs(maxVal - Math.min(minVal, 0)) * 0.08, 1000);
  const yMax = Math.max(maxVal + pad, pad);

  const showHistory = historic.length > 0;
  const endRow = chartRows.find((r) => r.day === horizonDays);
  const lastExpected = endRow?.expected;

  return (
    <div className="w-full mt-4">
      {shortfall && shortfall.amount > 0 ? (
        <p className="text-xs font-medium mb-2" style={{ color: NEG_ALERT }}>
          Worst case: projected shortfall of {formatMoney(shortfall.amount)} around day{" "}
          {shortfall.dayOffset}.
        </p>
      ) : lastExpected != null && lastExpected < 0 ? (
        <p className="text-xs font-medium mb-2" style={{ color: NEG_ALERT }}>
          Projected cash dips below zero within this horizon — review payables timing and near-term
          inflows.
        </p>
      ) : null}
      <div style={{ width: "100%", height }} className="touch-pan-x">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e7e3" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: AXIS_MUTED }}
              interval="preserveStartEnd"
              tickFormatter={(d) => (d === 0 ? "0" : String(d))}
            />
            <YAxis
              tickFormatter={formatAxisTick}
              domain={[yMin, yMax]}
              allowDataOverflow
              tick={{ fontSize: 11, fill: AXIS_MUTED }}
            />
            <Tooltip
              formatter={(value: number | string, name: string) => [formatMoney(Number(value)), name]}
              labelFormatter={(d) => `Day ${d}`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            {showHistory ? (
              <Line
                type="monotone"
                dataKey="history"
                name="Recent trail"
                stroke={HISTORY}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {showScenarios ? (
              <Line
                type="monotone"
                dataKey="best"
                name="Best case"
                stroke={BEST}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="expected"
              name="Expected"
              stroke={EXPECTED}
              strokeWidth={2.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {showScenarios ? (
              <Line
                type="monotone"
                dataKey="worst"
                name="Worst case"
                stroke={WORST}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {methodologyHint ? (
        <p className="text-[11px] text-slate-600 mt-2 leading-snug" title={methodologyHint}>
          {methodologyHint}
        </p>
      ) : null}
    </div>
  );
};

export default ForecastChart;
