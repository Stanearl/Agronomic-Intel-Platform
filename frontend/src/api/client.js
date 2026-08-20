const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchSoilRecords() {
  const response = await fetch(`${API_BASE_URL}/api/v1/soils`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Soil records request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * fetchSoilScore
 * Authoritative, server-side soil health diagnostic for an arbitrary
 * dropped-pin or GPS coordinate — see backend/app/main.py's
 * `/api/v1/soil-score` endpoint. The backend validates the coordinate
 * against the real Kisumu County boundary polygon (excluding Lake
 * Victoria) BEFORE computing anything.
 *
 * Rejects (throws) with a structured error carrying
 * `error.code === "out_of_bounds"` when the backend responds with its
 * dedicated `{"error": "out_of_bounds", "message": ...}` HTTP 400
 * payload, so callers can distinguish "no supported data here" from
 * a genuine network/server failure and surface a clean "Location out
 * of range" notification instead of a fabricated soil score.
 */
export async function fetchSoilScore(lat, lon) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/soil-score?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    { headers: { Accept: "application/json" } }
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (body && body.error === "out_of_bounds") {
      const error = new Error(
        body.message || "Location is in a water body or outside the Kisumu supported region."
      );
      error.code = "out_of_bounds";
      throw error;
    }

    const error = new Error(`Soil score request failed with status ${response.status}`);
    error.code = "request_failed";
    throw error;
  }

  return body;
}
