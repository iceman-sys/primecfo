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
export type DataQualityInput = {
  lastReconciledMonthEnd: Date | null;
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
};
