import { useCallback, useEffect, useMemo, useState } from 'react';
import i18n from '../i18n/index.js';
import { api } from '../lib/api.js';
import { AuthContext } from './authContext.js';
import { PROFILE_ROLES } from './roles.js';

const ANONYMOUS = { status: 'anonymous', user: null, profile: undefined };

// status: 'loading' while we ask the server whether the refresh cookie still holds a session,
// then 'authenticated' or 'anonymous'. The user object comes from the server, never from storage.
// profile: undefined = not needed (agent/admin) or could not be loaded; null = farmer/buyer who
// has not finished onboarding; object = their profile.
export function AuthProvider({ children, client = api }) {
  const [state, setState] = useState({ status: 'loading', user: null, profile: undefined });

  // The profile is loaded before the session is announced, so guards never flash the wrong screen.
  const loadProfile = useCallback(
    async (user) => {
      if (!PROFILE_ROLES.includes(user.role)) return undefined;
      try {
        return (await client.get('/profile')).profile;
      } catch {
        // Unknown rather than missing: never push someone into onboarding because of a network blip.
        return undefined;
      }
    },
    [client],
  );

  const startSession = useCallback(
    async ({ accessToken, user }) => {
      client.setAccessToken(accessToken);
      const profile = await loadProfile(user);
      setState({ status: 'authenticated', user, profile });
    },
    [client, loadProfile],
  );

  const endSession = useCallback(() => {
    client.setAccessToken(null);
    setState(ANONYMOUS);
  }, [client]);

  useEffect(() => {
    let active = true;
    // React StrictMode runs this twice in development; the client's single-flight refresh
    // makes both runs share one request, so the cookie is never presented twice.
    client
      .refreshAccessToken()
      .then(async (data) => {
        const profile = await loadProfile(data.user);
        if (active) setState({ status: 'authenticated', user: data.user, profile });
      })
      .catch(() => active && setState(ANONYMOUS));
    const unsubscribe = client.onSessionExpired(() => setState(ANONYMOUS));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, loadProfile]);

  // Keep the account's language in step with the app, so SMS arrive in the language on screen.
  const { status, user } = state;
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    function syncLanguage(language) {
      if (language === user.language) return;
      client
        .patch('/users/me', { language })
        .then((data) => setState((current) => ({ ...current, user: data.user })))
        .catch(() => {});
    }
    syncLanguage(i18n.language);
    i18n.on('languageChanged', syncLanguage);
    return () => i18n.off('languageChanged', syncLanguage);
  }, [client, status, user]);

  const actions = useMemo(
    () => ({
      requestOtp: ({ phone, language }) =>
        client.post('/auth/otp/request', { phone, language }, { auth: false }),

      // Returns { next, pinToken } for agents and admins, who must then call verifyPin/setupPin.
      async verifyOtp({ phone, otp, language, rememberDevice = true }) {
        const data = await client.post(
          '/auth/otp/verify',
          { phone, otp, language, rememberDevice },
          { auth: false },
        );
        if (data.accessToken) await startSession(data);
        return data;
      },

      async verifyPin({ pinToken, pin }) {
        const data = await client.post('/auth/pin/verify', { pinToken, pin }, { auth: false });
        await startSession(data);
        return data;
      },

      async setupPin({ pinToken, pin }) {
        const data = await client.post('/auth/pin/setup', { pinToken, pin }, { auth: false });
        await startSession(data);
        return data;
      },

      async chooseRole(role) {
        const data = await client.post('/auth/role', { role });
        await startSession(data);
        return data.user;
      },

      // Called by onboarding once the profile is saved.
      setProfile(profile) {
        setState((current) => ({ ...current, profile }));
      },

      async logout() {
        try {
          await client.post('/auth/logout', undefined, { auth: false });
        } finally {
          endSession();
        }
      },

      async logoutAll() {
        try {
          await client.post('/auth/logout-all');
        } finally {
          endSession();
        }
      },
    }),
    [client, startSession, endSession],
  );

  const value = useMemo(() => ({ ...state, ...actions, client }), [state, actions, client]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
