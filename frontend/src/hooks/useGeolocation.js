import { useCallback, useState } from 'react';

// status: idle | locating | located | denied | unavailable | unsupported.
// Asked only when the person taps the button (never on page load), after we explain why.
// locate() resolves with { latitude, longitude, accuracyMeters } or null when it did not work.
export function useGeolocation() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [status, setStatus] = useState(supported ? 'idle' : 'unsupported');

  const locate = useCallback(() => {
    if (!supported) return Promise.resolve(null);
    setStatus('locating');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setStatus('located');
          resolve({
            latitude: Number(coords.latitude.toFixed(6)),
            longitude: Number(coords.longitude.toFixed(6)),
            accuracyMeters: Math.round(coords.accuracy),
          });
        },
        (error) => {
          setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
          resolve(null);
        },
        // A cached fix up to 5 minutes old is fine for a farm; it saves battery and works indoors.
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 300_000 },
      );
    });
  }, [supported]);

  const reset = useCallback(() => setStatus(supported ? 'idle' : 'unsupported'), [supported]);

  return { status, locate, reset };
}
