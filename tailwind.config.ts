import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0d0d18",
          card:    "#161627",
          raised:  "#1c1c2e",
          hover:   "#1c1c2e",
        },
        border: {
          DEFAULT: "#242438",
          subtle:  "#1a1a2c",
        },
        gold: {
          DEFAULT: "#d4a843",
          light:   "#e8c06a",
          dark:    "#b8912e",
        },
        purple: {
          DEFAULT: "#6366f1",
          dim:     "rgba(99,102,241,0.15)",
        },
      },
      fontFamily: {
        sans:  ["Inter", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
