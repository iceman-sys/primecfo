-- Stripe billing tables.
--   stripe_customers       — 1:1 Supabase user -> Stripe customer mapping.
--   stripe_subscriptions   — source-of-truth subscription state (updated from webhooks).
--   stripe_webhook_events  — idempotency store for processed Stripe events.

CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  stripe_subscription_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  status text NOT NULL,
  plan_id text,
  price_id text,
  interval text CHECK (interval IN ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_id
  ON stripe_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status
  ON stripe_subscriptions (status);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text
);

-- Row Level Security: users can read their own billing rows.
-- Writes happen only from the service role (webhook), which bypasses RLS.
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_customer_select" ON stripe_customers;
CREATE POLICY "own_customer_select" ON stripe_customers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_subscription_select" ON stripe_subscriptions;
CREATE POLICY "own_subscription_select" ON stripe_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE stripe_customers IS 'Supabase user -> Stripe customer mapping (one row per user).';
COMMENT ON TABLE stripe_subscriptions IS 'Source of truth for subscription state; written by Stripe webhook handler.';
COMMENT ON TABLE stripe_webhook_events IS 'Processed Stripe event IDs for idempotency.';
