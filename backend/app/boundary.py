import json
import logging
import threading
from typing import Optional

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


class CoverageBoundary:
    """
    Loads the static, pre-defined boundary GeoJSON
    (backend/data/true_boundary.geojson) into a single Shapely
    polygon/multipolygon, entirely with the lightweight `shapely` + stdlib
    `json` (no geopandas/GDAL dependency in the production API image).

    This is a hardcoded, authoritative shape — no dynamic OSM queries or
    sample-point buffering are involved — and the exact same file is used
    to clip the pre-computed PMTiles grid (backend/scripts/
    generate_soil_grid.py) and rendered as the frontend's boundary line
    (frontend/src/components/SpatialMap.jsx), so all three share the
    identical spatial envelope.

    Used to reject dropped-pin / GPS coordinates that fall outside this
    boundary before a soil health score is computed — see app/main.py's
    `/api/v1/soil-score` endpoint.
    """

    def __init__(self, boundary_path: str) -> None:
        self._boundary_path = boundary_path
        self._lock = threading.Lock()
        self._polygon: Optional[BaseGeometry] = self._load(boundary_path)

    def _load(self, boundary_path: str) -> Optional[BaseGeometry]:
        try:
            with open(boundary_path, "r", encoding="utf-8") as fh:
                geojson = json.load(fh)
        except FileNotFoundError:
            logger.warning(
                "Coverage boundary file not found at %s — out-of-bounds "
                "validation will be SKIPPED (all coordinates accepted) "
                "until backend/scripts/generate_soil_grid.py has been run "
                "at least once to produce it.",
                boundary_path,
            )
            return None
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to read coverage boundary file at %s: %s", boundary_path, exc)
            return None

        features = geojson.get("features") if isinstance(geojson, dict) else None
        if not features:
            logger.error("Coverage boundary file at %s has no features", boundary_path)
            return None

        geometries = [
            shape(feature["geometry"])
            for feature in features
            if feature.get("geometry")
        ]
        if not geometries:
            logger.error("Coverage boundary file at %s has no usable geometry", boundary_path)
            return None

        polygon = geometries[0]
        for geometry in geometries[1:]:
            polygon = polygon.union(geometry)

        logger.info("Loaded data-driven coverage boundary polygon from %s", boundary_path)
        return polygon

    def reload(self) -> None:
        with self._lock:
            self._polygon = self._load(self._boundary_path)

    @property
    def is_loaded(self) -> bool:
        return self._polygon is not None

    def contains(self, lat: float, lon: float) -> bool:
        """
        Returns True if the given lat/lon coordinate falls inside the
        data-driven coverage boundary (i.e. within the buffered sample
        envelope and NOT in Lake Victoria water bodies).

        Fails open (returns True) if the boundary file could not be
        loaded, so a missing/corrupt boundary artifact never takes the
        whole diagnostic feature down — it simply disables the
        out-of-bounds guard rail until the file is regenerated.
        """
        if self._polygon is None:
            return True

        point = shape({"type": "Point", "coordinates": [lon, lat]})
        return self._polygon.contains(point) or self._polygon.touches(point)


_coverage_boundary_instance: Optional[CoverageBoundary] = None


def get_coverage_boundary() -> CoverageBoundary:
    global _coverage_boundary_instance
    if _coverage_boundary_instance is None:
        _coverage_boundary_instance = CoverageBoundary(settings.COVERAGE_BOUNDARY_PATH)
    return _coverage_boundary_instance
