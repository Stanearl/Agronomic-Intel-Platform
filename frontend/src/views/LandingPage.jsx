import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Satellite, FlaskConical, MapPinned, Leaf } from "lucide-react";
import { Button } from "../components/ui/button";
import GlassPanel from "../components/GlassPanel";

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

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-8 py-5 md:px-16">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Digital Fertilizer Decision Support Tool
          </span>
        </div>
        <span className="hidden text-[11px] uppercase tracking-widest text-muted-foreground md:block">
          Kenya Sugar Board
        </span>

      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex max-w-2xl flex-col items-center gap-5"
        >
          <motion.span
            variants={item}
            className="rounded-sm border border-border bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary"
          >
            Regional Soil Telemetry &amp; Fertilizer Decision Engine
          </motion.span>


          <motion.h1
            variants={item}
            className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl"
          >
            Digital Fertilizer
            <br />
            Decision Support Tool
          </motion.h1>

          <motion.p variants={item} className="max-w-lg text-sm text-muted-foreground md:text-base">
            A decision-support environment for digital fertilizer recommendations —
            fusing spatial soil sample data with live, multi-metric filtering across
            the Kisumu pilot region.
          </motion.p>

          <motion.div variants={item} className="mt-3">
            <Button size="lg" onClick={() => navigate("/dashboard")}>
              Launch Application
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <GlassPanel key={feature.title} className="flex flex-col items-start gap-2.5 p-5 text-left">
              <div className="rounded-sm bg-primary/10 p-2">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
            </GlassPanel>
          ))}
        </motion.div>
      </main>

      <footer className="border-t border-border px-8 py-4 text-center text-[11px] uppercase tracking-widest text-muted-foreground md:px-16">
        Secure • In-Memory Analytics • 13 Verified Soil Metrics
      </footer>
    </div>
  );
}
