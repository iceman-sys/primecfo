export type DataQualityRuleId =
  | 'stale_books'
  | 'high_ar'
  | 'structural_negative'
  | 'large_swing'
  | 'suspense_balances';

export type DataQualityAccount = {
  name: string;
  balance: number;
};

/** Inputs for data-quality detection rules. */
/** Visual urgency for the stale-books advisory banner. */
export type DataQualityAdvisorySeverity = 'blue' | 'amber' | 'red';

export type DataQualityInput = {
  /** Last reconciliation date from QBO (bank/credit-card ReconcileInfo). */
  lastReconciledDate: Date | null;
  currentMonthTxnCount: number;
  trailingMedianMonthlyTxnCount: number;
  accountsReceivable: number;
  avgMonthlyRevenue: number;
  arOver90Days: number;
  totalEquity: number | null;
  accumulatedDraws: number | null;
  netMargin: number | null;
  grossMargin: number | null;
  priorRevenue: number;
  currentRevenue: number;
  priorExpenses: number;
  currentExpenses: number;
  priorNetIncome: number;
  currentNetIncome: number;
  accounts: DataQualityAccount[];
};

export type DataQualityAdvisory = {
  rule: DataQualityRuleId;
  priority: number;
  affectedMetrics: string[];
  message: string;
  headline: string;
  /** Banner color tone — stale books escalates by gap; other rules default to red. */
  severity?: DataQualityAdvisorySeverity;
};
