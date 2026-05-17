import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1536px",
      },
    },
    extend: {
      fontFamily: {
        // Display & headers: TT Hoves → Plus Jakarta Sans fallback (geometric humanist)
        display: [
          "var(--font-display)",
          "Plus Jakarta Sans",
          "system-ui",
          "sans-serif",
        ],
        // Body & data tables: Roboto
        sans: ["var(--font-sans)", "Roboto", "system-ui", "sans-serif"],
        // Chart data: JetBrains Mono → system monospace fallback
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Financial semantic colors
        bull: {
          DEFAULT: "hsl(var(--bull))",
          glow: "hsl(var(--bull-glow))",
        },
        bear: {
          DEFAULT: "hsl(var(--bear))",
          glow: "hsl(var(--bear-glow))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          glow: "hsl(var(--neutral-glow))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 32px 0 rgb(0 212 255 / 0.15)",
        "glow-bull": "0 0 32px 0 rgb(0 255 178 / 0.25)",
        "glow-bear": "0 0 32px 0 rgb(255 59 92 / 0.25)",
        "glow-neutral": "0 0 32px 0 rgb(255 209 102 / 0.20)",
        card: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 1px 2px 0 rgb(0 0 0 / 0.4)",
        elevated:
          "0 1px 0 0 rgb(255 255 255 / 0.05) inset, 0 8px 24px -4px rgb(0 0 0 / 0.6), 0 2px 4px 0 rgb(0 0 0 / 0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "border-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.0)" },
          "50%": { boxShadow: "0 0 0 4px hsl(var(--primary) / 0.18)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        shimmer: "shimmer 2.2s linear infinite",
        "border-glow": "border-glow 2.4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
