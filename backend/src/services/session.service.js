import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { randomToken, sha256 } from '../utils/crypto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISSUER = 'agriconnect';
// Different audiences stop a PIN-step token from ever being accepted as an access token.
const ACCESS_AUDIENCE = 'agriconnect-api';
const PIN_AUDIENCE = 'agriconnect-pin';
const PIN_TOKEN_TTL = '5m';
// A device the user did not ask us to remember keeps its session for one day at most.
const UNREMEMBERED_SESSION_MS = DAY_MS;

export function createSessionService({ config, logger }) {
  const { jwtAccessSecret, accessTokenTtlMinutes, refreshTokenTtlDays } = config.auth;

  function sessionLifetimeMs(rememberDevice) {
    return rememberDevice ? refreshTokenTtlDays * DAY_MS : UNREMEMBERED_SESSION_MS;
  }

  // issuedAtMs exists because the standard iat claim only has 1-second precision, which is too
  // coarse to tell tokens issued just before a logout-all from a fresh login just after it.
  function issueAccessToken(user, familyId) {
    const claims = { role: user.role, sid: familyId, issuedAtMs: Date.now() };
    return jwt.sign(claims, jwtAccessSecret, {
      algorithm: 'HS256',
      subject: user._id.toString(),
      issuer: ISSUER,
      audience: ACCESS_AUDIENCE,
      expiresIn: `${accessTokenTtlMinutes}m`,
    });
  }

  function verifyAccessToken(token) {
    return jwt.verify(token, jwtAccessSecret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: ACCESS_AUDIENCE,
    });
  }

  function issuePinToken(user, { rememberDevice }) {
    return jwt.sign({ rememberDevice }, jwtAccessSecret, {
      algorithm: 'HS256',
      subject: user._id.toString(),
      issuer: ISSUER,
      audience: PIN_AUDIENCE,
      expiresIn: PIN_TOKEN_TTL,
    });
  }

  function verifyPinToken(token) {
    try {
      return jwt.verify(token, jwtAccessSecret, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: PIN_AUDIENCE,
      });
    } catch {
      throw new AppError(401, 'PIN_TOKEN_INVALID', 'Please log in again with a new code');
    }
  }

  async function storeRefreshToken({ userId, familyId, userAgent, rememberDevice }) {
    const refreshToken = randomToken();
    const session = await Session.create({
      userId,
      familyId,
      tokenHash: sha256(refreshToken),
      userAgent: (userAgent ?? '').slice(0, 200),
      rememberDevice,
      expiresAt: new Date(Date.now() + sessionLifetimeMs(rememberDevice)),
    });
    return { refreshToken, session };
  }

  async function createSession(user, { userAgent, rememberDevice }) {
    return storeRefreshToken({
      userId: user._id,
      familyId: randomUUID(),
      userAgent,
      rememberDevice,
    });
  }

  async function revokeFamily(familyId) {
    await Session.updateMany({ familyId, revokedAt: null }, { revokedAt: new Date() });
  }

  async function rotate(refreshToken, { userAgent }) {
    const tokenHash = sha256(refreshToken);
    const now = new Date();

    // Atomic: of two requests presenting the same token, only one can mark it replaced.
    const current = await Session.findOneAndUpdate(
      { tokenHash, replacedAt: null, revokedAt: null, expiresAt: { $gt: now } },
      { replacedAt: now },
      { returnDocument: 'after' },
    );

    if (!current) {
      const known = await Session.findOne({ tokenHash });
      if (known?.replacedAt && !known.revokedAt) {
        // An already-rotated token came back: either it was stolen or a client replayed it.
        // We cannot tell which copy is legitimate, so the whole login is ended.
        await revokeFamily(known.familyId);
        logger.warn(
          { userId: known.userId.toString(), familyId: known.familyId },
          'Refresh token reuse detected; session family revoked',
        );
      }
      throw new AppError(401, 'REFRESH_INVALID', 'Your session has ended. Please log in again.');
    }

    const user = await User.findById(current.userId);
    if (!user || user.status !== 'active') {
      await revokeFamily(current.familyId);
      throw new AppError(401, 'REFRESH_INVALID', 'Your session has ended. Please log in again.');
    }

    const next = await storeRefreshToken({
      userId: user._id,
      familyId: current.familyId,
      userAgent,
      rememberDevice: current.rememberDevice,
    });

    // A concurrent reuse detection may have revoked the family between our claim above and the
    // insert, which would leave this new token outside the revocation. Re-checking after the insert
    // closes that gap: the revoke either happened before it (we see it here) or after (it covers it).
    if (await Session.exists({ familyId: current.familyId, revokedAt: { $ne: null } })) {
      await revokeFamily(current.familyId);
      throw new AppError(401, 'REFRESH_INVALID', 'Your session has ended. Please log in again.');
    }

    return { user, ...next };
  }

  async function revokeByRefreshToken(refreshToken) {
    const session = await Session.findOne({ tokenHash: sha256(refreshToken) });
    if (session) {
      await revokeFamily(session.familyId);
    }
  }

  async function revokeAllForUser(userId) {
    const now = new Date();
    await Session.updateMany({ userId, revokedAt: null }, { revokedAt: now });
    // Refresh tokens are now dead; this also kills access tokens already issued (see requireAuth).
    await User.updateOne({ _id: userId }, { tokensValidAfter: now });
  }

  return {
    sessionLifetimeMs,
    issueAccessToken,
    verifyAccessToken,
    issuePinToken,
    verifyPinToken,
    createSession,
    rotate,
    revokeByRefreshToken,
    revokeAllForUser,
  };
}
