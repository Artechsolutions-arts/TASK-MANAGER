from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1 import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB but don't fail app if DB unreachable (so healthcheck can pass)
    try:
        await init_db()
        logger.info("MongoDB connection initialized")
    except Exception as e:
        logger.exception("MongoDB init failed (app will start anyway): %s", e)
    yield
    # Shutdown
    await close_db()
    logger.info("MongoDB connection closed")


app = FastAPI(
    title="Enterprise Task Management System",
    description="Production-ready task and project management API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware - MUST be added before other middleware
# Ensure CORS_ORIGINS is a list
cors_origins = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    cors_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
elif not isinstance(cors_origins, list):
    cors_origins = ["http://localhost:5173", "http://localhost:3000"]

# Print for debugging
print(f"CORS Origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.add_middleware(GZipMiddleware)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers"""
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


@app.get("/health")
async def health_check():
    """Liveness: is the process up? Always 200 so Railway/load balancers don't kill the container."""
    return {"status": "ok"}


@app.get("/ready")
async def readiness_check():
    """Readiness: can the app serve traffic (DB, optional Redis)."""
    from app.core.database import mongodb_client
    try:
        if mongodb_client:
            await mongodb_client.admin.command("ping")
    except Exception as e:
        logger.warning("Readiness DB check failed: %s", e)
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "reason": "database", "detail": str(e)},
        )
    return JSONResponse(content={"status": "ready", "database": "ok"})


@app.get("/")
async def root():
    return {"message": "Enterprise Task Management System API"}
