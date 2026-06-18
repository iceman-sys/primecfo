/**
 * Customer-facing Stripe lifecycle emails via Resend.
 * Falls back to server logs when RESEND_API_KEY is unset (never throws).
 */

function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

function customerFromAddress(): string {
  return process.env.STRIPE_CUSTOMER_EMAIL_FROM?.trim() || 'PrimeCFO.ai <billing@primecfo.ai>';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMoney(amountInCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amountInCents / 100);
  } catch {
    return `$${(amountInCents / 100).toFixed(2)}`;
  }
}

function formatDisplayDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function sendTrialEndingEmail(input: {
  customerEmail: string;
  planName: string;
  trialEndUnix: number;
  amountInCents: number;
  currency: string;
  interval: 'month' | 'year';
}): Promise<void> {
  try {
    const { customerEmail, planName, trialEndUnix, amountInCents, currency, interval } = input;
    if (!customerEmail) return;

    const chargeDate = formatDisplayDate(trialEndUnix);
    const amount = formatMoney(amountInCents, currency);
    const billingLabel = interval === 'year' ? 'annual' : 'monthly';

    const subject = `Your PrimeCFO.ai trial ends in 3 days`;
    const text = [
      `Hi there,`,
      ``,
      `Your 14-day free trial of PrimeCFO.ai (${planName}) ends on ${chargeDate}.`,
      ``,
      `On that date, your card on file will be charged ${amount} for your ${billingLabel} plan unless you cancel before then.`,
      ``,
      `Manage your subscription anytime from Settings → Manage billing in your account, or cancel during the trial to avoid being charged.`,
      ``,
      `Questions? Reply to this email or contact support@primecfo.ai.`,
      ``,
      `— The PrimeCFO.ai team`,
    ].join('\n');

    const html = `<!doctype html>
<html><body style="font-family:Inter,system-ui,Helvetica,Arial,sans-serif;background:#f7f8fa;padding:24px;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;">
      <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">PrimeCFO.ai</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">Trial ending soon</div>
    </td></tr>
    <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6;">
      <p>Your 14-day free trial of <strong>${escapeHtml(planName)}</strong> ends on <strong>${escapeHtml(chargeDate)}</strong>.</p>
      <p>On that date, your card on file will be charged <strong>${escapeHtml(amount)}</strong> for your ${escapeHtml(billingLabel)} plan unless you cancel before then.</p>
      <p style="margin:24px 0 0;">
        <a href="https://www.primecfo.ai/settings"
           style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:8px;">
          Manage billing
        </a>
      </p>
      <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Cancel during the trial from the billing portal to avoid being charged.</p>
    </td></tr>
  </table>
</body></html>`;

    if (!process.env.RESEND_API_KEY) {
      console.info(`[stripe-email] RESEND_API_KEY not set — trial ending email for ${customerEmail}:\n${text}`);
      return;
    }

    await sendViaResend([customerEmail], customerFromAddress(), { subject, text, html });
    console.info(`[stripe-email] trial ending email sent to ${customerEmail}`);
  } catch (err) {
    console.error('[stripe-email] trial ending email failed', err);
  }
}

export async function sendPaymentFailedEmail(input: {
  customerEmail: string;
  planName: string;
  amountInCents: number;
  currency: string;
}): Promise<void> {
  try {
    const { customerEmail, planName, amountInCents, currency } = input;
    if (!customerEmail) return;

    const amount = formatMoney(amountInCents, currency);
    const subject = `Action needed: PrimeCFO.ai payment failed`;
    const text = [
      `Hi there,`,
      ``,
      `We couldn't process your latest payment of ${amount} for your PrimeCFO.ai ${planName} subscription.`,
      ``,
      `Please update your payment method in the billing portal to keep your account active. Stripe will retry the charge automatically.`,
      ``,
      `Manage billing: https://www.primecfo.ai/settings`,
      ``,
      `— The PrimeCFO.ai team`,
    ].join('\n');

    const html = `<!doctype html>
<html><body style="font-family:Inter,system-ui,Helvetica,Arial,sans-serif;background:#f7f8fa;padding:24px;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:24px 28px;background:#b45309;color:#fff;">
      <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">PrimeCFO.ai</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">Payment failed</div>
    </td></tr>
    <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6;">
      <p>We couldn't process your latest payment of <strong>${escapeHtml(amount)}</strong> for your <strong>${escapeHtml(planName)}</strong> subscription.</p>
      <p>Please update your payment method to keep your account active. Stripe will retry automatically.</p>
      <p style="margin:24px 0 0;">
        <a href="https://www.primecfo.ai/settings"
           style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:8px;">
          Update payment method
        </a>
      </p>
    </td></tr>
  </table>
</body></html>`;

    if (!process.env.RESEND_API_KEY) {
      console.info(`[stripe-email] RESEND_API_KEY not set — payment failed email for ${customerEmail}:\n${text}`);
      return;
    }

    await sendViaResend([customerEmail], customerFromAddress(), { subject, text, html });
    console.info(`[stripe-email] payment failed email sent to ${customerEmail}`);
  } catch (err) {
    console.error('[stripe-email] payment failed email failed', err);
  }
}

/** Resolve a Stripe customer email from a subscription object. */
export async function resolveCustomerEmail(
  stripeClient: ReturnType<typeof import('@/lib/stripe/client').stripe>,
  customerId: string
): Promise<string | null> {
  try {
    const customer = await stripeClient.customers.retrieve(customerId);
    if ('deleted' in customer && customer.deleted) return null;
    return customer.email ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

export { parseRecipients };
