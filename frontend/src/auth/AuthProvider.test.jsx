import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { createApiClient } from '../lib/api.js';
import {
  anonymousHandlers,
  createFakeFetch,
  signedInHandlers,
  testUsers,
} from '../test/helpers.jsx';
import { useAuth } from './authContext.js';
import { AuthProvider } from './AuthProvider.jsx';

// Exposes the latest context value to the test; written in an effect so rendering stays pure.
const probe = { auth: null };
function Probe() {
  const value = useAuth();
  useEffect(() => {
    probe.auth = value;
  });
  return <p>status:{value.status}</p>;
}

function renderWithAuth(handlers, { strict = false } = {}) {
  const { fetchImpl, calls } = createFakeFetch(handlers);
  const client = createApiClient({ fetchImpl });
  const tree = (
    <AuthProvider client={client}>
      <Probe />
    </AuthProvider>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { client, calls };
}

describe('AuthProvider', () => {
  it('restores a session from the refresh cookie on start', async () => {
    renderWithAuth(signedInHandlers(testUsers.farmer));

    expect(screen.getByText('status:loading')).toBeInTheDocument();
    expect(await screen.findByText('status:authenticated')).toBeInTheDocument();
    await waitFor(() => expect(probe.auth.user?.role).toBe('farmer'));
  });

  it('becomes anonymous when there is no session', async () => {
    renderWithAuth(anonymousHandlers);

    expect(await screen.findByText('status:anonymous')).toBeInTheDocument();
    await waitFor(() => expect(probe.auth.status).toBe('anonymous'));
    expect(probe.auth.user).toBeNull();
  });

  it('sends only one refresh under StrictMode double effects', async () => {
    const { calls } = renderWithAuth(signedInHandlers(testUsers.farmer), { strict: true });

    await screen.findByText('status:authenticated');
    expect(calls.filter((c) => c.key === 'POST /auth/token/refresh')).toHaveLength(1);
  });

  it('starts a session after OTP verification and keeps the token in memory only', async () => {
    const { client } = renderWithAuth({
      ...anonymousHandlers,
      'POST /auth/otp/verify': () => [
        200,
        { accessToken: 'access-2', user: testUsers.buyer, isNewUser: false },
      ],
    });
    await screen.findByText('status:anonymous');

    await act(() => probe.auth.verifyOtp({ phone: '9876543211', otp: '123456' }));

    expect(screen.getByText('status:authenticated')).toBeInTheDocument();
    expect(client.hasAccessToken()).toBe(true);
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('access-2');
  });

  it('does not start a session when the PIN step is still needed', async () => {
    renderWithAuth({
      ...anonymousHandlers,
      'POST /auth/otp/verify': () => [200, { next: 'pin', pinToken: 'pin-1' }],
    });
    await screen.findByText('status:anonymous');

    let result;
    await act(async () => {
      result = await probe.auth.verifyOtp({ phone: '9123456780', otp: '123456' });
    });

    expect(result).toEqual({ next: 'pin', pinToken: 'pin-1' });
    expect(screen.getByText('status:anonymous')).toBeInTheDocument();
  });

  it('logs out and forgets the token even if the server call fails', async () => {
    const { client } = renderWithAuth({
      'POST /auth/token/refresh': () => [200, { accessToken: 'access-1', user: testUsers.farmer }],
      'POST /auth/logout': () => [500, { error: { code: 'INTERNAL_ERROR' } }],
    });
    await screen.findByText('status:authenticated');

    await act(() => probe.auth.logout().catch(() => {}));

    expect(screen.getByText('status:anonymous')).toBeInTheDocument();
    expect(client.hasAccessToken()).toBe(false);
  });

  it('becomes anonymous when a later refresh is refused', async () => {
    let refreshes = 0;
    const { client } = renderWithAuth({
      'POST /auth/token/refresh': () => {
        refreshes += 1;
        return refreshes === 1
          ? [200, { accessToken: 'access-1', user: testUsers.farmer }]
          : [401, { error: { code: 'REFRESH_INVALID' } }];
      },
      'GET /auth/me': () => [401, { error: { code: 'TOKEN_EXPIRED' } }],
    });
    await screen.findByText('status:authenticated');

    await act(async () => {
      await client.get('/auth/me').catch(() => {});
    });

    await waitFor(() => expect(screen.getByText('status:anonymous')).toBeInTheDocument());
    expect(refreshes).toBe(2);
  });
});
