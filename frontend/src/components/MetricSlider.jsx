import { Slider } from "./ui/slider";

/**
 * MetricSlider
 * Dual-thumb range slider bound to a single soil metric. Renders the
 * metric label plus the live min/max readout, and reports range
 * changes back up to the Dashboard filter state. Compact, light-mode
 * styling with tabular numeric readouts.
 */
export default function MetricSlider({ metric, range, onChange }) {
  const handleValueChange = ([min, max]) => {
    onChange(metric.key, { min, max });
  };

  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">{metric.label}</span>
        <span className="tabular text-[11px] font-medium text-primary">
          {range.min.toFixed(metric.precision)} – {range.max.toFixed(metric.precision)}
          {metric.unit ? ` ${metric.unit}` : ""}
        </span>
      </div>
      <Slider
        min={metric.min}
        max={metric.max}
        step={metric.step}
        value={[range.min, range.max]}
        onValueChange={handleValueChange}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{metric.min}</span>
        <span>{metric.max}</span>
      </div>
    </div>
  );
}
