import { useCallback, useEffect, useState } from 'react';

// Loads data for a screen and cancels the request when the screen goes away or `key` changes,
// so a slow old response can never overwrite a newer one. `key` describes the request's inputs.
// usage: const { data, error, loading, reload } =
//   useApiRequest((signal) => api.get(`/orders?status=${status}`, { signal }), `orders:${status}`);
export function useApiRequest(load, key) {
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const requestKey = `${key}#${attempt}`;
  // "Loading" is derived (the stored result belongs to another request) rather than set in the
  // effect, which avoids an extra render on every request.
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    // An answer can still arrive after cancelling (it was already on its way, or `load` ignored
    // the signal), so results of a cancelled request are dropped explicitly.
    const isCurrent = () => !controller.signal.aborted;
    load(controller.signal)
      .then((data) => isCurrent() && setResult({ key: requestKey, data, error: null }))
      .catch((error) => isCurrent() && setResult({ key: requestKey, data: null, error }));
    return () => controller.abort();
    // `load` is usually an inline function; `key` is the declared description of its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = result.key !== requestKey;
  return {
    data: loading ? null : result.data,
    error: loading ? null : result.error,
    loading,
    reload,
  };
}
