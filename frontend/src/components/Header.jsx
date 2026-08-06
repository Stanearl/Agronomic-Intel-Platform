import { RotateCcw, Leaf } from "lucide-react";
import { Button } from "./ui/button";

/**
 * Header
 * High-contrast light application bar. Carries the official platform
 * name, the Kenya Sugar Board badge, the active dataset indicator,
 * and the global "Reset Filters" action. Flat, dense, zero glow.
 */
export default function Header({ onResetFilters, recordCount, totalCount }) {
  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
          <Leaf className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            Digital Fertilizer Decision Support Tool{" "}
            <span className="font-normal text-muted-foreground">| KSB</span>
          </h1>
        </div>

      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden items-center gap-2 rounded-sm border border-border bg-slate-50 px-3 py-1.5 text-[11px] text-muted-foreground md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="tabular font-medium text-foreground">{recordCount}</span>
          <span>/ {totalCount} samples in view</span>
        </div>
        <Button variant="outline" size="sm" onClick={onResetFilters}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filters
        </Button>
      </div>
    </header>
  );
}
