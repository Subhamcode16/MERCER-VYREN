"""
Mercer AI — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load env variables from root folder (.env) and local backend folder (backend/.env)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import connect_db, close_db
from app.utils.cache import init_redis, close_redis
from app.utils.logging import setup_logging
from app.utils.security import limiter
from app.routers import health, generate, auth, users, admin, payments, jobs, team, bots, bot_memory, bot_tasks
from app.routers.campaigns import router as campaigns_router

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Mercer AI API starting up...")
    await connect_db()
    logger.info("MongoDB connected.")
    
    await init_redis()
    logger.info("Redis initialized.")
    
    # Initialize OpenTelemetry (Console Exporter for MVP, can be swapped to OTLP later)
    provider = TracerProvider()
    processor = BatchSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    
    yield
    logger.info("Mercer AI API shutting down...")
    await close_redis()
    await close_db()


app = FastAPI(
    title="Mercer AI API",
    description="Backend for Mercer AI — AI-powered fashion creative platform",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

# Register SlowAPI
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Instrument FastAPI with OpenTelemetry
FastAPIInstrumentor.instrument_app(app)

# CORS — tighten origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:5173",
        ]
        if settings.environment == "development"
        else [settings.frontend_url]
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Idempotency-Key"],
)

# Serve ONLY uploaded asset images as static files so internal data/ ledgers remain protected
# e.g. GET /static/assets/campaign_abc/material.jpg
assets_dir = os.path.join("data", "assets")
if not os.path.exists(assets_dir):
    os.makedirs(assets_dir)
app.mount("/static/assets", StaticFiles(directory=assets_dir), name="static_assets")

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(generate.router)
app.include_router(campaigns_router)
app.include_router(payments.router)
app.include_router(jobs.router)
app.include_router(team.router)
app.include_router(bots.router)
app.include_router(bot_memory.router)
app.include_router(bot_tasks.router)

# Phase 31 & External MCP Gateways
try:
    from src.api.routes.vyren_room_routes import router as vyren_room_router
    app.include_router(vyren_room_router)
except Exception as e:
    logger.warning(f"Could not load vyren_room_router: {e}")

try:
    from src.api.routes.mcp_routes import router as mcp_router
    app.include_router(mcp_router)
except Exception as e:
    logger.warning(f"Could not load mcp_router: {e}")
