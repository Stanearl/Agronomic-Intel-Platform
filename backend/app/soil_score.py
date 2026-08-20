import math
from typing import Any, Dict, List, Optional, Tuple

# Pure-stdlib Haversine great-circle distance + composite Soil Health
# Score implementation — the server-side twin of
# frontend/src/utils/geoUtils.js::haversineDistanceKm /
# findNearestSample and frontend/src/utils/agronomicRules.js::
# computeSoilHealthScore / getHealthScoreBand. Kept perfectly in sync
# with those weighted rule sets (and with backend/scripts/
# generate_soil_grid.py::compute_soil_health_score, used to build the
# PMTiles overlay) so a dropped pin's authoritative backend-computed
# score always agrees with the client-side numbers shown elsewhere in
# the app.

EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    r_lat1 = math.radians(lat1)
    r_lat2 = math.radians(lat2)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def find_nearest_sample(
    records: List[Dict[str, Any]], lat: float, lon: float
) -> Optional[Tuple[Dict[str, Any], float]]:
    """
    Scans the full soil sample dataset and returns the single closest
    verified record to the supplied coordinate, along with the
    Haversine distance in kilometers. Returns None if no samples with
    valid coordinates are available.
    """
    nearest: Optional[Dict[str, Any]] = None
    min_distance = math.inf

    for record in records:
        s_lat = record.get("latitude")
        s_lon = record.get("longitude")
        if s_lat is None or s_lon is None:
            continue
        try:
            distance = haversine_distance_km(lat, lon, float(s_lat), float(s_lon))
        except (TypeError, ValueError):
            continue
        if distance < min_distance:
            min_distance = distance
            nearest = record

    if nearest is None:
        return None
    return nearest, min_distance


def compute_soil_health_score(sample: Optional[Dict[str, Any]]) -> Optional[float]:
    """
    Deterministic 0-100 composite score, mirroring
    frontend/src/utils/agronomicRules.js::computeSoilHealthScore
    exactly (four weighted pillars, 25 points each: pH, Nitrogen,
    Phosphorus, Organic Carbon).
    """
    if not sample:
        return None

    score = 0.0

    ph = sample.get("ph")
    if ph is not None:
        ph = float(ph)
        if 5.5 <= ph <= 6.5:
            score += 25
        elif 6.5 < ph <= 7.5:
            score += 20
        elif 5.0 <= ph < 5.5:
            score += 15
        elif 7.5 < ph <= 8.0:
            score += 15
        else:
            score += 8

    n_pct = sample.get("n_pct")
    if n_pct is not None:
        n_pct = float(n_pct)
        score += 25 if n_pct >= 0.15 else 14 if n_pct >= 0.1 else 6

    p_ppm = sample.get("p_ppm")
    if p_ppm is not None:
        p_ppm = float(p_ppm)
        score += 25 if p_ppm >= 15 else 14 if p_ppm >= 8 else 6

    oc_pct = sample.get("oc_pct")
    if oc_pct is not None:
        oc_pct = float(oc_pct)
        score += 25 if oc_pct >= 1.5 else 14 if oc_pct >= 1.0 else 6

    return round(score)


def classify_band(score: Optional[float]) -> str:
    """Mirrors frontend/src/utils/agronomicRules.js::getHealthScoreBand."""
    if score is None:
        return "No Data"
    if score >= 70:
        return "Healthy"
    if score >= 45:
        return "Moderate Risk"
    return "Degraded — Action Required"
