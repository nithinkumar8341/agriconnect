// Express 5 exposes req.query as a getter, so replacing it requires redefining the property.
export function setQuery(req, value) {
  Object.defineProperty(req, 'query', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
