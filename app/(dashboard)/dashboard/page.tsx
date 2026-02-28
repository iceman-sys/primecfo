"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import DashboardView from "@/app/components/primecfo/DashboardView";
import { getDashboardData, getInsights, syncReports, SyncError, type ReportRange } from "@/lib/api/client";
import { toastErrorWithProgress } from "@/app/components/ui/sonner";
import type { MetricCard, ChartDataPoint, AIInsight } from "@/lib/financialData";
import { getTrend } from "@/lib/financialData";

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
      title: "Total Expenses",
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
  const [range, setRange] = useState<ReportRange>("3m");
  const [syncWarningDismissed, setSyncWarningDismissed] = useState(false);

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  }, [searchParams, queryClient]);

  useEffect(() => {
    setSyncWarningDismissed(false);
  }, [selectedClient?.id]);

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["dashboard", selectedClient?.id, range],
    queryFn: () => getDashboardData(selectedClient!.id, range),
    enabled: !!selectedClient?.id,
  });

  const { data: insightsData } = useQuery({
    queryKey: ["insights", selectedClient?.id, range],
    queryFn: () => getInsights(selectedClient!.id, range),
    enabled: !!selectedClient?.id,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncReports(selectedClient!.id, range, range === "4q" ? "quarter" : "month"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", selectedClient?.id, range] });
      queryClient.invalidateQueries({ queryKey: ["insights", selectedClient?.id, range] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      if (error instanceof SyncError && (error.code === "no_connection" || error.code === "needs_reauth")) {
        setSyncWarningDismissed(false);
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

  const isSyncConnectionError =
    syncMutation.isError &&
    syncMutation.error instanceof SyncError &&
    (syncMutation.error.code === "no_connection" || syncMutation.error.code === "needs_reauth");
  const clientNotConnected =
    selectedClient && selectedClient.qbStatus !== "connected";
  const showSyncConnectionWarning =
    !syncWarningDismissed && (isSyncConnectionError || !!clientNotConnected);

  const metrics: MetricCard[] =
    dashboardData?.summary != null && dashboardData?.previousSummary != null
      ? mapDashboardDataToMetrics(dashboardData.summary, dashboardData.previousSummary)
      : [];
  const chartData: ChartDataPoint[] = dashboardData ? mapTrendsToChartData(dashboardData.trends) : [];
  const selectedPeriodLabel = RANGE_TO_LABEL[range];
  const hasSyncedData = dashboardData?.period != null;
  const insights: AIInsight[] = insightsData?.insights ?? [];

  return (
    <DashboardView
      metrics={metrics}
      chartData={chartData}
      insights={insights}
      client={selectedClient}
      onNavigate={(view) =>
        router.push(view === "reports" ? `/reports?range=${range}` : `/${view}`)
      }
      selectedPeriodLabel={selectedPeriodLabel}
      range={range}
      onPeriodChange={setRange}
      onSync={() => syncMutation.mutate()}
      syncing={syncMutation.isPending}
      isLoading={isLoading}
      loadError={error}
      hasSyncedData={hasSyncedData}
      showSyncConnectionWarning={showSyncConnectionWarning}
      onDismissSyncWarning={() => setSyncWarningDismissed(true)}
      onConnectClick={() => router.push("/connect")}
    />
  );
}
