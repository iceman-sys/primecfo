import { quickBooksRequest } from './api';

/** Multi-column P&L for trailing revenue / expense trends. */
export async function fetchProfitLossByMonth(
  clientId: string,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Cash'
): Promise<unknown> {
  const path = `/v3/company/{realmId}/reports/ProfitAndLoss`;
  return quickBooksRequest<unknown>(clientId, {
    path,
    method: 'GET',
    searchParams: {
      start_date: startDate,
      end_date: endDate,
      summarize_column_by: 'Month',
      accounting_method: accountingMethod,
    },
  });
}

/** Multi-column Cash Flow for trailing net cash increase. */
export async function fetchCashFlowByMonth(
  clientId: string,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Cash'
): Promise<unknown> {
  const path = `/v3/company/{realmId}/reports/CashFlow`;
  return quickBooksRequest<unknown>(clientId, {
    path,
    method: 'GET',
    searchParams: {
      start_date: startDate,
      end_date: endDate,
      summarize_column_by: 'Month',
      accounting_method: accountingMethod,
    },
  });
}

/** Align with `lib/qbo/reports.ts` QBO_REPORT_NAMES.ar_aging */
export async function fetchArAgingSummary(
  clientId: string,
  reportDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Accrual'
): Promise<unknown> {
  const path = `/v3/company/{realmId}/reports/ARAgingSummary`;
  return quickBooksRequest<unknown>(clientId, {
    path,
    method: 'GET',
    searchParams: {
      report_date: reportDate,
      accounting_method: accountingMethod,
    },
  });
}

/** Align with optional `ap_aging` report name in codebase */
export async function fetchApAgingSummary(
  clientId: string,
  reportDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Accrual'
): Promise<unknown> {
  const path = `/v3/company/{realmId}/reports/APAgingSummary`;
  return quickBooksRequest<unknown>(clientId, {
    path,
    method: 'GET',
    searchParams: {
      report_date: reportDate,
      accounting_method: accountingMethod,
    },
  });
}
