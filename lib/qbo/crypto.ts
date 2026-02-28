import crypto from 'crypto';

/**
 * Secure token storage: access_token and refresh_token are encrypted (AES-256-GCM)
 * before being stored in the database. Decryption happens only on the server in
 * lib/qbo/tokens.ts when calling QuickBooks APIs. Tokens are never sent to the frontend.
 */
type EncryptedString = `enc:v1:${string}`;

function getEncryptionKey(): Buffer {
  const raw = process.env.QBO_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('Missing required environment variable: QBO_TOKEN_ENCRYPTION_KEY');
  }

  // Expect base64-encoded 32 bytes.
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'QBO_TOKEN_ENCRYPTION_KEY must be base64 encoding of 32 bytes (AES-256-GCM key)'
    );
  }
  return key;
}

export function encryptToken(plaintext: string): EncryptedString {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, tag, ciphertext]).toString('base64');
  return `enc:v1:${packed}`;
}

export function decryptToken(maybeEncrypted: string | null | undefined): string {
  if (!maybeEncrypted) return '';
  if (!maybeEncrypted.startsWith('enc:v1:')) return maybeEncrypted; // Backward-compatible with legacy plaintext.

  const key = getEncryptionKey();
  const packedB64 = maybeEncrypted.slice('enc:v1:'.length);
  const packed = Buffer.from(packedB64, 'base64');
  if (packed.length < 12 + 16 + 1) {
    throw new Error('Invalid encrypted token payload');
  }

  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    'utf8'
  );
  return plaintext;
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('enc:v1:');
}

export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
