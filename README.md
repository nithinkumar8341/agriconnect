# AgriConnect

A multilingual (Telugu / English / Hindi), farmer-first marketplace where small farmers in Andhra Pradesh and Telangana sell fresh vegetables and fruits directly to nearby households.

> Status: early development. See [docs/PROGRESS.md](docs/PROGRESS.md).

## Repository layout

| Folder | What it is |
| --- | --- |
| `frontend/` | React + Vite + Tailwind PWA |
| `backend/` | Node.js + Express REST API (`/api/v1`) |
| `ai-service/` | Python + FastAPI service for price suggestion and crop quality checks |
| `docs/` | Architecture, database, API, decisions (ADRs), and learning notes |

## Run locally

Prerequisites: Node.js 22.9+, Python 3.11+, Docker.

```bash
# 1. Database (MongoDB single-node replica set)
docker compose up -d

# 2. Backend -> http://localhost:4000/api/v1/hello
cd backend && cp .env.example .env && npm install && npm run dev

# 3. Frontend -> http://localhost:5173
cd frontend && npm install && npm run dev

# 4. AI service -> http://localhost:8000/hello  (docs at /docs)
cd ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

## Lint and test

```bash
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm test
cd ai-service && ruff check . && ruff format --check . && pytest
```

More detail: [docs/architecture.md](docs/architecture.md).
