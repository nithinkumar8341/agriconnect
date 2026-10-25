import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { AuthContext } from './authContext.js';

// status: 'loading' while we ask the server whether the refresh cookie still holds a session,
// then 'authenticated' or 'anonymous'. The user object comes from the server, never from storage.
export function AuthProvider({ children, client = api }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  const startSession = useCallback(
    ({ accessToken, user }) => {
      client.setAccessToken(accessToken);
      setState({ status: 'authenticated', user });
    },
    [client],
  );

  const endSession = useCallback(() => {
    client.setAccessToken(null);
    setState({ status: 'anonymous', user: null });
  }, [client]);

  useEffect(() => {
    let active = true;
    // React StrictMode runs this twice in development; the client's single-flight refresh
    // makes both runs share one request, so the cookie is never presented twice.
    client
      .refreshAccessToken()
      .then((data) => active && setState({ status: 'authenticated', user: data.user }))
      .catch(() => active && setState({ status: 'anonymous', user: null }));
    const unsubscribe = client.onSessionExpired(() =>
      setState({ status: 'anonymous', user: null }),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

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
        if (data.accessToken) startSession(data);
        return data;
      },

      async verifyPin({ pinToken, pin }) {
        const data = await client.post('/auth/pin/verify', { pinToken, pin }, { auth: false });
        startSession(data);
        return data;
      },

      async setupPin({ pinToken, pin }) {
        const data = await client.post('/auth/pin/setup', { pinToken, pin }, { auth: false });
        startSession(data);
        return data;
      },

      async chooseRole(role) {
        const data = await client.post('/auth/role', { role });
        startSession(data);
        return data.user;
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

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
