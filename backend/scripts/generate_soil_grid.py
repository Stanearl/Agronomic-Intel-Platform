"""
generate_soil_grid.py
======================================================================
Offline batch pre-computation pipeline for the "weather-map-style"
continuous soil health overlay.

This script is intentionally NOT part of the FastAPI request path — it
is a standalone, manually (or cron) triggered CLI job. Soil sample
data changes weeks apart, so there is no value (and real mobile-perf
cost) in interpolating this surface on every request. Instead we:

  1. Read the 92-point pilot soils CSV (same source of truth as the
     live API — see backend/app/config.py::CSV_PATH).
  2. Compute a deterministic 0-100 composite Soil Health Score for
     every sample point, using the exact same weighted rule set as
     the frontend's `computeSoilHealthScore` (frontend/src/utils/
     agronomicRules.js) so the map overlay and the per-point
     rehabilitation diagnostics never disagree.
  3. Build a fine regular grid of square polygon cells ("mesh") that
     covers the sample envelope (bounding box + a small buffer so the
     coastline of the interpolation doesn't clip exactly at the
     outermost points).
  4. Interpolate the Soil Health Score onto every grid-cell centroid
     using Inverse Distance Weighting (IDW) over the 92 known points
     (scipy.spatial.cKDTree for the nearest-neighbor search + a
     classic 1/d^p weighting kernel — no external heavy ML deps).
  5. Load the static, pre-defined `backend/data/true_boundary.geojson`
     boundary polygon and clip the interpolated grid against it — this
     is the single authoritative geographic extent shared by the API's
     out-of-bounds validation (app/boundary.py) and the frontend's
     boundary line layer (SpatialMap.jsx). No dynamic OSM queries or
     sample-point buffering are involved.
  6. Assemble the clipped result into a geopandas GeoDataFrame and
     write it out as a single GeoJSON FeatureCollection.

The GeoJSON is a pure intermediate artifact — see the tippecanoe
instructions at the bottom of this file (also mirrored in DEPLOY.md)
for turning it into the actual `soil-health.pmtiles` archive served
by FastAPI's static mount.

Usage
-----
    python backend/scripts/generate_soil_grid.py
    python backend/scripts/generate_soil_grid.py --cell-size-deg 0.003 --power 2
    python backend/scripts/generate_soil_grid.py --csv-path /custom/soils.csv \
        --out backend/data/soil_health_grid.geojson

Dependencies (NOT part of the lean production API image — see
backend/scripts/requirements.txt): geopandas, shapely, scipy, pandas,
numpy.
"""

import argparse
import logging
import os
import sys
from typing import Tuple

import numpy as np
import pandas as pd

try:
    import geopandas as gpd
    from shapely.geometry import box
except ImportError as exc:  # pragma: no cover - guidance for operators
    raise SystemExit(
        "Missing geospatial dependencies. Install them with:\n"
        "    pip install -r backend/scripts/requirements.txt\n"
        f"Original import error: {exc}"
    )

try:
    from scipy.spatial import cKDTree
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing scipy. Install it with:\n"
        "    pip install -r backend/scripts/requirements.txt\n"
        f"Original import error: {exc}"
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("generate_soil_grid")

DEFAULT_CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "kisumu_pilot_soils.csv"
)
DEFAULT_OUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "soil_health_grid.geojson"
)

# Static, pre-defined boundary GeoJSON — the single authoritative
# geographic extent for this deployment. Loaded as-is (no OSM queries,
# no sample-point buffering) to clip the generated IDW grid, and
# consumed identically by the live API (backend/app/boundary.py) to
# validate dropped-pin coordinates. Path MUST stay in sync with
# app/config.py::COVERAGE_BOUNDARY_PATH.
DEFAULT_BOUNDARY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "true_boundary.geojson"
)

# WGS84 — matches the lat/lon already stored in kisumu_pilot_soils.csv
# and the MapLibre GL JS frontend (no reprojection needed).
CRS = "EPSG:4326"


def compute_soil_health_score(row: pd.Series) -> float:
    """
    Deterministic 0-100 composite score, mirroring
    frontend/src/utils/agronomicRules.js::computeSoilHealthScore
    exactly (four weighted pillars, 25 points each: pH, Nitrogen,
    Phosphorus, Organic Carbon) so the continuous map overlay is
    always consistent with the per-sample rehabilitation diagnostic
    shown elsewhere in the app.
    """
    score = 0.0

    ph = row.get("ph")
    if pd.notna(ph):
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

    n_pct = row.get("n_pct")
    if pd.notna(n_pct):
        score += 25 if n_pct >= 0.15 else 14 if n_pct >= 0.1 else 6

    p_ppm = row.get("p_ppm")
    if pd.notna(p_ppm):
        score += 25 if p_ppm >= 15 else 14 if p_ppm >= 8 else 6

    oc_pct = row.get("oc_pct")
    if pd.notna(oc_pct):
        score += 25 if oc_pct >= 1.5 else 14 if oc_pct >= 1.0 else 6

    return round(score, 2)


def load_samples(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()

    for col in ("latitude", "longitude", "ph", "n_pct", "p_ppm", "oc_pct"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["latitude", "longitude"]).reset_index(drop=True)
    df["soil_health_score"] = df.apply(compute_soil_health_score, axis=1)

    logger.info("Loaded %d soil sample points from %s", len(df), csv_path)
    return df


def build_grid_cells(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    cell_size_deg: float,
) -> Tuple[np.ndarray, np.ndarray, "gpd.GeoSeries"]:
    """
    Builds a fine regular mesh of square polygon cells covering the
    bounding box, returning the centroid lon/lat arrays (for IDW
    interpolation) alongside the Shapely polygon geometries (for the
    output GeoDataFrame).
    """
    lon_edges = np.arange(min_lon, max_lon + cell_size_deg, cell_size_deg)
    lat_edges = np.arange(min_lat, max_lat + cell_size_deg, cell_size_deg)

    polygons = []
    centroid_lons = []
    centroid_lats = []

    for lon in lon_edges[:-1]:
        for lat in lat_edges[:-1]:
            polygons.append(box(lon, lat, lon + cell_size_deg, lat + cell_size_deg))
            centroid_lons.append(lon + cell_size_deg / 2.0)
            centroid_lats.append(lat + cell_size_deg / 2.0)

    return np.array(centroid_lons), np.array(centroid_lats), gpd.GeoSeries(polygons, crs=CRS)


def idw_interpolate(
    known_lons: np.ndarray,
    known_lats: np.ndarray,
    known_values: np.ndarray,
    query_lons: np.ndarray,
    query_lats: np.ndarray,
    power: float = 2.0,
    k_neighbors: int = 10,
) -> np.ndarray:
    """
    Classic Inverse Distance Weighting: each grid-cell centroid's
    interpolated value is a weighted average of the k nearest known
    sample points, weighted by 1 / distance^power. Falls back to an
    exact match (weight = 1) if a query point coincides with a known
    sample. Uses scipy's cKDTree for O(log n) nearest-neighbor
    lookups, which comfortably scales past the current 92-point
    pilot dataset for future province-wide rollouts.
    """
    known_points = np.column_stack([known_lons, known_lats])
    tree = cKDTree(known_points)

    k = min(k_neighbors, len(known_points))
    query_points = np.column_stack([query_lons, query_lats])
    distances, indices = tree.query(query_points, k=k)

    if k == 1:
        distances = distances[:, np.newaxis]
        indices = indices[:, np.newaxis]

    # Avoid division by zero when a grid centroid lands exactly on a
    # known sample coordinate.
    zero_distance_mask = distances < 1e-12
    distances = np.where(zero_distance_mask, 1e-12, distances)

    weights = 1.0 / np.power(distances, power)
    neighbor_values = known_values[indices]

    weighted_sum = np.sum(weights * neighbor_values, axis=1)
    weight_total = np.sum(weights, axis=1)
    interpolated = weighted_sum / weight_total

    # Where a query point is an exact match, force the exact known value.
    exact_match_rows = np.any(zero_distance_mask, axis=1)
    if np.any(exact_match_rows):
        exact_indices = indices[exact_match_rows, 0]
        interpolated[exact_match_rows] = known_values[exact_indices]

    return interpolated


def classify_band(score: float) -> str:
    """Mirrors frontend/src/utils/agronomicRules.js::getHealthScoreBand."""
    if score >= 70:
        return "Healthy"
    if score >= 45:
        return "Moderate Risk"
    return "Degraded"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a continuous IDW-interpolated soil health polygon grid GeoJSON."
    )
    parser.add_argument("--csv-path", default=DEFAULT_CSV_PATH, help="Path to the pilot soils CSV.")
    parser.add_argument("--out", default=DEFAULT_OUT_PATH, help="Output GeoJSON file path.")
    parser.add_argument(
        "--boundary-path",
        default=DEFAULT_BOUNDARY_PATH,
        help="Path to the static, pre-defined boundary GeoJSON used to clip the grid.",
    )
    parser.add_argument(
        "--cell-size-deg",
        type=float,
        default=0.0015,
        help=(
            "Grid cell edge length in decimal degrees (~0.0015 deg ~= 165m "
            "at this latitude). Kept small/high-resolution so the clipped "
            "overlay renders as a smooth gradient rather than a coarse, "
            "visibly 'cubical' grid once zoomed in."
        ),
    )
    parser.add_argument(
        "--buffer-deg",
        type=float,
        default=0.03,
        help="Buffer (in decimal degrees) added around the sample bounding box.",
    )
    parser.add_argument("--power", type=float, default=2.0, help="IDW distance exponent.")
    parser.add_argument("--k-neighbors", type=int, default=10, help="Number of nearest neighbors used by IDW.")
    args = parser.parse_args()

    samples = load_samples(args.csv_path)

    # Load the static, pre-defined boundary GeoJSON — no dynamic OSM
    # queries or sample-point buffering. This is the single
    # authoritative geographic extent for the IDW grid clip, the API's
    # out-of-bounds validation, and the frontend boundary line.
    boundary_gdf = gpd.read_file("backend/data/true_boundary.geojson")

    tiles_boundary_path = os.path.join(
        os.path.dirname(args.boundary_path), "tiles", "true_boundary.geojson"
    )
    os.makedirs(os.path.dirname(tiles_boundary_path), exist_ok=True)
    boundary_gdf.to_file(tiles_boundary_path, driver="GeoJSON")
    logger.info("Copied static boundary to %s", tiles_boundary_path)

    min_lon = samples["longitude"].min() - args.buffer_deg
    max_lon = samples["longitude"].max() + args.buffer_deg
    min_lat = samples["latitude"].min() - args.buffer_deg
    max_lat = samples["latitude"].max() + args.buffer_deg

    logger.info(
        "Interpolation envelope: lon [%.5f, %.5f], lat [%.5f, %.5f]",
        min_lon, max_lon, min_lat, max_lat,
    )

    centroid_lons, centroid_lats, cell_polygons = build_grid_cells(
        min_lon, min_lat, max_lon, max_lat, args.cell_size_deg
    )
    logger.info("Generated %d grid cells (pre-clip bounding-box mesh)", len(cell_polygons))

    interpolated_scores = idw_interpolate(
        known_lons=samples["longitude"].to_numpy(),
        known_lats=samples["latitude"].to_numpy(),
        known_values=samples["soil_health_score"].to_numpy(),
        query_lons=centroid_lons,
        query_lats=centroid_lats,
        power=args.power,
        k_neighbors=args.k_neighbors,
    )

    grid = gpd.GeoDataFrame(
        {
            "soil_health_score": np.round(interpolated_scores, 2),
            "band": [classify_band(s) for s in interpolated_scores],
        },
        geometry=cell_polygons,
        crs=CRS,
    )

    # ------------------------------------------------------------------
    # Geographic masking: clip the rectangular IDW mesh down to the
    # static, pre-defined true_boundary.geojson polygon. This gives the
    # overlay's outer edge the exact real-world boundary shape instead
    # of a jagged, stair-stepped grid boundary. geopandas.clip()
    # intersects each cell polygon against the boundary — cells fully
    # outside are dropped, cells straddling the boundary are sliced to
    # the exact intersection geometry.
    # ------------------------------------------------------------------
    pre_clip_count = len(grid)
    grid = gpd.clip(grid, boundary_gdf[["geometry"]])
    grid = grid.reset_index(drop=True)
    logger.info(
        "Clipped grid to the static true_boundary polygon: %d -> %d cells "
        "(%d cells removed — outside the boundary)",
        pre_clip_count,
        len(grid),
        pre_clip_count - len(grid),
    )

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    grid.to_file(args.out, driver="GeoJSON")
    logger.info("Wrote %d interpolated grid cells to %s", len(grid), args.out)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logger.exception("generate_soil_grid.py failed")
        sys.exit(1)


# ======================================================================
# Converting the output GeoJSON into soil-health.pmtiles
# ======================================================================
#
# This step is deliberately NOT automated inside this script — tippecanoe
# is a compiled C++ tool with no first-class Python bindings, and running
# it as a one-off Docker/CLI command keeps this script's own dependency
# footprint (geopandas/scipy/shapely) isolated from the tiling toolchain.
#
# Option A — Docker (no local tippecanoe install required; recommended
# for the Hetzner production server, run from the repo root):
#
#   mkdir -p backend/data/tiles
#   docker run --rm -v "$(pwd)/backend/data:/data" \
#     ghcr.io/felt/tippecanoe:latest \
#     tippecanoe -zg --projection=EPSG:4326 \
#       -o /data/tiles/soil-health.pmtiles \
#       -l soil_health \
#       --drop-densest-as-needed \
#       --extend-zooms-if-still-dropping \
#       -f \
#       /data/soil_health_grid.geojson
#
# Option B — Natively installed tippecanoe (>= 2.17, which added direct
# PMTiles output via `-o file.pmtiles`, e.g. via `apt-get`/`brew install
# tippecanoe` or building github.com/felt/tippecanoe from source):
#
#   mkdir -p backend/data/tiles
#   tippecanoe -zg --projection=EPSG:4326 \
#     -o backend/data/tiles/soil-health.pmtiles \
#     -l soil_health \
#     --drop-densest-as-needed \
#     --extend-zooms-if-still-dropping \
#     -f \
#     backend/data/soil_health_grid.geojson
#
# backend/data/tiles/ is exactly the directory served statically by
# FastAPI at the /tiles URL prefix (settings.TILES_DIR in app/config.py),
# so soil-health.pmtiles becomes reachable at:
#   http://<backend-host>/tiles/soil-health.pmtiles
#
# Flags explained:
#   -zg                                Auto-choose a sensible max zoom
#                                        for this data's precision.
#   --projection=EPSG:4326              Input GeoJSON is plain lon/lat.
#   -o soil-health.pmtiles              Direct PMTiles output (no
#                                        separate mbtiles -> pmtiles
#                                        conversion step needed).
#   -l soil_health                      Vector tile layer name — this
#                                        exact string must match the
#                                        "source-layer" configured on
#                                        the frontend's fill layer.
#   --drop-densest-as-needed            Keeps tiles under the 500KB
#                                        limit by thinning the densest
#                                        areas first (safe for a
#                                        continuous fill grid).
#   --extend-zooms-if-still-dropping    Push maxzoom higher instead of
#                                        dropping features, when
#                                        possible.
#   -f                                   Overwrite any existing output.
#
# Move (or docker cp) the resulting backend/data/soil-health.pmtiles into
# place, then restart/redeploy the backend container so it's picked up
# by the StaticFiles mount configured in backend/app/main.py.
