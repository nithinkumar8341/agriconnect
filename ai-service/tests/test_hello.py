from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_hello_returns_greeting():
    res = client.get("/hello")

    assert res.status_code == 200
    assert res.json() == {"service": "ai-service", "message": "Hello from AgriConnect AI"}
