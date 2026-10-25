import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function hmacSha256(secret, value) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

// Plain SHA-256 is enough for 256-bit random tokens: they cannot be guessed, only stolen.
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function randomDigits(length) {
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
}

// Constant-time comparison so response timing does not reveal how many characters matched.
export function safeEqualHex(a, b) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
