import { cn } from "../lib/utils";

/**
 * Panel (formerly GlassPanel)
 * Flat, light-mode surface container used across the application.
 * Strict design language: pure white surface, 1px slate-200 border,
 * 2px max border radius, subtle elevation shadow. No glassmorphism,
 * no blur, no glow.
 */
export default function GlassPanel({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-surface shadow-card",
        "transition-colors duration-150",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
