import hmac

from fastapi import Depends, FastAPI, Header, HTTPException

from app.chat import ChatRequest, answer
from app.config import load_settings
from app.insights import InsightsRequest, summarise
from app.llm import make_complete
from app.price import PriceRequest, recommend


def create_app(settings=None, complete=None) -> FastAPI:
    settings = settings or load_settings()
    complete = complete or make_complete(settings)
    app = FastAPI(title="AgriConnect AI Service", version="0.2.0")

    # Only the backend calls this service; it has no users or database of its own.
    def internal_only(x_internal_key: str = Header(default="")) -> None:
        if settings.internal_key and not hmac.compare_digest(x_internal_key, settings.internal_key):
            raise HTTPException(status_code=401, detail="unauthorised")

    guarded = [Depends(internal_only)]

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "llm": bool(settings.anthropic_api_key)}

    @app.post("/price/recommend", dependencies=guarded)
    def price(req: PriceRequest) -> dict:
        return recommend(req)

    @app.post("/chat", dependencies=guarded)
    def chat(req: ChatRequest) -> dict:
        return answer(req, complete)

    @app.post("/reviews/insights", dependencies=guarded)
    def insights(req: InsightsRequest) -> dict:
        return summarise(req, complete)

    return app


app = create_app()
