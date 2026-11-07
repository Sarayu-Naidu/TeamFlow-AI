import logging
logging.basicConfig(level=logging.DEBUG)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import router
from app.database import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    debug=True,
    title="TeamFlow AI",
    description="AI-powered project management backend",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router)


@app.get("/")
def home():
    return {"message": "TeamFlow AI backend is running!"}