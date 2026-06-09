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
        panel: "var(--panel)",
        line: "var(--border)",
        ink: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
