"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import { useReportRange } from "@/contexts/ReportRangeContext";
import DashboardView from "@/app/components/primecfo/DashboardView";
import ForecastPanel from "@/app/components/primecfo/ForecastPanel";
import { getDashboardData, getInsights, getDataQualityAdvisory, syncReports, getForecast, syncCheckoutSession, BILLING_UPDATED_EVENT, SyncError, type DashboardDataResponse, type ReportRange } from "@/lib/api/client";
import { formatCurrency, formatExactCurrency, getTrend } from "@/lib/financialData";
import { resolveRatioMetric } from "@/lib/metrics/displayRules";
import { toastErrorWithProgress } from "@/app/components/ui/sonner";
import { toast } from "sonner";
import type { MetricCard, ChartDataPoint, AIInsight, RiskPosture } from "@/lib/financialData";
import { buildHistoricCashTrail14d } from "@/lib/forecast/historicTrail";

const RANGE_TO_LABEL: Record<ReportRange, string> = {
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "12m": "Trailing 12 Months",
  "4q": "Last 4 Quarters",
};

function mapDashboardDataToMetrics(
  summary: { revenue: number; expenses: number; net_income: number; profit_margin_pct: number; cash: number; accounts_receivable: number },
  previousSummary: { revenue: number; expenses: number; net_income: number; profit_margin_pct: number; cash: number; accounts_receivable: number }
): MetricCard[] {
  const cards: MetricCard[] = [
    {
      id: "1",
      title: "Total Revenue",
      value: summary.revenue,
      previousValue: previousSummary.revenue,
      format: "currency",
      ...getTrend(summary.revenue, previousSummary.revenue, true),
      icon: "DollarSign",
      color: "emerald",
    },
    {
      id: "2",
      title: "Total Costs",
      value: summary.expenses,
      previousValue: previousSummary.expenses,
      format: "currency",
      ...getTrend(summary.expenses, previousSummary.expenses, false),
      icon: "CreditCard",
      color: "red",
    },
    {
      id: "3",
      title: "Net Profit",
      value: summary.net_income,
      previousValue: previousSummary.net_income,
      format: "currencyExact",
      ...getTrend(summary.net_income, previousSummary.net_income, true),
      icon: "TrendingUp",
      color: "blue",
    },
    {
      id: "4",
      title: "Profit Margin",
      value: summary.profit_margin_pct,
      previousValue: previousSummary.profit_margin_pct,
      format: "percentage",
      ...getTrend(summary.profit_margin_pct, previousSummary.profit_margin_pct, true),
      icon: "PieChart",
      color: "violet",
    },
    {
      id: "5",
      title: "Cash Position",
      value: summary.cash,
      previousValue: previousSummary.cash,
      format: "currencyExact",
      ...getTrend(summary.cash, previousSummary.cash, true),
      icon: "Wallet",
      color: "teal",
    },
    {
      id: "6",
      title: "Accounts Receivable",
      value: summary.accounts_receivable,
      previousValue: previousSummary.accounts_receivable,
      format: "currencyExact",
      ...getTrend(summary.accounts_receivable, previousSummary.accounts_receivable, false),
      icon: "FileText",
      color: "amber",
    },
  ];
  return cards;
}

function mapCoreToFiveMetrics(
  core: NonNullable<DashboardDataResponse["coreMetrics"]>,
  summary: DashboardDataResponse["summary"],
  previousSummary: DashboardDataResponse["previousSummary"]
): MetricCard[] {
  const ar = core.arAging;
  const arDisplay = Math.max(ar.total, summary.accounts_receivable);
  const incomplete = core.currentPeriodIncomplete === true;

  const cashContext =
    core.undepositedFunds > 500
      ? `Includes ${formatExactCurrency(core.undepositedFunds)} undeposited funds · bank ${formatExactCurrency(core.bankCash)}`
      : "From latest balance-sheet sync";

  const runwayValue = core.cashFlowPositive ? 0 : (core.cashRunwayMonths ?? 0);
  const runwayContext = core.cashFlowPositive
    ? `Net cash flow +${formatExactCurrency(core.trailingNetCashFlow ?? 0)}/mo — no runway constraint`
    : core.cashRunwayMonths != null
      ? `~${core.cashRunwayMonths.toFixed(1)} months at net burn`
      : "Sync Cash Flow Statement for runway";

  const marginResolved = resolveRatioMetric({
    label: "Profit Margin",
    ratioPct: incomplete ? null : core.profitMarginPct,
    numerator: summary.net_income,
    denominator: incomplete ? 0 : summary.revenue,
    numeratorLabel: "Net Income",
    denominatorLabel: "Revenue",
    dataError: core.dataError,
  });

  const marginIsRatio =
    !incomplete &&
    marginResolved.primary.includes("%") &&
    !marginResolved.primary.includes("·");
  const marginNumeric = marginIsRatio
    ? parseFloat(marginResolved.primary)
    : summary.net_income;

  return [
    {
      id: "spec-1",
      title: "Cash Position",
      value: core.cashPosition,
      previousValue: previousSummary.cash,
      format: "currencyExact",
      ...getTrend(core.cashPosition, previousSummary.cash, true),
      icon: "Wallet",
      color: "teal",
      metricHealth: core.health.cash,
      contextLine: cashContext,
    },
    {
      id: "spec-2",
      title: "Revenue Trend",
      value: incomplete ? 0 : core.revenueChangePct,
      previousValue: 0,
      format: incomplete ? "text" : "percentage",
      trend: incomplete ? "flat" : core.revenueChangePct >= 0 ? "up" : "down",
      trendIsGood: incomplete ? true : core.revenueChangePct >= 0,
      icon: "DollarSign",
      color: "emerald",
      metricHealth: incomplete ? undefined : core.health.revenue,
      contextLine: incomplete
        ? undefined
        : `${formatCurrency(summary.revenue)} this period · ${formatCurrency(previousSummary.revenue)} prior`,
      hideTrendBadge: true,
      pendingReconciliation: incomplete,
      displayOverride: incomplete ? "Pending reconciliation" : undefined,
    },
    {
      id: "spec-3",
      title: incomplete ? "Profit Margin" : marginIsRatio ? "Profit Margin" : "Net Income",
      value: incomplete ? 0 : marginIsRatio ? marginNumeric : summary.net_income,
      previousValue: incomplete
        ? 0
        : marginIsRatio
          ? previousSummary.profit_margin_pct
          : previousSummary.net_income,
      format: incomplete ? "text" : marginIsRatio ? "percentage" : "currencyExact",
      ...(incomplete
        ? { trend: "flat" as const, trendIsGood: true }
        : getTrend(
            marginIsRatio ? marginNumeric : summary.net_income,
            marginIsRatio ? previousSummary.profit_margin_pct : previousSummary.net_income,
            true
          )),
      icon: "PieChart",
      color: "violet",
      metricHealth: incomplete ? undefined : core.health.margin,
      contextLine: incomplete
        ? undefined
        : marginResolved.explanation ??
          (marginIsRatio
            ? "Net income ÷ revenue · current period"
            : marginResolved.primary.includes("·")
              ? marginResolved.primary
              : "Net income for the current period"),
      displayOverride: incomplete
        ? "Pending reconciliation"
        : marginIsRatio
          ? undefined
          : formatExactCurrency(summary.net_income),
      hideTrendBadge: incomplete,
      pendingReconciliation: incomplete,
    },
    {
      id: "spec-4",
      title: "AR Aging",
      value: arDisplay,
      previousValue: previousSummary.accounts_receivable,
      format: "currencyExact",
      ...getTrend(arDisplay, previousSummary.accounts_receivable, false),
      icon: "FileText",
      color: "amber",
      metricHealth: core.health.ar,
      contextLine: `Current ${formatExactCurrency(ar.current)} · 31–60 ${formatExactCurrency(ar.days31_60)} · 90+ ${formatExactCurrency(ar.days91_plus)}`,
    },
    {
      id: "spec-5",
      title: "Cash Runway",
      value: runwayValue,
      previousValue: 0,
      format: core.cashFlowPositive ? "text" : "number",
      trend: "flat",
      trendIsGood: core.cashFlowPositive || core.health.runway !== "bad",
      icon: "TrendingUp",
      color: "blue",
      metricHealth: core.health.runway,
      contextLine: runwayContext,
      displayOverride: core.cashFlowPositive ? "Cash-flow positive" : undefined,
      hideTrendBadge: true,
    },
  ];
}

function mapTrendsToChartData(
  trends: Array<{ periodLabel: string; revenue: number; expenses: number; profit: number; cash: number }>
): ChartDataPoint[] {
  return trends.map((t) => ({
    month: t.periodLabel,
    revenue: t.revenue,
    expenses: t.expenses,
    profit: t.profit,
    cash: t.cash,
  }));
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedClient } = useClientContext();
  const { range, setRange } = useReportRange();
  const [syncWarningDismissed, setSyncWarningDismissed] = useState(false);

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  }, [searchParams, queryClient]);

  const checkoutSuccess = searchParams.get("checkout");
  const stripeSessionId = searchParams.get("session_id");

  useEffect(() => {
    if (checkoutSuccess !== "success" || !stripeSessionId) return;

    let cancelled = false;

    (async () => {
      try {
        await syncCheckoutSession(stripeSessionId);
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ["forecast"] });
          toast.success("Your plan is active — cash outlook will use your new tier.");
          window.dispatchEvent(new Event(BILLING_UPDATED_EVENT));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not confirm subscription. Try refreshing in a moment.");
        }
      } finally {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutSuccess, stripeSessionId, queryClient, router]);

  useEffect(() => {
    setSyncWarningDismissed(false);
  }, [selectedClient?.id]);

  const { data: dashboardData, isLoading, isFetching, error } = useQuery({
    queryKey: ["dashboard", selectedClient?.id, range],
    queryFn: () => getDashboardData(selectedClient!.id, range),
    enabled: !!selectedClient?.id,
  });

  const { data: insightsData, isFetching: insightsFetching } = useQuery({
    queryKey: ["insights", selectedClient?.id, range],
    queryFn: () => getInsights(selectedClient!.id, range),
    enabled: !!selectedClient?.id,
  });

  const { data: dataQualityData } = useQuery({
    queryKey: ["dataQuality", selectedClient?.id, range],
    queryFn: () => getDataQualityAdvisory(selectedClient!.id, range),
    enabled: !!selectedClient?.id && !!dashboardData?.summary,
  });

  const { data: forecastData, isLoading: forecastLoading, error: forecastError } = useQuery({
    queryKey: ["forecast", selectedClient?.id, range],
    queryFn: () => getForecast(selectedClient!.id, range),
    enabled: !!(selectedClient?.id && selectedClient.qbStatus === "connected"),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncReports(selectedClient!.id, range, range === "4q" ? "quarter" : "month"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", selectedClient?.id, range] });
      queryClient.invalidateQueries({ queryKey: ["insights", selectedClient?.id, range] });
      queryClient.invalidateQueries({ queryKey: ["dataQuality", selectedClient?.id, range] });
      queryClient.invalidateQueries({ queryKey: ["forecast"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      if (error instanceof SyncError && (error.code === "no_connection" || error.code === "needs_reauth")) {
        setSyncWarningDismissed(false);
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else {
        toastErrorWithProgress(error instanceof Error ? error.message : "Sync failed", {
          duration: 10_000,
        });
      }
    },
  });

  const isRangeLoading =
    !syncMutation.isPending && !!selectedClient?.id && (isFetching || insightsFetching) && !isLoading;

  const isSyncConnectionError =
    syncMutation.isError &&
    syncMutation.error instanceof SyncError &&
    (syncMutation.error.code === "no_connection" || syncMutation.error.code === "needs_reauth");
  const clientNotConnected =
    selectedClient && selectedClient.qbStatus !== "connected";
  const showSyncConnectionWarning =
    !syncWarningDismissed && (isSyncConnectionError || !!clientNotConnected);

  const metrics: MetricCard[] =
    dashboardData?.coreMetrics && dashboardData.summary && dashboardData.previousSummary
      ? mapCoreToFiveMetrics(dashboardData.coreMetrics, dashboardData.summary, dashboardData.previousSummary)
      : dashboardData?.summary != null && dashboardData?.previousSummary != null
        ? mapDashboardDataToMetrics(dashboardData.summary, dashboardData.previousSummary)
        : [];
  const chartData: ChartDataPoint[] = dashboardData ? mapTrendsToChartData(dashboardData.trends) : [];
  const selectedPeriodLabel =
    dashboardData?.coreMetrics?.displayPeriodLabel?.trim() || RANGE_TO_LABEL[range];
  const hasSyncedData = dashboardData?.period != null;
  const insights: AIInsight[] = insightsData?.insights ?? [];
  const riskPosture: RiskPosture | null = insightsData?.riskPosture ?? null;

  const forecastErrorObj =
    forecastError instanceof Error ? forecastError : forecastError ? new Error(String(forecastError)) : null;

  const historicForecastTrail = useMemo(() => {
    const bank = forecastData?.summary?.bankBalance;
    if (bank == null || !chartData.length) return undefined;
    return buildHistoricCashTrail14d(chartData, bank);
  }, [chartData, forecastData?.summary?.bankBalance]);

  const dataQualityAdvisory = dataQualityData?.advisory ?? null;
  const reconciliation = dashboardData?.reconciliation ?? null;

  return (
    <DashboardView
      metrics={metrics}
      insights={insights}
      riskPosture={riskPosture}
      client={selectedClient}
      dataQualityAdvisory={dataQualityAdvisory}
      reconciliation={reconciliation}
      forecastPanel={
        selectedClient?.qbStatus === "connected" ? (
          <ForecastPanel
            data={forecastData ?? null}
            loading={forecastLoading}
            error={forecastErrorObj}
            historicTrail={historicForecastTrail}
          />
        ) : null
      }
      onNavigate={(view) =>
        router.push(view === "reports" ? `/reports?range=${range}` : `/${view}`)
      }
      selectedPeriodLabel={selectedPeriodLabel}
      range={range}
      onPeriodChange={setRange}
      onSync={() => syncMutation.mutate()}
      syncing={syncMutation.isPending}
      isLoading={isLoading}
      isRangeLoading={isRangeLoading}
      loadError={error}
      hasSyncedData={hasSyncedData}
      showSyncConnectionWarning={showSyncConnectionWarning}
      onDismissSyncWarning={() => setSyncWarningDismissed(true)}
      onConnectClick={() => router.push("/connect")}
    />
  );
}
