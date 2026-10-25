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

export const sampleProfiles = {
  farmer: {
    name: 'Ramu',
    state: 'Andhra Pradesh',
    district: 'Krishna',
    mandal: 'Kankipadu',
    village: 'Kankipadu',
    pincode: '521151',
    location: null,
    deliveryRadiusKm: 10,
    servicePincodes: ['521151'],
    deliveryDays: ['mon', 'wed', 'fri'],
    cutoffTime: '18:00',
    minOrderValue: 10000,
    deliveryFee: 2000,
    verificationLevel: 'phone_verified',
  },
  buyer: { name: 'Padma', addresses: [] },
};

export function sampleDashboard(overrides = {}) {
  return {
    farmerName: 'Ramu',
    orders: { today: 0, new: 0, pendingDelivery: 0 },
    listings: { available: 0, outOfStock: 0, paused: 0 },
    lowStockPercent: 20,
    lowStock: [],
    agent: null,
    ...overrides,
  };
}

const emptyPage = { items: [], page: 1, limit: 20, total: 0 };

// profile: an object (onboarded), null (still needs onboarding); agents/admins never ask for one.
export function signedInHandlers(
  user,
  { profile = sampleProfiles[user.role] ?? null, dashboard = sampleDashboard() } = {},
) {
  return {
    'POST /auth/token/refresh': () => [200, { accessToken: 'access-1', user }],
    'POST /auth/logout': () => [204, null],
    'POST /auth/logout-all': () => [204, null],
    'GET /profile': () => [200, { role: user.role, profile }],
    'PATCH /users/me': (request) => [200, { user: { ...user, language: request.body.language } }],
    'GET /farmer/dashboard': () => [200, dashboard],
    'GET /locations/districts': () => [200, testDistricts],
  };
}

// Answers GET /products/mine?... for any query; tests override it to return listings.
export function withProducts(handlers, respond = () => [200, emptyPage]) {
  return new Proxy(handlers, {
    get(target, key) {
      if (typeof key === 'string' && key.startsWith('GET /products/mine')) return respond;
      return target[key];
    },
  });
}

export const testDistricts = {
  states: [
    {
      state: 'Andhra Pradesh',
      districts: [
        { en: 'Krishna', te: 'కృష్ణా', hi: 'कृष्णा' },
        { en: 'Guntur', te: 'గుంటూరు', hi: 'गुंटूर' },
      ],
    },
    {
      state: 'Telangana',
      districts: [
        { en: 'Rangareddy', te: 'రంగారెడ్డి', hi: 'रंगारेड्डी' },
        { en: 'Hyderabad', te: 'హైదరాబాద్', hi: 'हैदराबाद' },
      ],
    },
  ],
};

// A small stateful stand-in for the backend auth and profile API, so whole flows can be driven
// screen by screen. The correct OTP is 123456; `existingUser` simulates a returning account.
export function createFakeBackend({ existingUser = null, existingProfile = null } = {}) {
  const db = { user: existingUser, profile: existingProfile, savedProfiles: [] };
  const handlers = {
    ...anonymousHandlers,
    'POST /auth/otp/request': () => [202, { expiresInSeconds: 300, resendAfterSeconds: 30 }],
    'POST /auth/otp/verify': (request) => {
      if (request.body.otp !== '123456') {
        return [400, { error: { code: 'OTP_INVALID', details: { attemptsLeft: 4 } } }];
      }
      const isNewUser = !db.user;
      db.user ??= {
        id: 'new-user',
        phone: `+91${request.body.phone}`,
        role: null,
        language: request.body.language ?? 'te',
        status: 'active',
      };
      if (['agent', 'admin'].includes(db.user.role)) {
        return [200, { next: db.user.hasPin ? 'pin' : 'pin_setup', pinToken: 'pin-token' }];
      }
      return [200, { accessToken: 'access-1', user: db.user, isNewUser }];
    },
    'POST /auth/pin/verify': (request) =>
      request.body.pin === '2468'
        ? [200, { accessToken: 'access-1', user: db.user }]
        : [400, { error: { code: 'PIN_INVALID', details: { attemptsLeft: 4 } } }],
    'POST /auth/pin/setup': () => [200, { accessToken: 'access-1', user: db.user }],
    'POST /auth/role': (request) => {
      db.user = { ...db.user, role: request.body.role };
      return [200, { accessToken: 'access-2', user: db.user }];
    },
    'GET /profile': () => [200, { role: db.user.role, profile: db.profile }],
    'PUT /profile/farmer': (request) => {
      db.savedProfiles.push(request.body);
      db.profile = { ...request.body, verificationLevel: 'phone_verified' };
      return [200, { profile: db.profile }];
    },
    'PUT /profile/buyer': (request) => {
      db.savedProfiles.push(request.body);
      db.profile = {
        name: request.body.name,
        addresses: [{ ...request.body.address, isDefault: true }],
      };
      return [200, { profile: db.profile }];
    },
    'GET /locations/districts': () => [200, testDistricts],
    'GET /farmer/dashboard': () => [200, sampleDashboard({ farmerName: db.profile?.name ?? null })],
    'PATCH /users/me': (request) => {
      db.user = { ...db.user, language: request.body.language };
      return [200, { user: db.user }];
    },
    'POST /auth/logout': () => [204, null],
  };
  return { db, handlers };
}

// jsdom has no geolocation; tests choose whether the person allows or refuses it.
export function mockGeolocation(outcome) {
  const getCurrentPosition = vi.fn((success, failure) => {
    if (outcome === 'allow') {
      success({ coords: { latitude: 16.438412, longitude: 80.782634, accuracy: 18 } });
    } else {
      failure({ code: 1, PERMISSION_DENIED: 1 });
    }
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
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
