import { quickBooksRequest } from './api';

type QboQueryResponse = {
  QueryResponse?: Record<string, unknown> & {
    maxResults?: number;
    startPosition?: number;
  };
};

/** Page through a QBO SQL query and collect all entities under the given result key (e.g. Invoice). */
export async function queryAllEntities<T>(
  clientId: string,
  sqlFragment: string,
  resultKey: string
): Promise<T[]> {
  const pageSize = 500;
  let start = 1;
  const all: T[] = [];

  while (true) {
    const query = `${sqlFragment} STARTPOSITION ${start} MAXRESULTS ${pageSize}`;
    const res = await quickBooksRequest<QboQueryResponse>(clientId, {
      path: `/v3/company/{realmId}/query`,
      searchParams: { query },
    });

    const qr = res.QueryResponse;
    if (!qr) break;
    const chunk = qr[resultKey];
    const arr = Array.isArray(chunk) ? (chunk as T[]) : chunk != null ? [chunk as T] : [];
    all.push(...arr);

    const max = typeof qr.maxResults === 'number' ? qr.maxResults : pageSize;
    if (arr.length < max) break;
    start += arr.length;
    if (start > 50_000) break;
  }

  return all;
}

export async function sumBankAccountBalances(clientId: string): Promise<number> {
  const accounts = await queryAllEntities<{ CurrentBalance?: number; AccountType?: string }>(
    clientId,
    `SELECT * FROM Account WHERE AccountType = 'Bank'`,
    'Account'
  );
  return accounts.reduce((s, a) => s + (typeof a.CurrentBalance === 'number' ? a.CurrentBalance : 0), 0);
}

export type QboMoneyEntity = {
  Balance?: string | number;
  TotalAmt?: string | number;
  DueDate?: string;
  CustomerRef?: { value?: string; name?: string };
  VendorRef?: { value?: string; name?: string };
};

export async function fetchOpenInvoicesDueBy(
  clientId: string,
  /** YYYY-MM-DD: include invoices with DueDate <= this (typically asOf + tier forecast horizon). Past-due open invoices included. */
  dueOnOrBeforeYmd: string
): Promise<QboMoneyEntity[]> {
  const sql =
    `SELECT * FROM Invoice WHERE Balance > '0' AND DueDate <= '${dueOnOrBeforeYmd}'`;
  return queryAllEntities<QboMoneyEntity>(clientId, sql, 'Invoice');
}

export async function fetchOpenBillsDueBy(
  clientId: string,
  /** YYYY-MM-DD: include bills with DueDate <= this (same window as invoices). */
  dueOnOrBeforeYmd: string
): Promise<QboMoneyEntity[]> {
  const sql =
    `SELECT * FROM Bill WHERE Balance > '0' AND DueDate <= '${dueOnOrBeforeYmd}'`;
  return queryAllEntities<QboMoneyEntity>(clientId, sql, 'Bill');
}
