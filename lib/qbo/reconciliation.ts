import { quickBooksRequest } from './api';
import { queryAllEntities } from './queryRunner';

type QboAccountDetail = {
  Account?: {
    Id?: string;
    ReconcileInfo?: {
      LastReconciledDate?: string;
      LastReconciledBalance?: string;
    };
  };
};

type QboTxnRow = {
  TxnDate?: string;
};

async function fetchReconcilableAccountIds(clientId: string): Promise<string[]> {
  const accounts = await queryAllEntities<{
    Id?: string;
    AccountType?: string;
    Active?: boolean;
  }>(
    clientId,
    `SELECT Id, AccountType, Active FROM Account WHERE AccountType IN ('Bank', 'Credit Card')`,
    'Account'
  );

  return accounts
    .filter((a) => a.Active !== false && a.Id)
    .map((a) => String(a.Id));
}

async function fetchLastReconciledFromAccounts(clientId: string): Promise<Date | null> {
  const accountIds = await fetchReconcilableAccountIds(clientId);
  let latest: Date | null = null;

  for (const accountId of accountIds) {
    try {
      const res = await quickBooksRequest<QboAccountDetail>(clientId, {
        path: `/v3/company/{realmId}/account/${accountId}`,
      });
      const dateStr = res.Account?.ReconcileInfo?.LastReconciledDate;
      if (!dateStr) continue;
      const d = new Date(`${dateStr}T12:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      if (!latest || d > latest) latest = d;
    } catch {
      /* skip individual account failures */
    }
  }

  return latest;
}

/** Fallback when ReconcileInfo is missing — most recent reconciled transaction date across QBO entities. */
async function fetchMaxReconciledTxnDate(clientId: string): Promise<Date | null> {
  const entityQueries = [
    `SELECT TxnDate FROM Payment WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM Deposit WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM Purchase WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM BillPayment WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM Transfer WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM JournalEntry WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM Check WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
    `SELECT TxnDate FROM CreditCardPayment WHERE Reconciled = true ORDERBY TxnDate DESC MAXRESULTS 1`,
  ];

  let latest: Date | null = null;

  for (const sql of entityQueries) {
    try {
      const res = await quickBooksRequest<{
        QueryResponse?: Record<string, QboTxnRow[] | QboTxnRow>;
      }>(clientId, {
        path: `/v3/company/{realmId}/query`,
        searchParams: { query: sql },
      });

      const qr = res.QueryResponse;
      if (!qr) continue;

      const key = Object.keys(qr).find((k) => k !== 'maxResults' && k !== 'startPosition');
      if (!key) continue;
      const raw = qr[key];
      const row = Array.isArray(raw) ? raw[0] : raw;
      const dateStr = row?.TxnDate;
      if (!dateStr) continue;
      const d = new Date(`${dateStr}T12:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      if (!latest || d > latest) latest = d;
    } catch {
      /* try next entity type */
    }
  }

  return latest;
}

/**
 * Returns the most recent bank/credit-card reconciliation date from QuickBooks.
 * Queries ReconcileInfo.LastReconciledDate per account; falls back to reconciled transactions.
 */
export async function fetchLastReconciledDate(clientId: string): Promise<Date | null> {
  try {
    const fromAccounts = await fetchLastReconciledFromAccounts(clientId);
    if (fromAccounts) return fromAccounts;
    return await fetchMaxReconciledTxnDate(clientId);
  } catch {
    return null;
  }
}
