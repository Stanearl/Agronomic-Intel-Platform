import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { THRESHOLDS } from "../constants/metrics";

const COLOR_RED = "#B91C1C";
const COLOR_AMBER = "#B45309";
const COLOR_GREEN = "#15803D";
const GRID_STROKE = "#E2E8F0";
const AXIS_COLOR = "#64748B";

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 2,
  fontSize: 11,
  color: "#0F172A",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
};

function ChartCard({ title, subtitle, children, height = 168 }) {
  return (
    <div className="rounded-sm border border-border bg-surface">
      <div className="border-b border-border px-3.5 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div style={{ height }} className="px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function computePhBreakdown(records) {
  let acidic = 0;
  let optimal = 0;
  let alkaline = 0;

  records.forEach((row) => {
    const ph = Number(row.ph);
    if (Number.isNaN(ph)) return;
    if (ph < THRESHOLDS.ph.acidicMax) acidic += 1;
    else if (ph >= THRESHOLDS.ph.alkalineMin) alkaline += 1;
    else optimal += 1;
  });

  return [
    { band: "Acidic", count: acidic, color: COLOR_RED },
    { band: "Optimal", count: optimal, color: COLOR_GREEN },
    { band: "Alkaline", count: alkaline, color: COLOR_AMBER },
  ];
}

function bandCounts(records, key, deficientMax, moderateMax) {
  let deficient = 0;
  let moderate = 0;
  let adequate = 0;

  records.forEach((row) => {
    const value = Number(row[key]);
    if (Number.isNaN(value)) return;
    if (value < deficientMax) deficient += 1;
    else if (value < moderateMax) moderate += 1;
    else adequate += 1;
  });

  return { deficient, moderate, adequate };
}

function computeNutrientDeficiency(records) {
  const n = bandCounts(records, "n_pct", THRESHOLDS.n_pct.deficientMax, THRESHOLDS.n_pct.moderateMax);
  const p = bandCounts(records, "p_ppm", THRESHOLDS.p_ppm.deficientMax, THRESHOLDS.p_ppm.moderateMax);
  const k = bandCounts(records, "k", THRESHOLDS.k.deficientMax, THRESHOLDS.k.moderateMax);

  return [
    { nutrient: "Nitrogen (N)", ...n },
    { nutrient: "Phosphorus (P)", ...p },
    { nutrient: "Potassium (K)", ...k },
  ];
}

/**
 * AgronomicAnalytics
 * GLOMIP-style horizontal bar breakdown analytics rendered directly
 * beneath the filter controls. Chart 1 shows the pH distribution
 * breakdown (Acidic / Optimal / Alkaline field counts). Chart 2 shows
 * a stacked horizontal nutrient deficiency summary for N, P and K
 * across Deficient / Moderate / Adequate bands. Colors map strictly
 * to the functional agronomic accent palette (green / amber / red).
 */
export default function AgronomicAnalytics({ records }) {
  const phData = useMemo(() => computePhBreakdown(records), [records]);
  const nutrientData = useMemo(() => computeNutrientDeficiency(records), [records]);

  return (
    <div className="flex flex-col gap-3">
      <ChartCard
        title="pH Distribution Breakdown"
        subtitle="Acidic vs. Optimal vs. Alkaline field counts"
      >
        <BarChart
          data={phData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          barCategoryGap={16}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="band"
            tick={{ fill: "#0F172A", fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            width={64}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F1F5F9" }} />
          <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={22}>
            {phData.map((entry) => (
              <Cell key={entry.band} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Nutrient Deficiency Summary"
        subtitle="Deficient / Moderate / Adequate field counts by nutrient"
        height={188}
      >
        <BarChart
          data={nutrientData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          barCategoryGap={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nutrient"
            tick={{ fill: "#0F172A", fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            width={92}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F1F5F9" }} />
          <Bar dataKey="deficient" stackId="nutrient" fill={COLOR_RED} name="Deficient" maxBarSize={20} />
          <Bar dataKey="moderate" stackId="nutrient" fill={COLOR_AMBER} name="Moderate" maxBarSize={20} />
          <Bar
            dataKey="adequate"
            stackId="nutrient"
            fill={COLOR_GREEN}
            name="Adequate"
            radius={[0, 2, 2, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ChartCard>

      <div className="flex items-center justify-center gap-4 pt-0.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_RED }} />
          Deficient
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_AMBER }} />
          Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_GREEN }} />
          Adequate
        </span>
      </div>
    </div>
  );
}
