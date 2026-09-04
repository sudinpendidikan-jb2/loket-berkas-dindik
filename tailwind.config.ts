import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#2C4270",
          dark: "#121D34",
        },
        paper: "#F7F5EF",
        ink: "#201F1D",
        gold: {
          DEFAULT: "#B8863A",
          light: "#D9AE6E",
          dark: "#8F6A2C",
        },
        line: "#DAD5C8",
        moss: "#3F7A5C",
        rust: "#A8432F",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-plex)", "Helvetica", "Arial", "sans-serif"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
      },
    },
  },
  plugins: [],
};
export default config;
