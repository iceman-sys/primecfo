"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getForecast, type ForecastApiResponse, type ForecastResult } from "@/lib/api/client";
import ForecastChart from "@/app/components/primecfo/ForecastChart";
import { formatFullCurrency } from "@/lib/financialData";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

type TreasuryForecastSectionProps = {
  clientId: string;
};

export default function TreasuryForecastSection({ clientId }: TreasuryForecastSectionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["forecast", clientId],
    queryFn: () => getForecast(clientId),
    enabled: !!clientId,
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 flex items-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
        Loading cash forecast…
      </div>
    );
  }

  if (error || !data?.forecast) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Cash Flow Forecast</h3>
        <p className="text-sm text-slate-400">
          {data?.upgradeMessage ??
            (error instanceof Error ? error.message : "Forecast unavailable. Connect QuickBooks and run Sync.")}
        </p>
      </div>
    );
  }

  return <TreasuryForecastContent forecast={data.forecast} capabilities={data.capabilities} />;
}

function TreasuryForecastContent({
  forecast,
  capabilities,
}: {
  forecast: ForecastResult;
  capabilities: ForecastApiResponse["capabilities"];
}) {
  const horizonDays = forecast.horizonDays ?? capabilities.forecastDays;
  const series = forecast.series;
  const horizonPoint = series.length ? series[series.length - 1] : undefined;
  const waypoints = series.filter((p) => p.dayOffset > 0 && p.dayOffset <= horizonDays);

  const tierLabel =
    capabilities.tier === "act" ? "Act" : capabilities.tier === "understand" ? "Understand" : "See";

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{horizonDays}-Day Forecast</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {tierLabel} tier · {capabilities.scenarios ? "Best / Expected / Worst scenarios" : "Expected case"}
          </p>
        </div>
        {horizonPoint ? (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-teal-500/90">Day {horizonPoint.dayOffset}</p>
            <p className="text-xl font-bold text-white">{formatCurrency(horizonPoint.expected)}</p>
            {horizonPoint.optimistic != null && horizonPoint.conservative != null ? (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Range {formatFullCurrency(horizonPoint.conservative)} –{" "}
                {formatFullCurrency(horizonPoint.optimistic)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ForecastChart
        series={series}
        horizonDays={horizonDays}
        showScenarios={capabilities.scenarios}
      />

      {waypoints.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-4">
          {waypoints.map((pt) => (
            <div key={pt.dayOffset} className="min-w-[100px]">
              <p className="text-[11px] text-slate-500">Day {pt.dayOffset}</p>
              <p className="text-sm font-medium text-slate-200">{formatCurrency(pt.expected)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 pt-4 border-t border-slate-700/40 text-xs text-slate-500 space-y-1">
        <p>
          Recurring monthly net (
          {forecast.components.recurringBasis === 'cash_flow_statement'
            ? 'Cash Flow Statement'
            : 'P&L fallback'}
          ):{" "}
          <span className="text-slate-300">{formatFullCurrency(forecast.components.estimatedRecurringMonthly)}</span>
        </p>
        <p>Compounded monthly from today&apos;s bank balance · as of {forecast.asOf}</p>
      </div>
    </div>
  );
}
