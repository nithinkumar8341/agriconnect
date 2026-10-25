import { randomUUID } from 'node:crypto';

// Accept an upstream id (for example from a proxy) only if it is short and plain, so it cannot inject log content.
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}
