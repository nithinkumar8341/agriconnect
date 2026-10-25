import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

// Loads the user on every request (one indexed lookup) instead of trusting the token alone, so
// suspension, role changes and logout-all take effect immediately rather than after token expiry.
export function createRequireAuth(sessionService) {
  return async function requireAuth(req, res, next) {
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Please log in');
    }

    let claims;
    try {
      claims = sessionService.verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError(401, 'TOKEN_EXPIRED', 'Your session needs refreshing');
      }
      throw new AppError(401, 'TOKEN_INVALID', 'Please log in again');
    }

    const user = mongoose.isValidObjectId(claims.sub) ? await User.findById(claims.sub) : null;
    if (!user) {
      throw new AppError(401, 'TOKEN_INVALID', 'Please log in again');
    }
    if (user.status !== 'active') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'This account is suspended. Please contact support.',
      );
    }
    if (user.tokensValidAfter && !(claims.issuedAtMs >= user.tokensValidAfter.getTime())) {
      throw new AppError(401, 'TOKEN_REVOKED', 'You were logged out. Please log in again.');
    }

    req.user = user;
    req.auth = { sessionFamilyId: claims.sid };
    next();
  };
}

// The role is read from the database (req.user), not the token, so a changed role applies at once.
export function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Please log in');
    }
    if (req.user.role === null) {
      throw new AppError(403, 'ROLE_REQUIRED', 'Please choose whether you are a farmer or a buyer');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this');
    }
    next();
  };
}

// Answers 404 both when the record does not exist and when it belongs to someone else,
// so nobody can probe which ids exist. bypassRoles (for example admin) may see any record.
export function requireOwnership(loadResource, { ownerField = 'userId', bypassRoles = [] } = {}) {
  return async function checkOwnership(req, res, next) {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Please log in');
    }
    const resource = await loadResource(req);
    const isOwner = resource && String(resource[ownerField]) === String(req.user._id);
    if (!resource || (!isOwner && !bypassRoles.includes(req.user.role))) {
      throw new AppError(404, 'NOT_FOUND', 'Not found');
    }
    req.resource = resource;
    next();
  };
}
