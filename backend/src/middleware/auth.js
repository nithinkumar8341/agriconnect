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
    if (user.tokensValidAfter && claims.iat * 1000 < user.tokensValidAfter.getTime()) {
      throw new AppError(401, 'TOKEN_REVOKED', 'You were logged out. Please log in again.');
    }

    req.user = user;
    req.auth = { sessionFamilyId: claims.sid };
    next();
  };
}
