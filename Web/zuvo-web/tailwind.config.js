/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5b9fc",
          400: "#8293f8",
          500: "#6470f1",
          600: "#4f52e5",
          700: "#4140ca",
          800: "#3635a3",
          900: "#313281",
          950: "#1e1c4b",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark:    "#0f0f12",
        },
      },
      fontFamily: {
        sans:    ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease forwards",
        "slide-up":   "slideUp 0.4s ease forwards",
        "slide-down": "slideDown 0.3s ease forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(16px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: 0, transform: "translateY(-8px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "inner-sm": "inset 0 1px 2px rgba(0,0,0,0.06)",
        card:       "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
        "card-dark":"0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
