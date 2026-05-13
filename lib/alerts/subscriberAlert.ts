/**
 * New-subscriber alert email.
 *
 * Sends a short notification email when a Stripe Checkout completes and a new
 * subscription begins. Designed to be zero-config: if no provider env vars are
 * set, it logs to the server console so deploys never break.
 *
 * Provider priority (first match wins):
 *   1. Resend  — set RESEND_API_KEY and SUBSCRIBER_ALERT_EMAIL.
 *   2. Console — always-on fallback (visible in `vercel logs` / server output).
 *
 * Optional env vars:
 *   - SUBSCRIBER_ALERT_EMAIL   (required for any email; comma-separated for multiple)
 *   - SUBSCRIBER_ALERT_FROM    (default: "PrimeCFO.ai <alerts@primecfo.ai>")
 *   - RESEND_API_KEY           (use Resend's HTTP API — no extra dependency)
 */

import type Stripe from 'stripe';

type AlertPayload = {
  subscriptionId: string;
  customerId: string;
  customerEmail: string | null;
  planId: string | null;
  planName: string | null;
  interval: 'month' | 'year' | null;
  amount: number | null;
  currency: string | null;
  status: string;
  trialEnd: string | null;
};

function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function formatMoney(amountInCents: number | null, currency: string | null): string {
  if (amountInCents == null || !currency) return '—';
  const value = amountInCents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function buildBody(p: AlertPayload): { subject: string; text: string; html: string } {
  const subject = `🎉 New PrimeCFO.ai subscriber — ${p.planName ?? p.planId ?? 'plan'}${
    p.interval ? ` (${p.interval}ly)` : ''
  }`;

  const lines = [
    `A new subscription started.`,
    ``,
    `Customer:  ${p.customerEmail ?? '(no email on file)'}`,
    `Plan:      ${p.planName ?? p.planId ?? 'unknown'}`,
    `Billing:   ${p.interval ? `${p.interval}ly` : 'one-off / unknown'}`,
    `Price:     ${formatMoney(p.amount, p.currency)}`,
    `Status:    ${p.status}${p.trialEnd ? ` (trial ends ${p.trialEnd})` : ''}`,
    ``,
    `Stripe IDs:`,
    `  customer:     ${p.customerId}`,
    `  subscription: ${p.subscriptionId}`,
    ``,
    `Manage in Stripe: https://dashboard.stripe.com/subscriptions/${p.subscriptionId}`,
  ];
  const text = lines.join('\n');

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!doctype html>
<html><body style="font-family:Inter,system-ui,Helvetica,Arial,sans-serif;background:#f7f8fa;padding:24px;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;">
      <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">PrimeCFO.ai</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">New subscriber 🎉</div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.55;">
        <tr><td style="color:#475569;padding:4px 0;width:120px;">Customer</td><td><strong>${escape(p.customerEmail ?? '(no email)')}</strong></td></tr>
        <tr><td style="color:#475569;padding:4px 0;">Plan</td><td>${escape(p.planName ?? p.planId ?? 'unknown')}</td></tr>
        <tr><td style="color:#475569;padding:4px 0;">Billing</td><td>${escape(p.interval ? `${p.interval}ly` : 'unknown')}</td></tr>
        <tr><td style="color:#475569;padding:4px 0;">Price</td><td>${escape(formatMoney(p.amount, p.currency))}</td></tr>
        <tr><td style="color:#475569;padding:4px 0;">Status</td><td>${escape(p.status)}${
          p.trialEnd ? ` <span style="color:#64748b;">(trial ends ${escape(p.trialEnd)})</span>` : ''
        }</td></tr>
      </table>
      <p style="margin:24px 0 0;">
        <a href="https://dashboard.stripe.com/subscriptions/${escape(p.subscriptionId)}"
           style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:8px;">
          View in Stripe
        </a>
      </p>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
        Stripe IDs · customer ${escape(p.customerId)} · subscription ${escape(p.subscriptionId)}
      </p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

async function sendViaResend(
  to: string[],
  from: string,
  body: { subject: string; text: string; html: string }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY missing');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/**
 * Build an alert payload from a Stripe Subscription (already fetched) plus
 * resolved metadata (customer email, plan name).
 *
 * Best-effort: never throws — logs on failure so it can't break the webhook.
 */
export async function sendNewSubscriberAlert(input: {
  subscription: Stripe.Subscription;
  customerEmail: string | null;
  planId: string | null;
  planName: string | null;
}): Promise<void> {
  try {
    const { subscription: sub, customerEmail, planId, planName } = input;

    const item = sub.items?.data?.[0];
    const price = item?.price && typeof item.price === 'object' ? item.price : null;
    const interval = price?.recurring?.interval === 'month' || price?.recurring?.interval === 'year'
      ? (price.recurring.interval as 'month' | 'year')
      : null;

    const payload: AlertPayload = {
      subscriptionId: sub.id,
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      customerEmail,
      planId,
      planName,
      interval,
      amount: typeof price?.unit_amount === 'number' ? price.unit_amount : null,
      currency: price?.currency ?? null,
      status: sub.status,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString().slice(0, 10) : null,
    };

    const recipients = parseRecipients(process.env.SUBSCRIBER_ALERT_EMAIL);
    const from = process.env.SUBSCRIBER_ALERT_FROM?.trim() || 'PrimeCFO.ai <alerts@primecfo.ai>';

    const body = buildBody(payload);

    if (recipients.length === 0) {
      console.info(
        '[subscriber-alert] SUBSCRIBER_ALERT_EMAIL not set — logging only.\n' +
          `[subscriber-alert] ${body.subject}\n` +
          body.text
      );
      return;
    }

    if (process.env.RESEND_API_KEY) {
      await sendViaResend(recipients, from, body);
      console.info(`[subscriber-alert] sent via Resend to ${recipients.join(', ')}`);
      return;
    }

    console.info(
      `[subscriber-alert] no email provider configured (set RESEND_API_KEY). Would send to ${recipients.join(
        ', '
      )}:\n${body.subject}\n${body.text}`
    );
  } catch (err) {
    console.error('[subscriber-alert] failed to send', err);
  }
}
