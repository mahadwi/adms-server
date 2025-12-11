import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export async function hashString(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyString(password: string, hashed: string) {
  return await bcrypt.compare(password, hashed);
}

/**
 * Membuat signature HMAC-SHA256 dari timestamp + secret
 * @param value timestamp (string)
 * @param privateKey secret private key
 */
export function createSignature(value: string, privateKey: string): string {
  const hmac = crypto.createHmac('sha256', privateKey);
  hmac.update(value);
  return hmac.digest('hex');
}

/**
 * Validasi signature webhook ADMS
 * @param timestamp timestamp dari header
 * @param signature signature dari header
 * @param privateKey secret yang sama
 */
export function verifySignature(
  timestamp: string,
  signature: string,
  privateKey: string,
): boolean {
  const expected = createSignature(timestamp, privateKey);

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function strRandom(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  const charLen = chars.length;

  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % charLen];
  }

  return result;
}

export function generateApiKey() {
  return {
    publicKey: strRandom(64),
    privateKey: strRandom(32),
  };
}
