import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.data_manager import DataManager, get_data_manager
from app.rate_limiter import SlidingWindowRateLimiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agronomic_intel_api")

settings = get_settings()

rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.RATE_LIMIT_MAX_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)

RATE_LIMITED_PREFIXES = ("/api/v1/soils",)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(RATE_LIMITED_PREFIXES):
            client_ip = _client_ip(request)
            if not rate_limiter.is_allowed(client_ip):
                retry_after = rate_limiter.retry_after(client_ip)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Rate limit exceeded. Max "
                        f"{settings.RATE_LIMIT_MAX_REQUESTS} requests per "
                        f"{int(settings.RATE_LIMIT_WINDOW_SECONDS)}s per IP."
                    },
                    headers={"Retry-After": str(int(retry_after) + 1)},
                )
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_MAX_REQUESTS)
            response.headers["X-RateLimit-Remaining"] = str(rate_limiter.remaining(client_ip))
            return response
        return await call_next(request)


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > settings.MAX_PAYLOAD_BYTES:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Payload too large."},
                    )
            except ValueError:
                pass
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Cache-Control"] = "no-store"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager = get_data_manager()
    logger.info(
        "Startup complete: loaded %d soil records from %s",
        manager.record_count,
        settings.CSV_PATH,
    )
    yield
    logger.info("Shutting down Agronomic Intel Platform API")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=settings.ALLOWED_METHODS,
    allow_headers=settings.ALLOWED_HEADERS,
    max_age=600,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(MaxBodySizeMiddleware)
app.add_middleware(RateLimitMiddleware)


def _parse_filter_bounds(
    query_params: Dict[str, str], metric_columns: List[str]
) -> Dict[str, Dict[str, float]]:
    bounds: Dict[str, Dict[str, float]] = {}

    for raw_key, raw_value in query_params.items():
        for suffix, bound_type in (("_min", "min"), ("_max", "max")):
            if raw_key.endswith(suffix):
                metric = raw_key[: -len(suffix)]
                if metric not in metric_columns:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Unknown metric '{metric}' in query parameter "
                            f"'{raw_key}'. Valid metrics: {metric_columns}"
                        ),
                    )
                try:
                    parsed_value = float(raw_value)
                except (TypeError, ValueError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid numeric value for '{raw_key}': '{raw_value}'",
                    )
                bounds.setdefault(metric, {})[bound_type] = parsed_value
                break

    return bounds


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    manager = get_data_manager()
    return {"status": "ok", "records_loaded": manager.record_count}


@app.get("/api/v1/soils")
async def get_soils() -> List[Dict[str, Any]]:
    manager: DataManager = get_data_manager()
    return manager.get_all()


@app.get("/api/v1/soils/filter")
async def filter_soils(request: Request) -> List[Dict[str, Any]]:
    manager: DataManager = get_data_manager()
    metric_columns = manager.metric_columns

    query_params = dict(request.query_params)
    bounds = _parse_filter_bounds(query_params, metric_columns)

    if not bounds:
        return manager.get_all()

    return manager.filter(bounds)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
