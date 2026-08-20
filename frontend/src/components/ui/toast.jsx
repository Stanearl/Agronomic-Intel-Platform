import { AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Toast
 * Minimal, self-contained, light-mode toast notification — strict
 * design-craft rules match the rest of the app (2px max border
 * radius, slate borders, no glassmorphism). Rendered fixed at the
 * top-center of the viewport so it is visible above the fullscreen
 * map. Controlled entirely by the parent view's local state (no
 * external toast library dependency); auto-dismiss timing is handled
 * by the caller (see views/Dashboard.jsx).
 */
export default function Toast({ message, tone = "warning", onDismiss }) {
  if (!message) return null;

  const toneClasses =
    tone === "warning"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-destructive/30 bg-red-50 text-destructive";

  return (
    <div
      role="alert"
      className={cn(
        "fixed left-1/2 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-2.5 rounded-sm border px-3.5 py-3 shadow-card animate-fade-up",
        toneClasses
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold leading-tight">Location out of range</p>
        <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
