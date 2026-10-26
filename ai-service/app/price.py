from statistics import median, quantiles

from pydantic import BaseModel, Field

# Below this many recent sales a median is too noisy to recommend on its own.
MIN_SALES = 3


class Sale(BaseModel):
    price: int = Field(gt=0, description="paise per unit")
    date: str


class MandiRow(BaseModel):
    modalPrice: int = Field(gt=0, description="paise per kg")
    market: str
    date: str


class PriceRequest(BaseModel):
    unit: str
    sales: list[Sale] = []
    mandi: list[MandiRow] = []


def _rupee(paise: float) -> int:
    # Farmers type whole rupees, so suggestions are rounded to the rupee (in paise).
    return int(round(paise / 100)) * 100


def recommend(req: PriceRequest) -> dict:
    prices = sorted(s.price for s in req.sales)
    n = len(prices)
    if n >= MIN_SALES:
        q1, _, q3 = quantiles(prices, n=4, method="inclusive")
        return {
            "status": "market_sales",
            "suggested": _rupee(median(prices)),
            "low": _rupee(q1),
            "high": _rupee(q3),
            "sampleSize": n,
            "confidence": "high" if n >= 10 else "medium",
        }
    # Thin data: wholesale mandi prices give a labelled floor, never presented as retail.
    modal = sorted(row.modalPrice for row in req.mandi) if req.unit == "kg" else []
    if modal:
        return {
            "status": "mandi_reference",
            "suggested": _rupee(median(modal)),
            "low": _rupee(modal[0]),
            "high": _rupee(modal[-1]),
            "sampleSize": len(modal),
            "confidence": "low",
            "market": req.mandi[0].market,
            "date": max(row.date for row in req.mandi),
        }
    if n > 0:
        return {
            "status": "few_sales",
            "suggested": _rupee(median(prices)),
            "low": _rupee(prices[0]),
            "high": _rupee(prices[-1]),
            "sampleSize": n,
            "confidence": "low",
        }
    return {"status": "no_data", "sampleSize": 0}
