import { createFakeFetch } from '../test/helpers.jsx';
import { createApiClient } from './api.js';
import { ApiError, errorMessageKey } from './apiErrors.js';

describe('api client', () => {
  it('sends JSON with the access token and returns the parsed body', async () => {
    const { fetchImpl, calls } = createFakeFetch({
      'POST /things': (request) => [200, { echoed: request.body }],
    });
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('token-1');

    const result = await client.post('/things', { name: 'tomato' });

    expect(result).toEqual({ echoed: { name: 'tomato' } });
    expect(calls[0].headers).toMatchObject({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/json',
    });
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('same-origin');
  });

  it('omits the token on auth: false requests', async () => {
    const { fetchImpl, calls } = createFakeFetch({ 'GET /public': () => [200, {}] });
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('token-1');

    await client.get('/public', { auth: false });

    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('turns the backend error shape into an ApiError', async () => {
    const { fetchImpl } = createFakeFetch({
      'GET /x': () => [
        429,
        { error: { code: 'RATE_LIMITED', message: 'Too many', requestId: 'req-1' } },
      ],
    });
    const client = createApiClient({ fetchImpl });

    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
      code: 'RATE_LIMITED',
      requestId: 'req-1',
    });
  });

  it('reports a failed connection as NETWORK_ERROR', async () => {
    const client = createApiClient({
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });

    await expect(client.get('/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('passes cancellation through untouched', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const client = createApiClient({ fetchImpl: vi.fn().mockRejectedValue(abort) });

    await expect(client.get('/x', { signal: new AbortController().signal })).rejects.toBe(abort);
  });

  it('refreshes an expired access token once and retries the request', async () => {
    const { fetchImpl, calls } = createFakeFetch({
      'GET /me': (request) =>
        request.headers.Authorization === 'Bearer fresh'
          ? [200, { ok: true }]
          : [401, { error: { code: 'TOKEN_EXPIRED' } }],
      'POST /auth/token/refresh': () => [200, { accessToken: 'fresh', user: {} }],
    });
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('stale');

    expect(await client.get('/me')).toEqual({ ok: true });
    expect(calls.map((c) => c.key)).toEqual(['GET /me', 'POST /auth/token/refresh', 'GET /me']);
  });

  it('shares one refresh between parallel requests (single flight)', async () => {
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });
    const { fetchImpl, calls } = createFakeFetch({
      'GET /a': (r) =>
        r.headers.Authorization === 'Bearer fresh'
          ? [200, 'a']
          : [401, { error: { code: 'TOKEN_EXPIRED' } }],
      'GET /b': (r) =>
        r.headers.Authorization === 'Bearer fresh'
          ? [200, 'b']
          : [401, { error: { code: 'TOKEN_EXPIRED' } }],
      'POST /auth/token/refresh': async () => {
        await refreshGate;
        return [200, { accessToken: 'fresh', user: {} }];
      },
    });
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('stale');

    const both = Promise.all([client.get('/a'), client.get('/b')]);
    await vi.waitFor(() => expect(calls.filter((c) => c.key === 'GET /b')).toHaveLength(1));
    releaseRefresh();

    expect(await both).toEqual(['a', 'b']);
    expect(calls.filter((c) => c.key === 'POST /auth/token/refresh')).toHaveLength(1);
  });

  it('tells listeners when the session can no longer be refreshed', async () => {
    const { fetchImpl } = createFakeFetch({
      'GET /me': () => [401, { error: { code: 'TOKEN_EXPIRED' } }],
      'POST /auth/token/refresh': () => [401, { error: { code: 'REFRESH_INVALID' } }],
    });
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('stale');
    const listener = vi.fn();
    client.onSessionExpired(listener);

    await expect(client.get('/me')).rejects.toMatchObject({ code: 'REFRESH_INVALID' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(client.hasAccessToken()).toBe(false);
  });

  it('does not try to refresh for other 401 errors', async () => {
    const { fetchImpl, calls } = createFakeFetch({
      'GET /me': () => [401, { error: { code: 'TOKEN_REVOKED' } }],
    });
    const client = createApiClient({ fetchImpl });

    await expect(client.get('/me')).rejects.toMatchObject({ code: 'TOKEN_REVOKED' });
    expect(calls).toHaveLength(1);
  });
});

describe('errorMessageKey', () => {
  it('maps known codes to their translation and anything else to the generic message', () => {
    expect(errorMessageKey(new ApiError({ code: 'NETWORK_ERROR' }))).toBe('errors.NETWORK_ERROR');
    expect(errorMessageKey(new ApiError({ code: 'SOMETHING_NEW' }))).toBe('errors.generic');
    expect(errorMessageKey(undefined)).toBe('errors.generic');
  });
});
