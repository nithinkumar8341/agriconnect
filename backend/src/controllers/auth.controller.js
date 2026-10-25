import { AppError } from '../utils/AppError.js';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from '../utils/refreshCookie.js';

export function createAuthController({ config, otpService, authService, sessionService }) {
  // The refresh token only ever travels in the httpOnly cookie, never in a JSON body.
  function sendSession(res, { refreshToken, rememberDevice, ...body }) {
    setRefreshCookie(res, config.auth, {
      refreshToken,
      rememberDevice,
      lifetimeMs: sessionService.sessionLifetimeMs(rememberDevice),
    });
    res.json(body);
  }

  function sendLoginResult(res, result) {
    if (result.pinToken) {
      return res.json({ next: result.next, pinToken: result.pinToken });
    }
    return sendSession(res, result);
  }

  return {
    async requestOtp(req, res) {
      res.status(202).json(await otpService.requestOtp(req.body));
    },

    async verifyOtp(req, res) {
      const result = await authService.verifyLogin({
        ...req.body,
        userAgent: req.get('user-agent'),
      });
      sendLoginResult(res, result);
    },

    async verifyPin(req, res) {
      sendSession(
        res,
        await authService.verifyPin({ ...req.body, userAgent: req.get('user-agent') }),
      );
    },

    async setupPin(req, res) {
      sendSession(
        res,
        await authService.setupPin({ ...req.body, userAgent: req.get('user-agent') }),
      );
    },

    async refresh(req, res) {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!refreshToken) {
        throw new AppError(401, 'REFRESH_INVALID', 'Your session has ended. Please log in again.');
      }
      try {
        sendSession(
          res,
          await authService.refresh(refreshToken, { userAgent: req.get('user-agent') }),
        );
      } catch (err) {
        clearRefreshCookie(res, config.auth);
        throw err;
      }
    },

    async logout(req, res) {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (refreshToken) {
        await sessionService.revokeByRefreshToken(refreshToken);
      }
      clearRefreshCookie(res, config.auth);
      res.status(204).end();
    },

    async me(req, res) {
      res.json({ user: req.user.toPublic() });
    },
  };
}
