import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { getPercentChange } from '@/lib/financialData';
import { parseArAgingBuckets, arOver30Ratio } from '@/lib/reporting/parseArAging';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { fetchBankAccounts } from '@/lib/qbo/queryRunner';
import { loadReconciliationStatus } from '@/lib/qbo/reconciliationStatus';
import type { ReportRange } from '@/lib/qbo/reports';

type CoreHealth = 'good' | 'warn' | 'bad';

function runwayHealth(months: number | null, cashFlowPositive?: boolean): CoreHealth {
  if (cashFlowPositive) return 'good';
  if (months == null) return 'warn';
  if (months < 2) return 'bad';
  if (months < 5) return 'warn';
  return 'good';
}

function arHealth(ratio: number): CoreHealth {
  if (ratio > 0.35) return 'bad';
  if (ratio > 0.25) return 'warn';
  return 'good';
}

function revenueHealth(pctChange: number): CoreHealth {
  if (pctChange < -15) return 'bad';
  if (pctChange < -5) return 'warn';
  return 'good';
}

function marginHealth(curr: number, prev: number): CoreHealth {
  const d = curr - prev;
  if (d < -5) return 'bad';
  if (d < -2) return 'warn';
  return 'good';
}

function cashHealth(cash: number, avgBurn: number): CoreHealth {
  if (avgBurn <= 0) return runwayHealth(cash > 0 ? 12 : 0);
  if (cash < avgBurn) return 'bad';
  if (cash < avgBurn * 2) return 'warn';
  return 'good';
}

/**
 * GET /api/dashboard/data?clientId=xxx&range=3m|6m|12m|4q
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '12m') as ReportRange;

  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const bundle = await loadClientMetrics(access.clientId, range);
  const reconciliation = await loadReconciliationStatus(access.clientId);

  if (!bundle.hasData || !bundle.summary) {
    return NextResponse.json({
      summary: null,
      previousSummary: null,
      period: null,
      trends: [],
      range,
      coreMetrics: null,
      reconciliation,
    });
  }

  const finSummary = bundle.summary;
  const finPrev = bundle.previousSummary ?? {
    revenue: 0,
    expenses: 0,
    total_costs: 0,
    net_income: 0,
    profit_margin_pct: 0,
    cash: 0,
    accounts_receivable: 0,
    accounts_payable: 0,
    cogs: 0,
    gross_profit: 0,
    current_assets: 0,
    current_liabilities: 0,
    inventory: 0,
    data_error: false,
  };

  const sb = supabaseAdmin();
  const { data: arReport } = await sb
    .from('financial_reports')
    .select('raw_json')
    .eq('client_id', access.clientId)
    .eq('report_type', 'ar_aging')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const arBuckets = parseArAgingBuckets(arReport?.raw_json ?? {});
  const revPctChange = getPercentChange(finSummary.revenue, finPrev.revenue);
  const arRatioPast30 = arOver30Ratio(arBuckets);

  let bankCash = finSummary.cash;
  try {
    const bankAccounts = await fetchBankAccounts(access.clientId);
    const liveBank = bankAccounts.reduce((s, a) => s + a.balance, 0);
    if (liveBank > 0) bankCash = liveBank;
  } catch {
    /* use balance-sheet cash */
  }

  const undepositedFunds = Math.max(0, finSummary.cash - bankCash);
  const runway = bundle.runway;
  const cashFlowPositive = runway.cashFlowPositive === true;

  const coreMetrics = {
    cashPosition: finSummary.cash,
    bankCash,
    undepositedFunds,
    revenueChangePct: Math.round(revPctChange * 10) / 10,
    profitMarginPct:
      Math.abs(finSummary.revenue) > 0.005
        ? finSummary.profit_margin_pct
        : null,
    arAging: arBuckets,
    cashRunwayMonths: runway.runwayMonths,
    cashFlowPositive,
    trailingNetCashFlow: runway.trailingNetCashFlow ?? null,
    dataError: finSummary.data_error,
    excludedPartialMonth: bundle.excludedPartialMonth,
    currentPeriodIncomplete: bundle.currentPeriodIncomplete,
    anchoredToReconciled: bundle.anchoredToReconciled,
    displayPeriodLabel: bundle.displayPeriodLabel,
    health: {
      runway: runwayHealth(runway.runwayMonths, cashFlowPositive),
      ar: arHealth(arRatioPast30),
      revenue: bundle.currentPeriodIncomplete ? 'warn' : revenueHealth(revPctChange),
      margin: bundle.currentPeriodIncomplete ? 'warn' : marginHealth(finSummary.profit_margin_pct, finPrev.profit_margin_pct),
      cash: cashHealth(finSummary.cash, runway.monthlyBurn),
    },
  };

  const latestPeriod = bundle.periods[bundle.periods.length - 1];

  return NextResponse.json({
    summary: {
      revenue: finSummary.revenue,
      expenses: finSummary.total_costs,
      net_income: finSummary.net_income,
      profit_margin_pct: finSummary.profit_margin_pct,
      cash: finSummary.cash,
      accounts_receivable: finSummary.accounts_receivable,
      accounts_payable: finSummary.accounts_payable,
    },
    previousSummary: bundle.previousSummary
      ? {
          revenue: finPrev.revenue,
          expenses: finPrev.total_costs,
          net_income: finPrev.net_income,
          profit_margin_pct: finPrev.profit_margin_pct,
          cash: finPrev.cash,
          accounts_receivable: finPrev.accounts_receivable,
          accounts_payable: finPrev.accounts_payable,
        }
      : null,
    period: latestPeriod
      ? {
          id: latestPeriod.id,
          label: latestPeriod.label,
          start_date: latestPeriod.start_date,
          end_date: latestPeriod.end_date,
        }
      : null,
    trends: bundle.trends,
    range,
    coreMetrics,
    reconciliation,
  });
}
