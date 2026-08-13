import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LayoutDashboard } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "News", href: "#news" },
  { label: "Contact Us", href: "#contact" },
];

/**
 * Header
 * Global marketing navigation for the public-facing Landing Page.
 * A clean, solid, official government-utility style top bar: opaque
 * white background, a subtle bottom border, and a compact emerald
 * "Dashboard" CTA that routes into the application. Collapses into a
 * simple dropdown menu below the lg breakpoint.
 */
export default function Header() {
  const navigate = useNavigate();
  const [activeLink, setActiveLink] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavClick = (href) => {
    setActiveLink(href);
    setIsMobileOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        {/* Brand — left */}
        <a
          href="#home"
          onClick={() => handleNavClick("#home")}
          className="flex items-center gap-2.5 min-w-0 shrink-0"
        >
          <img
            src="/favicon.png"
            alt="Digital Fertilizer Decision Support Tool logo"
            className="h-9 w-9 shrink-0 rounded-full object-contain"
          />
          <span className="hidden sm:block truncate text-xs font-semibold tracking-tight text-slate-900 md:text-sm">
            Digital Fertilizer Decision Support Tool
          </span>
        </a>

        {/* Main navigation — center (desktop only) */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = activeLink === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                className={[
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Action CTA + mobile hamburger — right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex h-9 min-h-[36px] items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-800 active:scale-[0.98]"
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
              const isActive = activeLink === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={[
                    "flex min-h-[44px] items-center rounded-md px-4 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
