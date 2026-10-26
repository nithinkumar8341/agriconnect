import { useEffect, useRef } from 'react';

// Calls `refresh` every `intervalMs` while `active` and the page is visible, so order screens
// stay current without a socket (and without using data while the phone is in a pocket).
export function usePolling(refresh, intervalMs, active = true) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') latest.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, active]);
}
