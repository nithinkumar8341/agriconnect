import { useAuth } from '../auth/authContext.js';
import { useApiRequest } from './useApiRequest.js';

// Reference data used by several screens. The server sends cache headers, so repeat requests are
// answered by the browser cache; offline caching of the catalog comes in Prompt 17.
export function useDistricts() {
  const { client } = useAuth();
  return useApiRequest(
    (signal) => client.get('/locations/districts', { signal, auth: false }),
    'districts',
  );
}

// The full crop catalog (about 60 crops fits in one page); the listing flow (Prompt 8) uses it.
export function useCrops() {
  const { client } = useAuth();
  return useApiRequest((signal) => client.get('/crops', { signal, auth: false }), 'crops');
}
