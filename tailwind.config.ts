import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral, trustworthy legal/property palette
        ink: {
          DEFAULT: "#1f2933",
          soft: "#3e4c59",
          muted: "#7b8794",
        },
        brand: {
          50: "#eef2f7",
          100: "#e2e8f0",
          600: "#334e68",
          700: "#243b53",
          800: "#1a2f45",
        },
        surface: "#f7f9fb",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
