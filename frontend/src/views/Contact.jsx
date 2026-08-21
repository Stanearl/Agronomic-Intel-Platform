import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Send, Building2, CheckCircle2 } from "lucide-react";
import Header from "../components/Header";

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

const FIELDS = [
  { key: "name", label: "Full Name", type: "text", placeholder: "", span: "half" },
  { key: "email", label: "Email Address", type: "email", placeholder: "", span: "half" },
  { key: "subject", label: "Subject", type: "text", placeholder: "", span: "full" },
];
/**
 * ContactField
 * Shared input styling: white surface, slate border, soil-health
 * green focus ring — matching the strict light-mode design language
 * used across the dashboard's form controls.
 */
function ContactField({ label, span, ...inputProps }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span === "full" ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        {...inputProps}
        className="h-11 w-full rounded-sm border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
    </label>
  );
}



/**
 * Contact
 * Premium public-facing "Contact Us" page.
 *
 * Layout:
 *  1. Hero — 50/50 split on a light grey/beige canvas. Left column
 *     carries the official corporate identity, mission statement and
 *     a Nairobi HQ address placeholder. Right column is a white card
 *     with a distinct green border containing the "Get in touch"
 *     heading and an email address (no social icons, per directive).
 *  2. Scroll section — a contact form (Name, Email, Subject, Message)
 *     styled with the same white-card / subtle-shadow / green-accent
 *     language. Submission currently just logs the payload.
 */
export default function Contact() {
  const [formValues, setFormValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (key) => (event) => {
    setFormValues((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // eslint-disable-next-line no-console
    console.log("Contact form payload:", formValues);
    setSubmitted(true);
    setFormValues({ name: "", email: "", subject: "", message: "" });
    window.setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <Header />

      <main className="flex-1 pt-16">
        {/* ============ HERO SECTION — 50/50 SPLIT ============ */}
        <section className="border-b border-slate-200 bg-[#F5F1E9] px-6 py-16 md:py-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            {/* Left — corporate identity + mission + address */}
            <motion.div variants={item} className="flex flex-col gap-5">
              

              <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Digital Fertilizer Decision Support Tool
              </h1>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                By Kenya Sugar Board.
              </p>

              <p className="max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
                Built as a decision support technology that bridges satellite-grade soil
                intelligence with the farmers, agronomists and policymakers who depend on
                it. Our mission is to make precise, field-level fertilizer guidance
                accessible across every county in Kenya turning raw geospatial data into
                actionable agronomic outcomes.
              </p>

              <div className="mt-2 flex items-start gap-3 rounded-sm border border-slate-200 bg-white/60 p-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div className="text-sm leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900">Nairobi Headquarters</p>
                  <p className="text-slate-600">
                    Sukari Plaza, Off Waiyaki Way,
                    <br />
                    51500 – 00200, Nairobi, Kenya.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right — white contact card, green border */}
            <motion.div variants={item} className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-sm border-2 border-emerald-700 bg-white p-8 shadow-card">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Get in touch</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Have a question about the platform, a partnership opportunity, or a
                  pilot deployment? Reach our team directly.
                </p>

                <div className="mt-6 flex items-center gap-3 rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700/10">
                    <Mail className="h-4.5 w-4.5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                    <a
                      href="mailto:info@risafricasystems.com"
                      className="block truncate text-sm font-semibold text-slate-900 hover:text-emerald-700"
                    >
                      info@ksb.go.ke
                    </a>
                  </div>
                </div>

                <a
                  href="#contact-form"
                  className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-800"
                >
                  Send us a message
                </a>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ============ SCROLL SECTION — CONTACT FORM ============ */}
        <section id="contact-form" className="bg-background px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-2xl"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Send us a message
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                Fill out the form below and a member of the team will
                respond within one business day.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-10 rounded-sm border border-slate-200 bg-white p-6 shadow-card sm:p-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <ContactField
                    key={field.key}
                    label={field.label}
                    span={field.span}
                    type={field.type}
                    required
                    placeholder={field.placeholder}
                    value={formValues[field.key]}
                    onChange={handleChange(field.key)}
                  />
                ))}

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Message
                  </span>
                  <textarea
                    required
                    rows={5}
                    placeholder=""
                    value={formValues.message}
                    onChange={handleChange("message")}
                    className="w-full resize-none rounded-sm border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-800 active:scale-[0.99] sm:w-auto sm:px-8"
              >
                <Send className="h-4 w-4" />
                Submit Message
              </button>

              {submitted ? (
                <div className="mt-4 flex items-center gap-2 rounded-sm border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Thanks your message has been logged. We'll be in touch shortly.
                </div>
              ) : null}
            </form>
          </motion.div>
        </section>

        <footer className="border-t border-border py-6 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Secure • In-Memory Analytics • 13 Verified Soil Metrics
        </footer>
      </main>
    </div>
  );
}

