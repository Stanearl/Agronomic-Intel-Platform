// Central configuration for the 13 core soil metrics exposed by the
// backend FILTERABLE_METRICS contract. Each entry defines the slider
// bounds, unit label, decimal precision and the optimal agronomic
// band used for map marker color coding and breakdown analytics.

export const METRICS = [
  { key: "ph", label: "Soil pH", unit: "", min: 3.5, max: 9.5, step: 0.01, precision: 2, optimalMin: 6.0, optimalMax: 7.0 },
  { key: "ec", label: "Electrical Conductivity", unit: "dS/m", min: 0, max: 3, step: 0.01, precision: 2, optimalMin: 0, optimalMax: 0.8 },
  { key: "n_pct", label: "Total Nitrogen", unit: "%", min: 0, max: 1, step: 0.01, precision: 2, optimalMin: 0.2, optimalMax: 0.5 },
  { key: "oc_pct", label: "Organic Carbon", unit: "%", min: 0, max: 5, step: 0.01, precision: 2, optimalMin: 2.0, optimalMax: 4.0 },
  { key: "ca", label: "Exchangeable Calcium", unit: "cmol/kg", min: 0, max: 20, step: 0.1, precision: 2, optimalMin: 5, optimalMax: 12 },
  { key: "mg", label: "Exchangeable Magnesium", unit: "cmol/kg", min: 0, max: 10, step: 0.1, precision: 2, optimalMin: 1.5, optimalMax: 5 },
  { key: "k", label: "Exchangeable Potassium", unit: "cmol/kg", min: 0, max: 3, step: 0.01, precision: 2, optimalMin: 0.3, optimalMax: 1.5 },
  { key: "p_ppm", label: "Available Phosphorus", unit: "ppm", min: 0, max: 200, step: 1, precision: 1, optimalMin: 15, optimalMax: 45 },
  { key: "fe", label: "Available Iron", unit: "ppm", min: 0, max: 150, step: 1, precision: 2, optimalMin: 10, optimalMax: 55 },
  { key: "zn", label: "Available Zinc", unit: "ppm", min: 0, max: 10, step: 0.1, precision: 2, optimalMin: 1, optimalMax: 5 },
  { key: "mn", label: "Available Manganese", unit: "ppm", min: 0, max: 200, step: 1, precision: 1, optimalMin: 20, optimalMax: 110 },
  { key: "cu", label: "Available Copper", unit: "ppm", min: 0, max: 5, step: 0.01, precision: 2, optimalMin: 0.5, optimalMax: 2 },
  { key: "cec", label: "Cation Exchange Capacity", unit: "cmol/kg", min: 0, max: 40, step: 0.1, precision: 1, optimalMin: 10, optimalMax: 25 },
];

export const METRIC_GROUPS = [
  {
    title: "Core Chemical Properties",
    metrics: ["ph", "ec", "cec", "oc_pct", "n_pct"],
  },
  {
    title: "Macronutrients",
    metrics: ["ca", "mg", "k", "p_ppm"],
  },
  {
    title: "Micronutrients",
    metrics: ["fe", "zn", "mn", "cu"],
  },
];

// Quick-toggle presets surfaced in the compact FilterControls panel.
// Each preset snaps a single metric to a diagnostic sub-range.
export const QUICK_TOGGLES = [
  { key: "ph_acidic", metric: "ph", label: "Acidic (pH < 5.5)", range: { min: 3.5, max: 5.49 } },
  { key: "ph_optimal", metric: "ph", label: "Optimal pH", range: { min: 6.0, max: 7.0 } },
  { key: "n_deficient", metric: "n_pct", label: "N Deficient", range: { min: 0, max: 0.149 } },
  { key: "p_low", metric: "p_ppm", label: "Low Phosphorus", range: { min: 0, max: 14.9 } },
];

// Agronomic diagnostic thresholds used for KPI cards + breakdown charts.
export const THRESHOLDS = {
  ph: { acidicMax: 5.5, alkalineMin: 7.5 },
  n_pct: { deficientMax: 0.15, moderateMax: 0.25 },
  p_ppm: { deficientMax: 15, moderateMax: 30 },
  k: { deficientMax: 0.2, moderateMax: 0.5 },
};

export function getMetricConfig(key) {
  return METRICS.find((m) => m.key === key);
}

export function buildDefaultFilters() {
  const filters = {};
  METRICS.forEach((m) => {
    filters[m.key] = { min: m.min, max: m.max };
  });
  return filters;
}

export function formatMetricValue(value, precision = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return Number(value).toFixed(precision);
}
