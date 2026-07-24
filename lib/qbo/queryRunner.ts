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

/** Lightweight existence probe — returns true if at least one entity matches. */
export async function entityExists(
  clientId: string,
  entityName: string,
  resultKey: string
): Promise<boolean> {
  const query = `SELECT Id FROM ${entityName} MAXRESULTS 1`;
  const res = await quickBooksRequest<QboQueryResponse>(clientId, {
    path: `/v3/company/{realmId}/query`,
    searchParams: { query },
  });
  const chunk = res.QueryResponse?.[resultKey];
  if (Array.isArray(chunk)) return chunk.length > 0;
  return chunk != null;
}

export async function sumBankAccountBalances(clientId: string): Promise<number> {
  const accounts = await fetchBankAccounts(clientId);
  return accounts.reduce((s, a) => s + a.balance, 0);
}

export type QboAccountRow = {
  id: string;
  name: string;
  accountType: string;
  accountSubType: string;
  balance: number;
  active: boolean;
};

function parseAccountBalance(a: {
  CurrentBalance?: number | string;
  CurrentBalanceWithSubAccounts?: number | string;
}): number {
  const raw = a.CurrentBalanceWithSubAccounts ?? a.CurrentBalance;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return parseFloat(raw) || 0;
  return 0;
}

export async function fetchBankAccounts(clientId: string): Promise<QboAccountRow[]> {
  const accounts = await queryAllEntities<{
    Id?: string;
    Name?: string;
    AccountType?: string;
    AccountSubType?: string;
    Active?: boolean;
    CurrentBalance?: number | string;
    CurrentBalanceWithSubAccounts?: number | string;
  }>(clientId, `SELECT * FROM Account WHERE AccountType = 'Bank'`, 'Account');

  return accounts.map((a) => ({
    id: String(a.Id ?? ''),
    name: a.Name ?? 'Bank Account',
    accountType: a.AccountType ?? 'Bank',
    accountSubType: a.AccountSubType ?? '',
    balance: parseAccountBalance(a),
    active: a.Active !== false,
  }));
}

export async function fetchFixedAssetAccounts(clientId: string): Promise<QboAccountRow[]> {
  const accounts = await queryAllEntities<{
    Id?: string;
    Name?: string;
    AccountType?: string;
    AccountSubType?: string;
    Active?: boolean;
    CurrentBalance?: number | string;
    CurrentBalanceWithSubAccounts?: number | string;
  }>(clientId, `SELECT * FROM Account WHERE AccountType = 'Fixed Asset'`, 'Account');

  return accounts.map((a) => ({
    id: String(a.Id ?? ''),
    name: a.Name ?? 'Asset',
    accountType: a.AccountType ?? 'Fixed Asset',
    accountSubType: a.AccountSubType ?? '',
    balance: parseAccountBalance(a),
    active: a.Active !== false,
  }));
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
