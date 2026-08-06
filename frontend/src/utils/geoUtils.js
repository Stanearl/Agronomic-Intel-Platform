// Geospatial utility helpers used for the interactive Pin-Drop /
// GPS "Use My Location" workflow on the SpatialMap. Implements the
// classic Haversine great-circle distance formula (no external
// mapping SDK required — pure math, zero dependencies) to locate the
// nearest verified soil sample to any arbitrary map coordinate.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Kisumu County Data Coverage boundary box. Any diagnostic request
 * (pin drop or GPS "Use My Location") outside this envelope falls
 * back to the "Out of Regional Data Coverage" state rather than
 * attempting a nearest-neighbor lookup against the regional dataset.
 */
export const KISUMU_BOUNDS = {
  minLat: -0.35,
  maxLat: 0.15,
  minLon: 34.35,
  maxLon: 35.25,
};

export const KISUMU_CENTROID = { lat: -0.1022, lon: 34.7617 };

export const KISUMU_MAX_RADIUS_KM = 45;


/**
 * haversineDistanceKm
 * Returns the great-circle distance, in kilometers, between two
 * lat/lng coordinate pairs.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    [lat1, lon1, lat2, lon2].some(
      (v) => v === null || v === undefined || Number.isNaN(Number(v))
    )
  ) {
    return Infinity;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * findNearestSample
 * Scans the full soil sample dataset and returns the single closest
 * verified record to the supplied coordinate, along with the
 * Haversine distance in kilometers. Returns null if no samples with
 * valid coordinates are available.
 */
export function findNearestSample(samples, lat, lng) {
  if (!Array.isArray(samples) || samples.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const sample of samples) {
    const sLat = Number(sample.latitude);
    const sLng = Number(sample.longitude);
    if (Number.isNaN(sLat) || Number.isNaN(sLng)) continue;

    const distance = haversineDistanceKm(lat, lng, sLat, sLng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = sample;
    }
  }

  if (!nearest) return null;

  return { sample: nearest, distanceKm: minDistance };
}

/**
 * isWithinKisumuCoverage
 * Determines whether a given lat/lon coordinate falls inside the
 * Kisumu County Data Coverage envelope — a bounding box intersected
 * with a 45km radius cap around the Kisumu centroid. Coordinates
 * outside this envelope are considered unsupported for nearest-
 * neighbor agronomic lookups against the regional pilot dataset.
 */
export function isWithinKisumuCoverage(lat, lon) {
  const numLat = Number(lat);
  const numLon = Number(lon);

  if (Number.isNaN(numLat) || Number.isNaN(numLon)) return false;

  const withinBoundingBox =
    numLat >= KISUMU_BOUNDS.minLat &&
    numLat <= KISUMU_BOUNDS.maxLat &&
    numLon >= KISUMU_BOUNDS.minLon &&
    numLon <= KISUMU_BOUNDS.maxLon;

  if (!withinBoundingBox) return false;

  const distanceFromCentroidKm = haversineDistanceKm(
    numLat,
    numLon,
    KISUMU_CENTROID.lat,
    KISUMU_CENTROID.lon
  );

  return distanceFromCentroidKm <= KISUMU_MAX_RADIUS_KM;
}

/**
 * formatDistance
 * Human-readable distance label, e.g. "1.4 km away" or "180 m away"
 * for very short ranges.
 */
export function formatDistance(distanceKm) {

  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) {
    return "—";
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
