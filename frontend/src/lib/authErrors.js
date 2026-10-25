import authEn from '../i18n/locales/en/auth.json';
import { errorMessageKey } from './apiErrors.js';

const AUTH_CODES = new Set(Object.keys(authEn.errors));

// Login errors carry useful numbers (tries left, seconds to wait); they go into the sentence.
export function authErrorMessage(t, error) {
  if (error?.code && AUTH_CODES.has(error.code)) {
    const retryAfter = error.details?.retryAfterSeconds;
    return t(`auth:errors.${error.code}`, {
      count: error.details?.attemptsLeft,
      seconds: retryAfter,
      minutes: retryAfter ? Math.ceil(retryAfter / 60) : 15,
    });
  }
  return t(`common:${errorMessageKey(error)}`);
}
