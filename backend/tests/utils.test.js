import {
  hmacSha256,
  randomDigits,
  randomToken,
  safeEqualHex,
  sha256,
} from '../src/utils/crypto.js';
import { maskPhone, normalizeIndianPhone } from '../src/utils/phone.js';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['+91-98765-43210', '+919876543210'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each([['5876543210'], ['987654321'], ['98765432101'], ['abcdefghij'], [''], [null], [123]])(
    'rejects %p',
    (input) => {
      expect(normalizeIndianPhone(input)).toBeNull();
    },
  );
});

describe('maskPhone', () => {
  it('keeps only the country code and last 4 digits', () => {
    expect(maskPhone('+919876543210')).toBe('+91******3210');
  });

  it('never returns short or missing values unmasked', () => {
    expect(maskPhone('12345')).toBe('[phone]');
    expect(maskPhone(undefined)).toBe('[phone]');
  });
});

describe('crypto helpers', () => {
  it('hmacSha256 depends on the secret', () => {
    expect(hmacSha256('secret-a', '123456')).not.toBe(hmacSha256('secret-b', '123456'));
    expect(hmacSha256('secret-a', '123456')).toBe(hmacSha256('secret-a', '123456'));
  });

  it('randomDigits returns zero-padded digits of the requested length', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(randomDigits(6)).toMatch(/^\d{6}$/);
    }
  });

  it('randomToken returns 256 bits of url-safe text by default', () => {
    const token = randomToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(token);
  });

  it('safeEqualHex compares hashes, including different lengths', () => {
    const hash = sha256('a');
    expect(safeEqualHex(hash, sha256('a'))).toBe(true);
    expect(safeEqualHex(hash, sha256('b'))).toBe(false);
    expect(safeEqualHex(hash, 'abcd')).toBe(false);
  });
});
