import { useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";
import { Button } from "./ui/button";
import MetricSlider from "./MetricSlider";
import { METRIC_GROUPS, QUICK_TOGGLES, getMetricConfig } from "../constants/metrics";

/**
 * FilterControls
 * Compact, light-mode filter panel for the left workspace column.
 * Combines quick-toggle preset buttons for the most common agronomic
 * diagnostic ranges (pH, N, P) with full accordion-grouped range
 * sliders covering all 13 soil metrics (pH, EC, N, OC, P, K, CEC, etc).
 */
export default function FilterControls({ filters, onFilterChange, onQuickToggle, activeToggle }) {
  const handleChange = useCallback(
    (metricKey, range) => onFilterChange(metricKey, range),
    [onFilterChange]
  );

  return (
    <div className="flex h-full flex-col rounded-sm border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          Soil Parameter Filters
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-3.5 py-2.5">
        {QUICK_TOGGLES.map((toggle) => (
          <Button
            key={toggle.key}
            variant={activeToggle === toggle.key ? "default" : "outline"}
            size="xs"
            onClick={() => onQuickToggle(toggle)}
          >
            {toggle.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3.5">
        <Accordion type="multiple" defaultValue={["Core Chemical Properties"]}>
          {METRIC_GROUPS.map((group) => (
            <AccordionItem key={group.title} value={group.title}>
              <AccordionTrigger>{group.title}</AccordionTrigger>
              <AccordionContent>
                {group.metrics.map((metricKey) => {
                  const metric = getMetricConfig(metricKey);
                  return (
                    <MetricSlider
                      key={metricKey}
                      metric={metric}
                      range={filters[metricKey]}
                      onChange={handleChange}
                    />
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
