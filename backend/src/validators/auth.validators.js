import { z } from 'zod';
import { LANGUAGES } from '../models/User.js';
import { normalizeIndianPhone } from '../utils/phone.js';

const phone = z.string().transform((value, ctx) => {
  const normalized = normalizeIndianPhone(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'must be a valid 10-digit Indian mobile number' });
    return z.NEVER;
  }
  return normalized;
});

const language = z.enum(LANGUAGES).optional();

export const requestOtpSchema = z.object({ phone, language });

export const verifyOtpSchema = z.object({
  phone,
  otp: z.string().regex(/^\d{6}$/, 'must be 6 digits'),
  language,
  rememberDevice: z.boolean().default(true),
});

const pin = z.string().regex(/^\d{4,6}$/, 'must be 4 to 6 digits');

export const pinSchema = z.object({ pinToken: z.string().min(1), pin });
