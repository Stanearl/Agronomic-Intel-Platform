import { Map, BarChart3, FlaskConical } from "lucide-react";

export const MOBILE_VIEWS = {
  MAP: "map",
  ANALYTICS: "analytics",
  DIAGNOSTIC: "diagnostic",
};

const TABS = [
  { key: MOBILE_VIEWS.MAP, label: "Map View", icon: Map },
  { key: MOBILE_VIEWS.ANALYTICS, label: "Analytics & Grid", icon: BarChart3 },
  { key: MOBILE_VIEWS.DIAGNOSTIC, label: "Soil Diagnostic", icon: FlaskConical },
];

/**
 * MobileNavigation
 * Fixed bottom tab bar shown exclusively below the lg breakpoint
 * (< 1024px). Provides the three primary mobile views required for
 * a single-hand, thumb-reachable workflow on phones and tablets:
 * Map View, Analytics & Grid, and Soil Diagnostic. Each tap target
 * is a minimum of 44px tall/wide per mobile accessibility guidance.
 * Strict light-mode aesthetic — white surface, slate borders/text,
 * soil-health-green active state.
 */
export default function MobileNavigation({ activeView, onChangeView }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-[60px] shrink-0 items-stretch border-t border-border bg-surface shadow-[0_-2px_8px_rgba(15,23,42,0.06)] lg:hidden"
      role="tablist"
      aria-label="Mobile view navigation"
    >
      {TABS.map((tab) => {
        const isActive = activeView === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeView(tab.key)}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
            <span className={`text-[10px] font-medium leading-none ${isActive ? "font-semibold" : ""}`}>
              {tab.label}
            </span>
            {isActive ? <span className="mt-0.5 h-0.5 w-6 rounded-full bg-primary" /> : null}
          </button>
        );
      })}
    </nav>
  );
}
