import { createHash } from 'crypto';

export const MIN_PASSWORD_LENGTH = 12;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  return { ok: true };
}

/** k-anonymity check against Have I Been Pwned (optional network). */
export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => {
      const [hashSuffix] = line.trim().split(':');
      return hashSuffix === suffix;
    });
  } catch {
    return false;
  }
}

export async function assertPasswordAllowed(password: string): Promise<PasswordValidationResult> {
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) return policy;

  const breached = await isPasswordBreached(password);
  if (breached) {
    return {
      ok: false,
      message:
        'This password has appeared in a known data breach. Choose a different, unique password.',
    };
  }
  return { ok: true };
}
