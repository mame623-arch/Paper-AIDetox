import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        ink: "var(--ink)",
        body: "var(--body)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--border)",
        linestrong: "var(--border-strong)",
        accent: "var(--accent)",
        accentsoft: "var(--accent-soft)",
        warn: "var(--warn)",
        ok: "var(--ok)",
      },
    },
  },
  plugins: [],
};
export default config;
