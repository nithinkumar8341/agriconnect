import { setQuery } from '../utils/setQuery.js';

// MongoDB treats keys starting with "$" as operators and keys with "." as nested paths,
// so a body like { "phone": { "$ne": null } } could otherwise turn a lookup into "match anything".
function isUnsafeKey(key) {
  return key.startsWith('$') || key.includes('.');
}

export function stripUnsafeKeys(value) {
  if (Array.isArray(value)) {
    return value.map(stripUnsafeKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isUnsafeKey(key))
        .map(([key, nested]) => [key, stripUnsafeKeys(nested)]),
    );
  }
  return value;
}

export function sanitizeRequest(req, res, next) {
  if (req.body !== undefined) {
    req.body = stripUnsafeKeys(req.body);
  }
  setQuery(req, stripUnsafeKeys(req.query));
  next();
}
