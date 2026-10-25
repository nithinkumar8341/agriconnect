import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DELIVERY_OTP_MAX_ATTEMPTS = 5;

// The 4-digit handover code. The buyer must be able to see it any time, but the database must not
// hold it in plain text (CLAUDE.md). So the code is derived from a server secret plus a random
// per-order salt: the database stores only the salt and a hash, and a database leak alone reveals
// no codes. The server re-derives the code to show the buyer.
export function createDeliveryOtp(secret) {
  const hmac = (text) => createHmac('sha256', secret).update(text).digest('hex');

  function codeFor(orderId, salt) {
    const number = Number.parseInt(hmac(`delivery-code:${orderId}:${salt}`).slice(0, 8), 16);
    return String(number % 10_000).padStart(4, '0');
  }

  const hashFor = (orderId, code) => hmac(`delivery-check:${orderId}:${code}`);

  return {
    issue(orderId) {
      const salt = randomBytes(16).toString('hex');
      return { salt, hash: hashFor(orderId, codeFor(orderId, salt)) };
    },
    codeFor,
    verify(orderId, code, hash) {
      if (!/^\d{4}$/.test(code ?? '') || !hash) return false;
      const expected = Buffer.from(hash, 'hex');
      const actual = Buffer.from(hashFor(orderId, code), 'hex');
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    },
  };
}
