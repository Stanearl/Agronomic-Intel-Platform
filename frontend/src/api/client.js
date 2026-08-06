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
