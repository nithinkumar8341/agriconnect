import { useState } from 'react';
import { useAuth } from '../auth/authContext.js';
import { useApiRequest } from './useApiRequest.js';
import { usePolling } from './usePolling.js';

const REFRESH_MS = 15_000;

// One order, refreshed every 15 seconds while it is still open. The last answer stays on screen
// during a refresh, so the page never flashes. replace() shows an order returned by an action.
export function useLiveOrder(id) {
  const { client } = useAuth();
  const request = useApiRequest((signal) => client.get(`/orders/${id}`, { signal }), `order:${id}`);
  const [latest, setLatest] = useState(null);
  if (request.data?.order && request.data.order !== latest?.fromRequest) {
    setLatest({ order: request.data.order, fromRequest: request.data.order });
  }
  const order = latest?.order ?? null;
  usePolling(request.reload, REFRESH_MS, Boolean(order?.isOpen));

  return {
    order,
    error: order ? null : request.error,
    loading: !order && request.loading,
    reload: request.reload,
    replace: (next) => setLatest((current) => ({ ...current, order: next })),
  };
}
