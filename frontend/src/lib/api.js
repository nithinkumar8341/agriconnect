import { ApiError } from './apiErrors.js';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// Talks to the backend. The access token lives only in this closure (memory), never in
// localStorage, so injected scripts cannot read it from storage; a page reload restores it from the
// httpOnly refresh cookie instead.
export function createApiClient({ baseUrl = DEFAULT_BASE_URL, fetchImpl, xhrFactory } = {}) {
  const doFetch = fetchImpl ?? ((...args) => window.fetch(...args));
  const makeXhr = xhrFactory ?? (() => new XMLHttpRequest());
  let accessToken = null;
  let refreshInFlight = null;
  const sessionExpiredListeners = new Set();

  async function send(path, { method = 'GET', body, signal, auth = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        credentials: 'same-origin',
      });
    } catch (err) {
      // A cancelled request is not an error to show; callers simply ignore it.
      if (err.name === 'AbortError') throw err;
      throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: err.message });
    }

    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError({
        status: response.status,
        ...(data?.error ?? { code: 'HTTP_ERROR', message: response.statusText }),
      });
    }
    return data;
  }

  // Single flight: every caller that needs a refresh at the same moment shares one request.
  // Two parallel refreshes would present the same cookie twice, which the backend treats as
  // token theft and answers by ending the session (ADR 0003).
  function refreshAccessToken() {
    refreshInFlight ??= send('/auth/token/refresh', { method: 'POST', auth: false })
      .then((data) => {
        accessToken = data.accessToken;
        return data;
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          accessToken = null;
          sessionExpiredListeners.forEach((listener) => listener());
        }
        throw err;
      })
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  }

  async function request(path, options = {}) {
    try {
      return await send(path, options);
    } catch (err) {
      const canRetry = options.auth !== false && err instanceof ApiError;
      if (canRetry && err.code === 'TOKEN_EXPIRED') {
        await refreshAccessToken();
        return send(path, options);
      }
      throw err;
    }
  }

  // File uploads use XMLHttpRequest because fetch cannot report upload progress, and a progress
  // bar matters on a slow connection. Errors are shaped exactly like send()'s.
  function sendUpload(path, formData, { onProgress, signal } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = makeXhr();
      xhr.open('POST', `${baseUrl}${path}`);
      xhr.setRequestHeader('Accept', 'application/json');
      if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total);
      };
      xhr.onload = () => {
        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          // Non-JSON bodies (for example a proxy error page) fall through to HTTP_ERROR.
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else
          reject(new ApiError({ status: xhr.status, ...(data?.error ?? { code: 'HTTP_ERROR' }) }));
      };
      xhr.onerror = () => reject(new ApiError({ status: 0, code: 'NETWORK_ERROR' }));
      xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(formData);
    });
  }

  async function upload(path, formData, options) {
    try {
      return await sendUpload(path, formData, options);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TOKEN_EXPIRED') {
        await refreshAccessToken();
        return sendUpload(path, formData, options);
      }
      throw err;
    }
  }

  return {
    request,
    upload,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
    refreshAccessToken,
    setAccessToken: (token) => {
      accessToken = token;
    },
    hasAccessToken: () => accessToken !== null,
    onSessionExpired(listener) {
      sessionExpiredListeners.add(listener);
      return () => sessionExpiredListeners.delete(listener);
    },
  };
}

export const api = createApiClient();
