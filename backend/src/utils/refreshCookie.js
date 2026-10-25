export const REFRESH_COOKIE_NAME = 'agc_rt';
// The browser only sends the cookie to auth routes, never to the rest of the API.
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function baseOptions(authConfig) {
  return {
    httpOnly: true,
    // Browsers treat http://localhost as secure, so this also works in local development.
    secure: true,
    sameSite: authConfig.cookieSameSite,
    path: REFRESH_COOKIE_PATH,
  };
}

// Without maxAge the cookie is a browser-session cookie: closing the browser logs out a shared phone.
export function setRefreshCookie(res, authConfig, { refreshToken, rememberDevice, lifetimeMs }) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseOptions(authConfig),
    ...(rememberDevice && { maxAge: lifetimeMs }),
  });
}

export function clearRefreshCookie(res, authConfig) {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions(authConfig));
}
