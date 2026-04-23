import Stripe from 'stripe';
import { getStripeSecretKey } from '@/lib/qbo/env';

let instance: Stripe | null = null;

/**
 * Server-only Stripe client singleton. Never import this from a client component.
 * Uses the pinned API version supported by the installed SDK.
 */
export function stripe(): Stripe {
  if (instance) return instance;
  instance = new Stripe(getStripeSecretKey(), {
    typescript: true,
    appInfo: {
      name: 'PrimeCFO.ai',
      version: '1.0.0',
    },
  });
  return instance;
}
