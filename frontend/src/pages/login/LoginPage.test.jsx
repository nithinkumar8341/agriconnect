import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { createFakeBackend, renderApp, testUsers } from '../../test/helpers.jsx';

async function enterPhone(user, phone = '98765 43210') {
  await user.type(await screen.findByLabelText('Mobile number'), phone);
  await user.click(screen.getByRole('button', { name: 'Get OTP' }));
}

describe('login', () => {
  it('asks for the language first on a first visit, then the phone number', async () => {
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    renderApp('/login', handlers);

    expect(
      await screen.findByRole('heading', { name: 'Choose your language' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'తెలుగు' }));
    await user.click(screen.getByRole('button', { name: 'కొనసాగించండి' }));

    expect(screen.getByRole('heading', { name: 'మీ మొబైల్ నంబర్' })).toBeInTheDocument();
  });

  it('skips the language step once a language has been chosen', async () => {
    await changeLanguage('en');
    const { handlers } = createFakeBackend();
    renderApp('/login', handlers);

    expect(await screen.findByLabelText('Mobile number')).toBeInTheDocument();
  });

  it('rejects an invalid mobile number without calling the server', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    const { calls } = renderApp('/login', handlers);

    await enterPhone(user, '12345');

    expect(
      screen.getByText(/10-digit mobile number starting with 6, 7, 8 or 9/),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /auth/otp/request')).toBe(false);
  });

  it('accepts pasted numbers with +91 and spaces, and sends the 10-digit number', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    const { calls } = renderApp('/login', handlers);

    await user.click(await screen.findByLabelText('Mobile number'));
    await user.paste('+91 98765-43210');
    await user.click(screen.getByRole('button', { name: 'Get OTP' }));

    const request = calls.find((c) => c.key === 'POST /auth/otp/request');
    expect(request.body).toEqual({ phone: '9876543210', language: 'en' });
    expect(
      await screen.findByText('We sent a 6-digit code to +91 98765 43210.'),
    ).toBeInTheDocument();
  });

  it('shows tries left after a wrong code and clears the box', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    renderApp('/login', handlers);
    await enterPhone(user);

    await user.type(await screen.findByLabelText('6-digit code'), '000000');

    expect(await screen.findByText('That code is not correct. 4 tries left.')).toBeInTheDocument();
    expect(screen.getByLabelText('6-digit code')).toHaveValue('');
  });

  it('sends a new user who enters the right code to the role choice, remembering the device', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    const { router, calls } = renderApp('/login', handlers);
    await enterPhone(user);

    await user.type(await screen.findByLabelText('6-digit code'), '123456');

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding/role'));
    expect(calls.find((c) => c.key === 'POST /auth/otp/verify').body).toMatchObject({
      phone: '9876543210',
      otp: '123456',
      language: 'en',
      rememberDevice: true,
    });
  });

  it('can log in without remembering the device', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    const { calls } = renderApp('/login', handlers);

    await user.click(await screen.findByLabelText(/Keep me logged in/));
    await enterPhone(user);
    await user.type(await screen.findByLabelText('6-digit code'), '123456');

    await waitFor(() =>
      expect(calls.find((c) => c.key === 'POST /auth/otp/verify')?.body.rememberDevice).toBe(false),
    );
  });

  it('takes a returning farmer with a profile straight home', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend({
      existingUser: testUsers.farmer,
      existingProfile: { name: 'Ramu' },
    });
    const { router } = renderApp('/login', handlers);
    await enterPhone(user);

    await user.type(await screen.findByLabelText('6-digit code'), '123456');

    await waitFor(() => expect(router.state.location.pathname).toBe('/farmer'));
  });

  it('goes to the code screen with the remaining wait if a code was just sent', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    handlers['POST /auth/otp/request'] = () => [
      429,
      { error: { code: 'OTP_COOLDOWN', details: { retryAfterSeconds: 12 } } },
    ];
    renderApp('/login', handlers);

    await enterPhone(user);

    expect(
      await screen.findByText('You can ask for a new code in 12 seconds.'),
    ).toBeInTheDocument();
  });

  it('explains a failed SMS on the phone screen', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    handlers['POST /auth/otp/request'] = () => [503, { error: { code: 'SMS_FAILED' } }];
    renderApp('/login', handlers);

    await enterPhone(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send the SMS');
    expect(screen.getByLabelText('Mobile number')).toHaveValue('9876543210');
  });

  it('offers a new code once the 30-second wait is over', async () => {
    await changeLanguage('en');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { handlers } = createFakeBackend();
      const { calls } = renderApp('/login', handlers);
      await enterPhone(user);
      expect(await screen.findByText(/new code in 30 seconds/)).toBeInTheDocument();

      for (let i = 0; i < 30; i += 1) {
        await act(() => vi.advanceTimersByTime(1000));
      }
      await user.click(screen.getByRole('button', { name: 'Send a new code' }));

      expect(calls.filter((c) => c.key === 'POST /auth/otp/request')).toHaveLength(2);
      expect(await screen.findByText(/new code in 30 seconds/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks an agent for their PIN after the code, then opens the agent area', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend({
      existingUser: { ...testUsers.farmer, role: 'agent', hasPin: true },
    });
    const { router } = renderApp('/login', handlers);
    await enterPhone(user);
    await user.type(await screen.findByLabelText('6-digit code'), '123456');

    expect(await screen.findByRole('heading', { name: 'Enter your PIN' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('PIN'), '1111');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('That PIN is not correct. 4 tries left.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('PIN'), '2468');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/agent'));
  });

  it('checks that a new PIN is typed the same twice', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend({
      existingUser: { ...testUsers.farmer, role: 'admin', hasPin: false },
    });
    const { calls } = renderApp('/login', handlers);
    await enterPhone(user);
    await user.type(await screen.findByLabelText('6-digit code'), '123456');

    await user.type(await screen.findByLabelText('PIN'), '4826');
    await user.type(screen.getByLabelText('Enter the PIN again'), '4827');
    await user.click(screen.getByRole('button', { name: 'Save PIN and log in' }));

    expect(screen.getByText('The two PINs do not match.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /auth/pin/setup')).toBe(false);
  });

  it('never puts the access token in browser storage', async () => {
    await changeLanguage('en');
    const user = userEvent.setup();
    const { handlers } = createFakeBackend();
    const { router } = renderApp('/login', handlers);
    await enterPhone(user);
    await user.type(await screen.findByLabelText('6-digit code'), '123456');
    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding/role'));

    const stored = JSON.stringify({ ...window.localStorage, ...window.sessionStorage });
    expect(stored).not.toContain('access-1');
  });
});
