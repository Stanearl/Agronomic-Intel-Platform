import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Menu, X, LayoutDashboard } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "News", to: "/news" },
  { label: "Contact Us", to: "/contact" },
];

/**
 * Header
 * Global marketing navigation shared across every public-facing view
 * (Landing Page, News, Contact Us). A clean, solid, official
 * government-utility style top bar: opaque white background, a
 * subtle bottom border, and a compact emerald "Dashboard" CTA that
 * routes into the application. Nav links are real router routes so
 * the active page is highlighted regardless of which view is
 * currently mounted. Collapses into a simple dropdown menu below the
 * lg breakpoint.
 */
export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        {/* Brand — left */}
        <Link
          to="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-2.5 min-w-0 shrink-0"
        >
          <img
            src="/favicon.png"
            alt="Digital Fertilizer Decision Support Tool logo"
            className="h-[81px] w-[81px] shrink-0 rounded-full object-contain"
          />
          <span className="hidden sm:block truncate text-xs font-semibold tracking-tight text-slate-900 md:text-sm">
            Digital Fertilizer Decision Support Tool
          </span>
        </Link>

        {/* Main navigation — center (desktop only) */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={[
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTA + mobile hamburger — right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex h-9 min-h-[36px] items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-800 active:scale-[0.98]"

          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors duration-150 hover:bg-slate-100 lg:hidden"
          >
            {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobileOpen ? (
        <div className="lg:hidden border-t border-slate-200 bg-white px-3 pb-3 pt-2">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMobileMenu}
                  className={[
                    "flex min-h-[44px] items-center rounded-md px-4 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

