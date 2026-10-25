from fastapi import FastAPI

app = FastAPI(title="AgriConnect AI Service", version="0.1.0")


@app.get("/hello")
def hello() -> dict[str, str]:
    return {"service": "ai-service", "message": "Hello from AgriConnect AI"}
