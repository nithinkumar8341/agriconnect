import bcrypt from 'bcryptjs';
import { PIN_ROLES, User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const PIN_RULES = Object.freeze({
  maxAttempts: 5,
  lockMs: 15 * 60 * 1000,
  bcryptRounds: 10,
});

const PIN_FIELDS = '+pinHash +pinFailedAttempts +pinLockedUntil';

function assertActive(user) {
  if (user.status !== 'active') {
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'This account is suspended. Please contact support.',
    );
  }
}

export function createAuthService({ otpService, sessionService, logger }) {
  async function completeLogin(user, { userAgent, rememberDevice, isNewUser = false }) {
    user.lastLoginAt = new Date();
    await user.save();

    const { refreshToken, session } = await sessionService.createSession(user, {
      userAgent,
      rememberDevice,
    });
    logger.info({ userId: user._id.toString(), role: user.role }, 'User logged in');

    return {
      accessToken: sessionService.issueAccessToken(user, session.familyId),
      refreshToken,
      rememberDevice,
      user: user.toPublic(),
      isNewUser,
    };
  }

  async function verifyLogin({ phone, otp, language, rememberDevice, userAgent }) {
    await otpService.verifyOtp({ phone, otp });

    // Upsert so two simultaneous first logins cannot create duplicate users.
    const result = await User.findOneAndUpdate(
      { phone },
      { $setOnInsert: { phone, language: language ?? 'te' } },
      { upsert: true, returnDocument: 'after', includeResultMetadata: true },
    );
    const isNewUser = !result.lastErrorObject.updatedExisting;
    const user = await User.findById(result.value._id).select(PIN_FIELDS);
    assertActive(user);

    if (PIN_ROLES.includes(user.role)) {
      return {
        next: user.pinHash ? 'pin' : 'pin_setup',
        pinToken: sessionService.issuePinToken(user, { rememberDevice }),
      };
    }

    return completeLogin(user, { userAgent, rememberDevice, isNewUser });
  }

  async function loadPinUser(pinToken) {
    const claims = sessionService.verifyPinToken(pinToken);
    const user = await User.findById(claims.sub).select(PIN_FIELDS);
    if (!user || !PIN_ROLES.includes(user.role)) {
      throw new AppError(401, 'PIN_TOKEN_INVALID', 'Please log in again with a new code');
    }
    assertActive(user);
    return { user, rememberDevice: claims.rememberDevice };
  }

  async function verifyPin({ pinToken, pin, userAgent }) {
    const { user, rememberDevice } = await loadPinUser(pinToken);
    const now = new Date();

    if (!user.pinHash) {
      throw new AppError(409, 'PIN_NOT_SET', 'Please set up your PIN first');
    }
    if (user.pinLockedUntil && user.pinLockedUntil > now) {
      throw new AppError(429, 'PIN_LOCKED', 'Too many wrong PINs. Please try again later.', {
        retryAfterSeconds: Math.ceil((user.pinLockedUntil - now) / 1000),
      });
    }
    if (user.pinLockedUntil) {
      await User.updateOne({ _id: user._id }, { pinFailedAttempts: 0, pinLockedUntil: null });
    }

    // Count first, atomically: at most maxAttempts bcrypt comparisons can ever run per lock window.
    const counted = await User.findOneAndUpdate(
      { _id: user._id, pinFailedAttempts: { $lt: PIN_RULES.maxAttempts } },
      { $inc: { pinFailedAttempts: 1 } },
      { returnDocument: 'after' },
    ).select(PIN_FIELDS);
    if (!counted) {
      await User.updateOne(
        { _id: user._id },
        { pinLockedUntil: new Date(now.getTime() + PIN_RULES.lockMs) },
      );
      throw new AppError(429, 'PIN_LOCKED', 'Too many wrong PINs. Please try again later.');
    }

    if (!(await bcrypt.compare(pin, counted.pinHash))) {
      if (counted.pinFailedAttempts >= PIN_RULES.maxAttempts) {
        await User.updateOne(
          { _id: user._id },
          { pinLockedUntil: new Date(now.getTime() + PIN_RULES.lockMs) },
        );
        logger.warn({ userId: user._id.toString() }, 'PIN locked after repeated failures');
        throw new AppError(429, 'PIN_LOCKED', 'Too many wrong PINs. Please try again later.');
      }
      throw new AppError(400, 'PIN_INVALID', 'That PIN is not correct', {
        attemptsLeft: PIN_RULES.maxAttempts - counted.pinFailedAttempts,
      });
    }

    counted.pinFailedAttempts = 0;
    return completeLogin(counted, { userAgent, rememberDevice });
  }

  async function setupPin({ pinToken, pin, userAgent }) {
    const { user, rememberDevice } = await loadPinUser(pinToken);
    const pinHash = await bcrypt.hash(pin, PIN_RULES.bcryptRounds);

    // Conditional update: a PIN can be set once here; changing it later needs a separate, verified flow.
    const result = await User.updateOne(
      { _id: user._id, pinHash: { $exists: false } },
      { pinHash },
    );
    if (result.matchedCount === 0) {
      throw new AppError(409, 'PIN_ALREADY_SET', 'A PIN is already set for this account');
    }

    return completeLogin(user, { userAgent, rememberDevice });
  }

  async function refresh(refreshToken, { userAgent }) {
    const {
      user,
      refreshToken: nextToken,
      session,
    } = await sessionService.rotate(refreshToken, {
      userAgent,
    });
    return {
      accessToken: sessionService.issueAccessToken(user, session.familyId),
      refreshToken: nextToken,
      rememberDevice: session.rememberDevice,
      user: user.toPublic(),
    };
  }

  return { verifyLogin, verifyPin, setupPin, refresh };
}
