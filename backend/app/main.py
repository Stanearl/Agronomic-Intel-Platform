import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.boundary import KisumuBoundary, get_kisumu_boundary
from app.config import get_settings
from app.data_manager import DataManager, get_data_manager
from app.rate_limiter import SlidingWindowRateLimiter
from app.soil_score import classify_band, compute_soil_health_score, find_nearest_sample

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


STATIC_TILE_PREFIXES = ("/tiles",)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if request.url.path.startswith(STATIC_TILE_PREFIXES):
            # PMTiles archives are pre-computed, infrequently regenerated
            # batch artifacts (see backend/scripts/generate_soil_grid.py)
            # — safe, and desirable for mobile performance, to let
            # browsers/CDNs cache the many small byte-range tile requests
            # PMTiles issues per pan/zoom instead of forcing a re-fetch.
            response.headers["Cache-Control"] = "public, max-age=86400"
        else:
            response.headers["Cache-Control"] = "no-store"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager = get_data_manager()
    boundary = get_kisumu_boundary()
    logger.info(
        "Startup complete: loaded %d soil records from %s; Kisumu boundary %s from %s",
        manager.record_count,
        settings.CSV_PATH,
        "loaded" if boundary.is_loaded else "NOT loaded (out-of-bounds checks disabled)",
        settings.KISUMU_BOUNDARY_PATH,
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

origins = [
    "http://localhost:3000",
    "http://localhost:8086",
    "https://dfdst.ris.africa"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # PMTiles' JS client (pmtiles.Protocol) issues HTTP Range requests
    # and inspects the Content-Range/Content-Length/Accept-Ranges/ETag
    # response headers to fetch only the relevant byte offsets inside
    # the archive. Browsers hide non-"safe-listed" response headers
    # from cross-origin JS unless the server explicitly exposes them
    # here — without this, PMTiles range requests silently fail on the
    # dfdst.ris.africa (frontend) -> dfdst-api.ris.africa (backend)
    # cross-origin deployment topology.
    expose_headers=["Content-Range", "Content-Length", "Accept-Ranges", "ETag"],
    max_age=600,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(MaxBodySizeMiddleware)
app.add_middleware(RateLimitMiddleware)

# ------------------------------------------------------------------------
# Static tile archive hosting (PMTiles)
# ------------------------------------------------------------------------
# Serves pre-computed *.pmtiles archives (e.g. soil-health.pmtiles, built
# offline by backend/scripts/generate_soil_grid.py + tippecanoe — see
# that script's docstring/trailer for the exact CLI commands) from
# settings.TILES_DIR at the /tiles/* URL prefix.
#
# Starlette's FileResponse (used internally by StaticFiles) natively
# implements HTTP Range Requests — parsing the `Range` request header,
# returning `206 Partial Content` with the correct `Content-Range` /
# `Content-Length` for the requested byte span, and advertising
# `Accept-Ranges: bytes` on every response. This is a hard requirement
# for PMTiles, whose browser client fetches small byte ranges out of the
# archive on every pan/zoom rather than downloading the whole file.
#
# check_dir=False so a fresh clone/deploy that hasn't generated any
# tiles yet doesn't crash the whole API on startup — requests for a
# missing archive simply 404 until the batch job has been run.
if not os.path.isdir(settings.TILES_DIR):
    os.makedirs(settings.TILES_DIR, exist_ok=True)

app.mount("/tiles", StaticFiles(directory=settings.TILES_DIR, check_dir=False), name="tiles")


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


@app.get("/api/v1/soil-score")
async def get_soil_score(
    lat: float = Query(..., ge=-90, le=90, description="Latitude of the dropped pin / GPS fix."),
    lon: float = Query(..., ge=-180, le=180, description="Longitude of the dropped pin / GPS fix."),
) -> Dict[str, Any]:
    """
    Authoritative, server-side soil health diagnostic for an arbitrary
    dropped-pin or GPS coordinate.

    Validates the coordinate against the pre-computed Kisumu County
    boundary polygon (see app/boundary.py) BEFORE running any
    nearest-neighbor lookup or score computation. Coordinates that
    fall in Lake Victoria or outside the supported Kisumu region are
    rejected with HTTP 400 and a structured `{"error": "out_of_bounds",
    ...}` payload instead of returning a fabricated/meaningless soil
    score, so the frontend never presents credibility-damaging data
    for unsupported locations.
    """
    boundary: KisumuBoundary = get_kisumu_boundary()

    if not boundary.contains(lat, lon):
        # Returned as a flat top-level JSON body (not wrapped in the
        # generic {"detail": ...} envelope used by http_exception_handler
        # below) so the frontend can pattern-match directly on
        # `body.error === "out_of_bounds"` — see
        # frontend/src/api/client.js::fetchSoilScore.
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "out_of_bounds",
                "message": (
                    "Location is in a water body or outside the Kisumu "
                    "supported region."
                ),
            },
        )

    manager: DataManager = get_data_manager()
    records = manager.get_all()

    result = find_nearest_sample(records, lat, lon)
    nearest_sample = result[0] if result else None
    distance_km = result[1] if result else None

    health_score = compute_soil_health_score(nearest_sample)

    return {
        "coordinates": {"lat": lat, "lon": lon},
        "out_of_bounds": False,
        "nearest_sample": nearest_sample,
        "distance_km": distance_km,
        "soil_health_score": health_score,
        "band": classify_band(health_score),
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
