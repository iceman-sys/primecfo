PrimeCFO.ai is an internal Next.js application for Prime Accounting Solutions, LLC. It supports client management and secure QuickBooks Online connectivity (OAuth 2.0) backed by Supabase.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

Create a `.env.local` with the following (values omitted):

```bash
# Public app base URL used for OAuth callback redirects
NEXT_PUBLIC_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# QuickBooks Online OAuth (Intuit)
QBO_CLIENT_ID=
QBO_CLIENT_SECRET=
QBO_REDIRECT_URI=
QBO_ENVIRONMENT=production  # or sandbox

# Encrypt stored QBO tokens (base64 encoding of 32 random bytes)
QBO_TOKEN_ENCRYPTION_KEY=

# Webhooks (HMAC verifier token from Intuit app settings)
QBO_WEBHOOK_VERIFIER_TOKEN=

# Optional: protect refresh automation endpoint (or set Vercel CRON_SECRET to same value)
QBO_REFRESH_CRON_SECRET=

# AI insights (plain-English analysis from financial data)
OPENAI_API_KEY=
```

## QuickBooks connection flow

- **From dashboard:** Go to `/admin/dashboard`, select a client, and click **Connect to QuickBooks** in the Overview tab. OAuth starts at `GET /api/quickbooks/auth?clientId=...&returnTo=dashboard`.
- **From connect page:** `/connect` (or `/connect?clientId=...`) sends users to `/api/auth/quickbooks`, which either starts OAuth when `clientId` is present or redirects to the dashboard to choose a client.
- Before redirecting to Intuit, the auth route stores OAuth **state** in Supabase table `qbo_oauth_state`; the callback verifies state (one-time use, 10 min TTL). Run the migration in `supabase/migrations/20250218000000_qbo_oauth_state.sql` in the Supabase SQL Editor if needed.
- Intuit redirects to `GET /api/quickbooks/callback`; tokens are stored in **quickbooks_connections** (client_id, realm_id, encrypted access/refresh tokens, access_expires_at, refresh_expires_at, scope, status). Run `supabase/migrations/20250218000001_quickbooks_connections.sql` if needed. The callback also updates **client_qbo_connections** for dashboard/API compatibility.

## Secure token storage

- **Encrypt at rest:** `access_token` and `refresh_token` are encrypted with AES-256-GCM (see `lib/qbo/crypto.ts`) using `QBO_TOKEN_ENCRYPTION_KEY` before being written to `quickbooks_connections` or `qbo_tokens`.
- **Decrypt only on server:** Tokens are decrypted only inside `lib/qbo/tokens.ts` when calling QuickBooks APIs (e.g. `/api/quickbooks/customer`). The decrypted value is used in memory for the outbound request only.
- **Never expose to frontend:** No API response includes `access_token` or `refresh_token`. Client/connection APIs select only non-sensitive fields (e.g. `company_id`, `expires_at`, `status`). Do not add token columns to any response sent to the client.

## Token refresh automation

- Tokens auto-refresh when used (e.g. `GET /api/quickbooks/customer`).
- Proactive refresh: `GET /api/quickbooks/refresh` with `Authorization: Bearer <secret>` or `?secret=<secret>`. Secret is `QBO_REFRESH_CRON_SECRET` or Vercel `CRON_SECRET`.
- A **Vercel Cron** job is configured in `vercel.json` to call this endpoint every 6 hours. Set `QBO_REFRESH_CRON_SECRET` or `CRON_SECRET` in Vercel environment variables.

## Webhook receiver

- Endpoint: `POST /api/quickbooks/webhook` (GET returns `{ ok: true }` for health checks).
- **Verification:** Set `QBO_WEBHOOK_VERIFIER_TOKEN` (from Intuit Developer Portal). Incoming requests are validated with HMAC-SHA256 of the raw body using the `intuit-signature` header; invalid or missing signatures are rejected (401). If the verifier is not set, POST returns 503.
- **Storage:** Verified payloads are stored in **qbo_webhook_receipts** (run `supabase/migrations/20250218000003_qbo_webhook_receipts.sql`). Each row has `payload` (jsonb), `processing_status` (pending | processing | processed | failed), and optional `processed_at` / `error_message`. Process pending rows in a cron or worker (e.g. `SELECT * FROM qbo_webhook_receipts WHERE processing_status = 'pending'`).
- **Optional trigger:** Set `QBO_WEBHOOK_SYNC_TRIGGER_URL` to a URL that receives a POST with `{ receiptId, source: 'qbo_webhook' }` when a webhook is stored, so you can trigger a sync job or queue.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
