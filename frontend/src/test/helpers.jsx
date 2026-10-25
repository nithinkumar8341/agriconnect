import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import App from '../App.jsx';
import { routes } from '../app/routes.jsx';
import { createApiClient } from '../lib/api.js';

export function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  };
}

// A fake fetch driven by a table of "METHOD /path" -> handler(request) returning [status, body].
// Unlisted routes fail the test loudly instead of silently returning undefined.
export function createFakeFetch(handlers) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init = {}) => {
    const path = url.replace(/^\/api\/v1/, '');
    const key = `${init.method ?? 'GET'} ${path}`;
    const request = {
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    calls.push({ key, ...request });
    const handler = handlers[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    const [status, body] = await handler(request, calls);
    return jsonResponse(status, body);
  });
  return { fetchImpl, calls };
}

export const anonymousHandlers = {
  'POST /auth/token/refresh': () => [
    401,
    { error: { code: 'REFRESH_INVALID', message: 'Your session has ended.' } },
  ],
};

export function signedInHandlers(user) {
  return {
    'POST /auth/token/refresh': () => [200, { accessToken: 'access-1', user }],
    'POST /auth/logout': () => [204, null],
  };
}

export function renderApp(path, handlers = anonymousHandlers) {
  const { fetchImpl, calls } = createFakeFetch(handlers);
  const client = createApiClient({ fetchImpl });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(<App router={router} client={client} />);
  return { ...utils, router, client, calls };
}

export const testUsers = {
  farmer: { id: 'u1', phone: '+919876543210', role: 'farmer', language: 'te', status: 'active' },
  buyer: { id: 'u2', phone: '+919876543211', role: 'buyer', language: 'en', status: 'active' },
  newcomer: { id: 'u3', phone: '+919876543212', role: null, language: 'te', status: 'active' },
};
