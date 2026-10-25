import commonEn from '../i18n/locales/en/common.json';

// Every backend error has { code, message }. The backend message is English and technical, so the
// UI shows a translated message for known codes and a friendly generic one for everything else.
export class ApiError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message ?? code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

const TRANSLATED_CODES = new Set(
  Object.keys(commonEn.errors).filter((key) => key === key.toUpperCase()),
);

export function errorMessageKey(error) {
  return error?.code && TRANSLATED_CODES.has(error.code)
    ? `errors.${error.code}`
    : 'errors.generic';
}
