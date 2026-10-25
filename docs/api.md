# API Reference

All backend routes are under `/api/v1`. Errors use the shape `{ "error": { "code": "...", "message": "..." } }` (from Prompt 1). List endpoints are paginated.

## Backend

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/hello` | none | Bootstrap greeting. Replaced by `/api/v1/health` in Prompt 1. |

## ai-service (internal, called only by the backend)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/hello` | Bootstrap greeting. |
| GET | `/docs` | FastAPI's auto-generated OpenAPI UI. |
