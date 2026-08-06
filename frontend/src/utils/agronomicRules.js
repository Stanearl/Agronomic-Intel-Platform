// Soil Rehabilitation & Agronomic Prescription Engine
// -----------------------------------------------------------------
// Pure, deterministic technical rule set. No ML, no external calls —
// every recommendation is derived directly from published agronomic
// guidance thresholds for pH, Nitrogen, Phosphorus and Organic
// Carbon. This module is intentionally framework-agnostic (plain JS)
// so the same rules can be reused server-side if the engine is later
// ported to the FastAPI backend.

export const SEVERITY = {
  HIGH: "high", // red — requires immediate corrective input
  MEDIUM: "medium", // amber — moderate improvement recommended
  GOOD: "good", // green — within/near optimal range, maintain
};

/**
 * evaluatePh
 * pH < 5.5            -> Acidic, high priority liming
 * 5.5 <= pH <= 7.5     -> Optimal / acceptable range
 * pH > 7.5             -> Alkaline, gypsum/sulfur guidance
 */
export function evaluatePh(ph) {
  const value = Number(ph);
  if (Number.isNaN(value)) return null;

  if (value < 5.5) {
    return {
      id: "ph-acidic",
      metric: "ph",
      label: "Soil pH",
      value,
      severity: SEVERITY.HIGH,
      title: "Acidic Soil — High Priority",
      message:
        "High Priority: Apply 2.0 - 2.5 Tonnes/ha of Agricultural Lime (CaCO3) prior to land preparation to neutralize soil acidity and increase nutrient uptake efficiency.",
    };
  }

  if (value > 7.5) {
    return {
      id: "ph-alkaline",
      metric: "ph",
      label: "Soil pH",
      value,
      severity: SEVERITY.HIGH,
      title: "Alkaline Soil",
      message:
        "Alkaline Soil: Avoid liming. Apply Agricultural Gypsum or elemental sulfur if sodium levels are high.",
    };
  }

  return {
    id: "ph-optimal",
    metric: "ph",
    label: "Soil pH",
    value,
    severity: SEVERITY.GOOD,
    title: "Optimal pH Range",
    message:
      "Optimal Range: Maintain current soil management. Use non-acidifying fertilizers such as CAN or NPK blends.",
  };
}

/**
 * evaluateNitrogen
 * n_pct < 0.15  -> Deficient, Urea/CAN split application
 * n_pct >= 0.15 -> Adequate, maintenance dosage
 */
export function evaluateNitrogen(nPct) {
  const value = Number(nPct);
  if (Number.isNaN(value)) return null;

  if (value < 0.15) {
    return {
      id: "n-deficient",
      metric: "n_pct",
      label: "Total Nitrogen",
      value,
      severity: SEVERITY.HIGH,
      title: "Nitrogen Deficient",
      message:
        "Nitrogen Deficient: Apply Urea (46% N) at 150 kg/ha or CAN at 200 kg/ha in split applications during peak vegetative growth.",
    };
  }

  return {
    id: "n-adequate",
    metric: "n_pct",
    label: "Total Nitrogen",
    value,
    severity: SEVERITY.GOOD,
    title: "Sufficient Nitrogen",
    message: "Sufficient Nitrogen: Maintain baseline maintenance fertilizer applications.",
  };
}

/**
 * evaluatePhosphorus
 * p_ppm < 15  -> Low, DAP/TSP at planting
 * p_ppm >= 15 -> Adequate, standard maintenance dosage
 */
export function evaluatePhosphorus(pPpm) {
  const value = Number(pPpm);
  if (Number.isNaN(value)) return null;

  if (value < 15) {
    return {
      id: "p-low",
      metric: "p_ppm",
      label: "Available Phosphorus",
      value,
      severity: SEVERITY.HIGH,
      title: "Low Phosphorus",
      message:
        "Low Phosphorus: Apply DAP (18-46-0) at 150 kg/ha or TSP at planting near root zones.",
    };
  }

  return {
    id: "p-adequate",
    metric: "p_ppm",
    label: "Available Phosphorus",
    value,
    severity: SEVERITY.GOOD,
    title: "Adequate Phosphorus",
    message: "Adequate Phosphorus: Standard maintenance dosage of compound fertilizer.",
  };
}

/**
 * evaluateOrganicCarbon
 * oc_pct < 1.5  -> Low, incorporate organic amendments
 * oc_pct >= 1.5 -> Adequate structure / CEC support
 */
export function evaluateOrganicCarbon(ocPct) {
  const value = Number(ocPct);
  if (Number.isNaN(value)) return null;

  if (value < 1.5) {
    return {
      id: "oc-low",
      metric: "oc_pct",
      label: "Organic Carbon",
      value,
      severity: SEVERITY.MEDIUM,
      title: "Low Organic Matter",
      message:
        "Low Organic Matter: Incorporate filter mud, sugarcane trash, or organic compost at 5 - 10 Tonnes/ha to improve soil structure and CEC.",
    };
  }

  return {
    id: "oc-adequate",
    metric: "oc_pct",
    label: "Organic Carbon",
    value,
    severity: SEVERITY.GOOD,
    title: "Adequate Organic Matter",
    message:
      "Adequate Organic Matter: Current organic carbon levels support healthy soil structure and cation exchange capacity.",
  };
}

const SEVERITY_ORDER = { high: 0, medium: 1, good: 2 };

/**
 * generateAgronomicRecommendations
 * Runs the full technical rule set against a single soil sample
 * record and returns a severity-sorted list of prescription cards
 * (high-priority interventions surfaced first).
 */
export function generateAgronomicRecommendations(sample) {
  if (!sample) return [];

  const results = [
    evaluatePh(sample.ph),
    evaluateNitrogen(sample.n_pct),
    evaluatePhosphorus(sample.p_ppm),
    evaluateOrganicCarbon(sample.oc_pct),
  ].filter(Boolean);

  return results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/**
 * computeSoilHealthScore
 * Deterministic 0–100 composite score built from four weighted
 * pillars (pH, Nitrogen, Phosphorus, Organic Carbon — 25 points
 * each). Pure lookup-table logic, no statistical modeling.
 */
export function computeSoilHealthScore(sample) {
  if (!sample) return null;

  let score = 0;

  const ph = Number(sample.ph);
  if (!Number.isNaN(ph)) {
    if (ph >= 5.5 && ph <= 6.5) score += 25;
    else if (ph > 6.5 && ph <= 7.5) score += 20;
    else if (ph < 5.5 && ph >= 5.0) score += 15;
    else if (ph > 7.5 && ph <= 8.0) score += 15;
    else score += 8;
  }

  const n = Number(sample.n_pct);
  if (!Number.isNaN(n)) {
    score += n >= 0.15 ? 25 : n >= 0.1 ? 14 : 6;
  }

  const p = Number(sample.p_ppm);
  if (!Number.isNaN(p)) {
    score += p >= 15 ? 25 : p >= 8 ? 14 : 6;
  }

  const oc = Number(sample.oc_pct);
  if (!Number.isNaN(oc)) {
    score += oc >= 1.5 ? 25 : oc >= 1.0 ? 14 : 6;
  }

  return Math.round(score);
}

/**
 * getHealthScoreBand
 * Maps a 0–100 score to a light-mode severity tone used for badge
 * styling in the Rehabilitation drawer.
 */
export function getHealthScoreBand(score) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return { label: "No Data", tone: "neutral" };
  }
  if (score >= 70) return { label: "Healthy", tone: "good" };
  if (score >= 45) return { label: "Moderate Risk", tone: "medium" };
  return { label: "Degraded — Action Required", tone: "high" };
}
