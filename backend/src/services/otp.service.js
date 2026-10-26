import { OtpRequest } from '../models/OtpRequest.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { hmacSha256, randomDigits, safeEqualHex } from '../utils/crypto.js';
import { maskPhone } from '../utils/phone.js';
import { otpMessage } from './sms/templates.js';

export const OTP_RULES = Object.freeze({
  length: 6,
  ttlMs: 5 * 60 * 1000,
  maxAttempts: 5,
  resendCooldownMs: 30 * 1000,
  maxPerHour: 5,
  // Rows outlive their 5-minute validity so the hourly cap can count them.
  purgeAfterMs: 24 * 60 * 60 * 1000,
});

const HOUR_MS = 60 * 60 * 1000;

function secondsUntil(date, now) {
  return Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

export function createOtpService({ config, smsProvider, logger }) {
  // The phone and purpose are part of the hashed input, so a code only works for the number it was sent to.
  function hashCode(phone, purpose, code) {
    return hmacSha256(config.auth.otpHmacSecret, `${phone}:${purpose}:${code}`);
  }

  async function latestOtp(phone, purpose) {
    return OtpRequest.findOne({ phone, purpose }).sort({ createdAt: -1 });
  }

  async function requestOtp({ phone, language, purpose = 'login' }) {
    const now = new Date();

    const latest = await latestOtp(phone, purpose);
    const cooldownEndsAt =
      latest && new Date(latest.createdAt.getTime() + OTP_RULES.resendCooldownMs);
    if (cooldownEndsAt && cooldownEndsAt > now) {
      throw new AppError(429, 'OTP_COOLDOWN', 'Please wait before asking for another code', {
        retryAfterSeconds: secondsUntil(cooldownEndsAt, now),
      });
    }

    const sentLastHour = await OtpRequest.countDocuments({
      phone,
      purpose,
      createdAt: { $gte: new Date(now.getTime() - HOUR_MS) },
    });
    if (sentLastHour >= OTP_RULES.maxPerHour) {
      throw new AppError(
        429,
        'OTP_LIMIT_REACHED',
        'Too many codes requested for this number. Please try again in an hour.',
      );
    }

    const existingUser = await User.findOne({ phone }).select('language isDemo');
    // Seeded demo accounts (isDemo) sign in with the published DEMO_OTP and get no SMS, so a
    // public demo works without an SMS gateway. Real accounts always get a random code by SMS.
    const isDemoLogin = Boolean(config.auth.demoOtp && existingUser?.isDemo);
    const code = isDemoLogin
      ? config.auth.demoOtp
      : (config.auth.devFixedOtp ?? randomDigits(OTP_RULES.length));
    const otpRequest = await OtpRequest.create({
      phone,
      purpose,
      codeHash: hashCode(phone, purpose, code),
      expiresAt: new Date(now.getTime() + OTP_RULES.ttlMs),
      purgeAt: new Date(now.getTime() + OTP_RULES.purgeAfterMs),
    });

    // A returning user gets the SMS in their saved language; a new one in the language they picked.
    const smsLanguage = existingUser?.language ?? language ?? 'te';

    try {
      if (!isDemoLogin) {
        await smsProvider.send({ to: phone, message: otpMessage(smsLanguage, code) });
      }
    } catch (err) {
      // Remove the unsent code so the failed attempt does not trigger the cooldown or count toward the cap.
      await OtpRequest.deleteOne({ _id: otpRequest._id });
      logger.error({ err, phoneMasked: maskPhone(phone) }, 'OTP SMS could not be sent');
      throw new AppError(503, 'SMS_FAILED', 'We could not send the code. Please try again.');
    }

    return {
      expiresInSeconds: OTP_RULES.ttlMs / 1000,
      resendAfterSeconds: OTP_RULES.resendCooldownMs / 1000,
    };
  }

  // Only the most recent code for a phone is accepted, so requesting a new code invalidates older ones.
  async function verifyOtp({ phone, otp, purpose = 'login' }) {
    const now = new Date();
    const latest = await latestOtp(phone, purpose);

    if (!latest || latest.consumedAt) {
      throw new AppError(400, 'OTP_NOT_FOUND', 'Please request a new code');
    }
    if (latest.expiresAt <= now) {
      throw new AppError(400, 'OTP_EXPIRED', 'This code has expired. Please request a new one.');
    }

    // Count the attempt before comparing, atomically, so parallel guesses cannot exceed the limit.
    const counted = await OtpRequest.findOneAndUpdate(
      { _id: latest._id, consumedAt: null, attempts: { $lt: OTP_RULES.maxAttempts } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!counted) {
      throw new AppError(429, 'OTP_LOCKED', 'Too many wrong codes. Please request a new one.');
    }

    if (!safeEqualHex(hashCode(phone, purpose, otp), counted.codeHash)) {
      const attemptsLeft = OTP_RULES.maxAttempts - counted.attempts;
      if (attemptsLeft === 0) {
        throw new AppError(429, 'OTP_LOCKED', 'Too many wrong codes. Please request a new one.');
      }
      throw new AppError(400, 'OTP_INVALID', 'That code is not correct', { attemptsLeft });
    }

    // Single use: only one concurrent request can flip consumedAt from null.
    const consumed = await OtpRequest.findOneAndUpdate(
      { _id: counted._id, consumedAt: null },
      { consumedAt: now },
    );
    if (!consumed) {
      throw new AppError(400, 'OTP_NOT_FOUND', 'Please request a new code');
    }
  }

  return { requestOtp, verifyOtp };
}
