from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

KEY = "test-internal-key"


def client(complete=lambda _s, _p: None) -> TestClient:
    settings = Settings(anthropic_api_key="", llm_model="test", internal_key=KEY)
    return TestClient(create_app(settings, complete), headers={"x-internal-key": KEY})


def test_rejects_calls_without_the_internal_key():
    res = client().post("/chat", json={"message": "hi"}, headers={"x-internal-key": "wrong"})
    assert res.status_code == 401


def test_price_uses_median_of_recent_sales():
    sales = [{"price": p, "date": "2026-10-20"} for p in (2000, 3000, 3000, 3500, 6000)]
    body = client().post("/price/recommend", json={"unit": "kg", "sales": sales}).json()
    assert body["status"] == "market_sales"
    assert body["suggested"] == 3000
    assert (body["low"], body["high"]) == (3000, 3500)
    assert body["sampleSize"] == 5


def test_price_falls_back_to_mandi_when_sales_are_thin():
    mandi = [
        {"modalPrice": 1800, "market": "Vijayawada", "date": "2026-10-24"},
        {"modalPrice": 2200, "market": "Vijayawada", "date": "2026-10-25"},
    ]
    body = (
        client()
        .post(
            "/price/recommend",
            json={"unit": "kg", "sales": [{"price": 4000, "date": "2026-10-20"}], "mandi": mandi},
        )
        .json()
    )
    assert body["status"] == "mandi_reference"
    assert body["confidence"] == "low"
    assert body["date"] == "2026-10-25"


def test_price_reports_no_data():
    body = client().post("/price/recommend", json={"unit": "dozen"}).json()
    assert body == {"status": "no_data", "sampleSize": 0}


def test_chat_passes_faq_and_products_to_the_llm():
    seen = {}

    def fake(system, prompt):
        seen["system"], seen["prompt"] = system, prompt
        return "Pay by cash or UPI."

    product = {"crop": "Tomato", "price": 3000, "unit": "kg", "farmer": "Ramu"}
    body = (
        client(fake)
        .post("/chat", json={"message": "How do I pay?", "language": "te", "products": [product]})
        .json()
    )
    assert body == {"reply": "Pay by cash or UPI.", "sources": ["payment"], "usedLlm": True}
    assert "Telugu" in seen["system"]
    assert "Tomato: ₹30 per kg from Ramu" in seen["prompt"]


def test_chat_without_llm_answers_from_faq_or_says_unsure():
    c = client()
    assert c.post("/chat", json={"message": "can I cancel?"}).json()["sources"] == ["cancel"]
    unsure = c.post("/chat", json={"message": "weather tomorrow", "language": "hi"}).json()
    assert unsure["reply"].startswith("मुझे")
    assert unsure["usedLlm"] is False


def test_insights_summarise_reviews_and_need_three():
    reviews = [{"stars": s, "comment": c} for s, c in [(5, "fresh"), (4, "good"), (2, "late")]]
    body = (
        client(lambda _s, _p: "Fresh produce, sometimes late.")
        .post("/reviews/insights", json={"reviews": reviews})
        .json()
    )
    assert body["summary"] == "Fresh produce, sometimes late."
    assert (body["averageStars"], body["happyPercent"]) == (3.7, 67)

    few = client().post("/reviews/insights", json={"reviews": reviews[:2]}).json()
    assert few == {"status": "not_enough", "count": 2}
