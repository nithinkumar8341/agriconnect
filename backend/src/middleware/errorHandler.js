import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

function toErrorResponse(err, isProduction) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  }
  if (err instanceof z.ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Some fields are invalid', details };
  }
  if (err.name === 'CastError') {
    return { status: 400, code: 'INVALID_INPUT', message: 'A value has the wrong format' };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    // Internal messages can reveal implementation details, so production only gets a generic one.
    message: isProduction ? 'Something went wrong. Please try again.' : err.message,
  };
}

export function createErrorHandler({ isProduction }) {
  return (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const { status, code, message, details } = toErrorResponse(err, isProduction);
    if (status >= 500) {
      // pino-http logs res.err with its stack when the response finishes; the client never sees it.
      res.err = err;
    }

    res.status(status).json({
      error: { code, message, ...(details && { details }), requestId: req.id },
    });
  };
}
