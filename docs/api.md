# API Reference

All backend routes are under `/api/v1`. List endpoints are paginated (from Prompt 3 onwards).

## Conventions

### Error format

Every error, from any route or middleware, has this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid",
    "details": [{ "field": "body.quantity", "message": "Too small: expected number to be >0" }],
    "requestId": "9f637546-6043-4a19-8ffb-56f9ccdeb348"
  }
}
```

- `details` appears only on validation errors.
- `requestId` matches the `X-Request-Id` response header and the server log line, so a user's report can be traced.
- Stack traces are never sent. In production, unexpected errors return a generic message.

### Error codes

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Request params, query or body failed zod validation. `details` lists each field. |
| 400 | `INVALID_JSON` | Body is not valid JSON. |
| 400 | `INVALID_INPUT` | A value has the wrong format (for example a malformed id). |
| 404 | `NOT_FOUND` | No such route. |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeds `JSON_BODY_LIMIT` (default 100 kb). |
| 429 | `RATE_LIMITED` | Too many requests from this IP (default 300 per 15 minutes). |
| 500 | `INTERNAL_ERROR` | Unexpected server error. |

### Headers

- `X-Request-Id`: sent on every response. A client or proxy may send its own (8–64 characters from `A-Z a-z 0-9 _ -`); anything else is replaced.
- `RateLimit-Policy` / `RateLimit`: remaining quota (IETF draft-8 format).
- Security headers from helmet (`X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, …).

### CORS

Only origins listed in `CORS_ORIGINS` receive CORS headers, with credentials allowed (needed for the refresh-token cookie in Prompt 2). Requests without an `Origin` header (curl, server-to-server) are not affected.

### Input sanitizing

Keys starting with `$` or containing `.` are removed from the body and query before any route runs, so operator injection like `{ "phone": { "$ne": null } }` cannot reach MongoDB.

## Backend endpoints

### `GET /api/v1/health`

Auth: none. Not rate-limited, because hosting monitors poll it.

| Status | Body |
| --- | --- |
| 200 | `{ "status": "ok", "db": "up", "uptimeSeconds": 42 }` |
| 503 | `{ "status": "degraded", "db": "down", "uptimeSeconds": 42 }` (MongoDB unreachable or ping took over 2 s) |

## ai-service (internal, called only by the backend)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/hello` | Bootstrap greeting. |
| GET | `/docs` | FastAPI's auto-generated OpenAPI UI. |
