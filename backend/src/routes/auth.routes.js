import { Router } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { pinSchema, requestOtpSchema, verifyOtpSchema } from '../validators/auth.validators.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Per-IP limits on top of the per-phone limits in the OTP service: these stop one machine from
// cycling through many phone numbers, the per-phone limits stop many machines targeting one number.
export const AUTH_IP_LIMITS = Object.freeze({
  otpRequest: { windowMs: FIFTEEN_MINUTES, max: 10 },
  otpVerify: { windowMs: FIFTEEN_MINUTES, max: 30 },
  pin: { windowMs: FIFTEEN_MINUTES, max: 30 },
});

export function createAuthRouter({ controller, requireAuth }) {
  const router = Router();

  router.post(
    '/otp/request',
    createRateLimiter(AUTH_IP_LIMITS.otpRequest),
    validate({ body: requestOtpSchema }),
    controller.requestOtp,
  );
  router.post(
    '/otp/verify',
    createRateLimiter(AUTH_IP_LIMITS.otpVerify),
    validate({ body: verifyOtpSchema }),
    controller.verifyOtp,
  );

  const pinLimiter = createRateLimiter(AUTH_IP_LIMITS.pin);
  router.post('/pin/verify', pinLimiter, validate({ body: pinSchema }), controller.verifyPin);
  router.post('/pin/setup', pinLimiter, validate({ body: pinSchema }), controller.setupPin);

  router.post('/token/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
}
