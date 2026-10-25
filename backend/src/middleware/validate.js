import { AppError } from '../utils/AppError.js';
import { setQuery } from '../utils/setQuery.js';

const REQUEST_PARTS = ['params', 'query', 'body'];

// Replaces each validated part with zod's parsed output, so handlers receive coerced, stripped data.
export function validate(schemas) {
  return (req, res, next) => {
    const details = [];
    const parsed = {};

    for (const part of REQUEST_PARTS) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        parsed[part] = result.data;
      } else {
        details.push(
          ...result.error.issues.map((issue) => ({
            field: [part, ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      }
    }

    if (details.length > 0) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', details));
    }

    if (parsed.params) req.params = parsed.params;
    if (parsed.query) setQuery(req, parsed.query);
    if (parsed.body) req.body = parsed.body;
    next();
  };
}
