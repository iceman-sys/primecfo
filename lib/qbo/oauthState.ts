import { randomBytes } from 'crypto';

/** Opaque, unpredictable OAuth state nonce (not clientId JSON). */
export function generateOAuthStateNonce(): string {
  return randomBytes(32).toString('base64url');
}
