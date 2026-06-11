/** Canonical customer support inbox (Terms, Privacy, Contact page, in-app help). */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@primecfo.ai';

/** Sales / enterprise inquiries (ACT tier, pricing mailto). */
export const SALES_EMAIL =
  process.env.NEXT_PUBLIC_SALES_EMAIL?.trim() || 'andrew@primeaccsolutions.com';

/** @deprecated Prefer SALES_EMAIL for sales CTAs; SUPPORT_EMAIL for general help. */
export const CONTACT_EMAIL = SALES_EMAIL;

/** Public calendar booking URL (Calendly, Cal.com, etc.). */
export const CALENDAR_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || 'https://calendly.com/primeacc/15min';

export const SUPPORT_HOURS = 'Mon–Fri, 9am–5pm PT';

export const SUPPORT_RESPONSE_NOTE =
  'We typically respond within one business day.';

export function mailtoSupport(subject?: string): string {
  const base = `mailto:${SUPPORT_EMAIL}`;
  if (!subject) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
}

export function mailtoSales(subject?: string): string {
  const base = `mailto:${SALES_EMAIL}`;
  if (!subject) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
}
