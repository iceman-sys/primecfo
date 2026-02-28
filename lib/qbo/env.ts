export type QboEnvironment = 'production' | 'sandbox';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getQboEnvironment(): QboEnvironment {
  const env = process.env.QBO_ENVIRONMENT;
  if (!env) return 'production';
  return env === 'sandbox' ? 'sandbox' : 'production';
}

/** QuickBooks API base URL (sandbox vs production). No trailing slash. */
export function getQboApiBaseUrl(): string {
  const env = getQboEnvironment();
  return env === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
}

export function getQboOAuthConfig() {
  return {
    clientId: requireEnv('QBO_CLIENT_ID'),
    clientSecret: requireEnv('QBO_CLIENT_SECRET'),
    environment: getQboEnvironment(),
    redirectUri: requireEnv('QBO_REDIRECT_URI'),
  };
}

export function getPublicBaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_URL');
}

export function getSupabaseAdminConfig() {
  return {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

/** Webhook verifier token from Developer Portal. Required for webhook POST validation. */
export function getWebhookVerifierToken(): string | null {
  return process.env.QBO_WEBHOOK_VERIFIER_TOKEN ?? null;
}

/** Optional: URL to call when a webhook is received (e.g. sync job). Receives POST with receipt id. */
export function getWebhookSyncTriggerUrl(): string | null {
  return process.env.QBO_WEBHOOK_SYNC_TRIGGER_URL ?? null;
}

/** Secret for refresh cron. Accepts QBO_REFRESH_CRON_SECRET or Vercel's CRON_SECRET. */
export function getRefreshCronSecret(): string {
  const v = process.env.QBO_REFRESH_CRON_SECRET || process.env.CRON_SECRET;
  if (!v) throw new Error('Missing required environment variable: QBO_REFRESH_CRON_SECRET or CRON_SECRET');
  return v;
}
