import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Satellite, FlaskConical, MapPinned } from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";

const FEATURES = [
  {
    icon: Satellite,
    title: "Geospatial Intelligence",
    description:
      "High-contrast light-mode mapping renders every georeferenced soil sample instantly and clearly.",
  },
  {
    icon: FlaskConical,
    title: "13 Agronomic Metrics",
    description:
      "pH, macronutrients, micronutrients and CEC — filterable instantly across the entire pilot dataset.",
  },
  {
    icon: MapPinned,
    title: "Field-Level Precision",
    description:
      "Drill into any lab sample with pinpoint spatial accuracy for the Kisumu pilot region.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * AppleIcon
 * Inline SVG Apple glyph for the "Download on the App Store" CTA.
 */
function AppleIcon({ className }) {
  return (
    <svg viewBox="0 0 384 512" fill="currentColor" className={className} aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107 125.2 25.2-.7 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.4-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.5-90-61.5-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26-2 49.7-14.7 69.5-34.3z" />
    </svg>
  );
}

/**
 * PlayStoreIcon
 * Inline SVG Google Play triangle glyph for the "Get it on Google
 * Play" CTA.
 */
function PlayStoreIcon({ className }) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" className={className} aria-hidden="true">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}

/**
 * StoreButton
 * Tailgrids-style premium download CTA. Dark glass pill containing a
 * left-aligned icon plus two stacked lines of text (small eyebrow +
 * bold store name). Scales up and gains a soft glow on hover.
 */
function StoreButton({ Icon, eyebrow, storeName, href = "#" }) {
  return (
    <a
      href={href}
      className="group flex min-h-[56px] w-full items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-slate-900/95 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:w-auto"
    >
      <Icon className="h-7 w-7 shrink-0 text-white transition-transform duration-300 group-hover:scale-110" />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-300">
          {eyebrow}
        </span>
        <span className="text-[15px] font-bold tracking-tight text-white">{storeName}</span>
      </span>
    </a>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <Header />

      <main className="flex-1 pt-16">
        {/* ============ HERO SECTION ============ */}
        <section
          id="home"
          className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-6"
          style={{ backgroundImage: "url('/hero-sugarcane.jpg')" }}
        >
          {/* Gradient overlay for text legibility while keeping the worker visible */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/40" />

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center"
          >
            <motion.h1
              variants={item}
              className="text-3xl font-bold tracking-tight text-white leading-[1.1] sm:text-5xl md:text-6xl"
            >
              Digital Fertilizer Decision Support Tool
            </motion.h1>

            <motion.p
              variants={item}
              className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base md:text-lg"
            >
              A national-scale decision-support platform fusing geospatial soil intelligence with
              live agronomic analytics — empowering extension officers, millers, and smallholder
              sugarcane farmers with precise, field-level fertilizer recommendations across Kenya.
            </motion.p>

            <motion.div variants={item} className="mt-8">
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="h-11 rounded-full bg-emerald-600 px-6 text-sm font-semibold shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-all"
              >
                Launch Application
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Tailgrids-style app download CTAs */}
            <motion.div
              variants={item}
              className="mt-8 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:justify-center md:gap-5"
            >
              <StoreButton Icon={AppleIcon} eyebrow="Download on the" storeName="App Store" />
              <StoreButton Icon={PlayStoreIcon} eyebrow="Get it on" storeName="Google Play" />
            </motion.div>
          </motion.div>
        </section>

        {/* ============ FEATURES SECTION ============ */}
        <section className="bg-background px-6 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3"
          >
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-start gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-5 text-left shadow-xs backdrop-blur-sm transition-all hover:border-slate-300"
              >
                <div className="rounded-sm bg-primary/10 p-2">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-xs leading-snug text-slate-500">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <footer
          id="contact"
          className="border-t border-border py-6 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400"
        >
          Secure • In-Memory Analytics • 13 Verified Soil Metrics
        </footer>
      </main>
    </div>
  );
}
