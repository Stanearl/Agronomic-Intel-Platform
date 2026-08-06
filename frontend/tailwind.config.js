/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "#E2E8F0", // slate-200
        input: "#E2E8F0",
        ring: "#15803D", // soil health green
        background: "#F8FAFC", // slate-50 canvas
        foreground: "#0F172A", // slate-900

        surface: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        primary: {
          DEFAULT: "#15803D", // soil health green
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F1F5F9", // slate-100
          foreground: "#0F172A",
        },
        destructive: {
          DEFAULT: "#B91C1C", // deficient red
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#B45309", // alert warning amber
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#15803D",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B", // slate-500
        },
        accent: {
          DEFAULT: "#ECFDF5",
          foreground: "#15803D",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      // Strict design-craft rule: max 2px border radius across the app.
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "2px",
        "2xl": "2px",
        "3xl": "2px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(15,23,42,0.04)",
        card: "0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.06)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.3s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
