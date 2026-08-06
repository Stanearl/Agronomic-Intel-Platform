import { useMemo } from "react";
import { Layers, FlaskConical, Sprout, Wheat } from "lucide-react";
import { THRESHOLDS } from "../constants/metrics";

function KpiCard({ icon: Icon, label, value, suffix, tone }) {
  const toneClasses = {
    neutral: "text-foreground bg-slate-100",
    green: "text-primary bg-primary/10",
    amber: "text-warning bg-warning/10",
    red: "text-destructive bg-destructive/10",
  };

  return (
    <div className="flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${toneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </span>
        <span className="tabular text-xl font-semibold leading-tight tracking-tight text-foreground">
          {value}
          {suffix ? <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span> : null}
        </span>
      </div>
    </div>
  );
}

/**
 * KpiSummaryStrip
 * Four compact KPI cards summarizing the currently filtered soil
 * sample set: total fields, acidic soils, nitrogen-deficient fields,
 * and low-phosphorus fields. Values update instantly (no transition
 * delay / no layout shift) as filters change.
 */
export default function KpiSummaryStrip({ records }) {
  const stats = useMemo(() => {
    let acidic = 0;
    let nDeficient = 0;
    let pLow = 0;

    records.forEach((row) => {
      const ph = Number(row.ph);
      const n = Number(row.n_pct);
      const p = Number(row.p_ppm);

      if (!Number.isNaN(ph) && ph < THRESHOLDS.ph.acidicMax) acidic += 1;
      if (!Number.isNaN(n) && n < THRESHOLDS.n_pct.deficientMax) nDeficient += 1;
      if (!Number.isNaN(p) && p < THRESHOLDS.p_ppm.deficientMax) pLow += 1;
    });

    return {
      total: records.length,
      acidic,
      nDeficient,
      pLow,
    };
  }, [records]);

  return (
    <div className="grid w-full shrink-0 grid-cols-2 gap-3 border-b border-border bg-background px-4 py-3 md:grid-cols-4 md:px-6">
      <KpiCard icon={Layers} label="Total Fields Analyzed" value={stats.total} suffix="samples" tone="neutral" />
      <KpiCard icon={FlaskConical} label="Acidic Soils (pH < 5.5)" value={stats.acidic} suffix="fields" tone="red" />
      <KpiCard icon={Sprout} label="Nitrogen Deficient (N < 0.15%)" value={stats.nDeficient} suffix="fields" tone="amber" />
      <KpiCard icon={Wheat} label="Low Phosphorus (P < 15 ppm)" value={stats.pLow} suffix="fields" tone="amber" />
    </div>
  );
}
