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
import type { ForecastApiResponse } from "@/lib/api/client";

const NEG_ALERT = "#c0392b";
const BEST = "#2A9D8F";
const EXPECTED = "#1B5E4B";
const WORST = "#c0392b";
const HISTORY = "#64748b";
const AXIS_MUTED = "#475569";

export type HistoricCashPoint = { offset: number; cash: number };

type Point = ForecastApiResponse["forecast"]["series"][number];

function interpolateAtDay(anchors: Point[], targetDay: number): { e: number; o?: number; c?: number } {
  if (!anchors.length) return { e: 0 };
  const sorted = [...anchors].sort((a, b) => a.dayOffset - b.dayOffset);
  const pick = (p: Point) => ({ e: p.expected, o: p.optimistic, c: p.conservative });
  if (targetDay <= sorted[0]!.dayOffset) return pick(sorted[0]!);
  const lastPt = sorted[sorted.length - 1]!;
  if (targetDay >= lastPt.dayOffset) return pick(lastPt);
  for (let k = 0; k < sorted.length - 1; k++) {
    const a = sorted[k]!;
    const b = sorted[k + 1]!;
    if (targetDay < a.dayOffset || targetDay > b.dayOffset) continue;
    if (b.dayOffset === a.dayOffset) return pick(b);
    const span = b.dayOffset - a.dayOffset;
    const mu = (targetDay - a.dayOffset) / span;
    return {
      e: a.expected + mu * (b.expected - a.expected),
      o:
        a.optimistic != null && b.optimistic != null
          ? a.optimistic + mu * (b.optimistic - a.optimistic)
          : undefined,
      c:
        a.conservative != null && b.conservative != null
          ? a.conservative + mu * (b.conservative - a.conservative)
          : undefined,
    };
  }
  return pick(lastPt);
}

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
};

const ForecastChart: React.FC<ForecastChartProps> = ({
  series,
  horizonDays,
  showScenarios,
  historic = [],
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

  const histByDay = useMemo(() => new Map(historic.map((h) => [h.offset, h.cash])), [historic]);

  const chartRows = useMemo(() => {
    const rows: Array<{
      day: number;
      history?: number;
      expected?: number;
      best?: number;
      worst?: number;
    }> = [];

    const hasHist = historic.length > 0;
    const startDay = hasHist
      ? Math.min(-14, ...historic.map((h) => h.offset))
      : 0;

    for (let day = startDay; day <= horizonDays; day++) {
      const histV = histByDay.get(day);
      const intr =
        day >= 0 ? interpolateAtDay(series, day) : { e: 0, o: undefined, c: undefined };
      let worst = intr.c;
      if (day >= 0 && worst != null && intr.e >= 0) worst = Math.max(worst, 0);

      rows.push({
        day,
        ...(histV !== undefined ? { history: histV } : {}),
        ...(day >= 0
          ? {
              expected: intr.e,
              best: showScenarios ? intr.o : undefined,
              worst: showScenarios ? worst : undefined,
            }
          : {}),
      });
    }

    return rows;
  }, [historic, histByDay, horizonDays, series, showScenarios]);

  const mins = chartRows.flatMap((r) =>
    [r.history, r.expected, r.best, r.worst].filter((x): x is number => typeof x === "number")
  );
  const maxVal = mins.length ? Math.max(...mins) : 0;
  const minVal = mins.length ? Math.min(...mins, 0) : 0;
  const pad = Math.max(Math.abs(maxVal - minVal) * 0.08, 1000);
  const yMin = minVal - pad;
  const yMax = maxVal + pad;

  const showHistory = historic.length > 0;
  const endRow = chartRows.find((r) => r.day === horizonDays);
  const lastExpected = endRow?.expected;

  return (
    <div className="w-full mt-4">
      {lastExpected != null && lastExpected < 0 ? (
        <p className="text-xs font-medium mb-2" style={{ color: NEG_ALERT }}>
          Projected cash dips below zero within this horizon — review payables timing and near-term inflows.
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
            <YAxis tickFormatter={formatAxisTick} domain={[yMin, yMax]} tick={{ fontSize: 11, fill: AXIS_MUTED }} />
            <Tooltip
              formatter={(value: number | string, name: string) => [formatMoney(Number(value)), name]}
              labelFormatter={(d) => `Day ${d}`}
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
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ForecastChart;
