/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        cardBg: "#FFFFFF",
        sidebarBg: "#1E293B",
        sidebarActiveBg: "#EEF2FF",
        textPrimary: "#1E293B",
        textSecondary: "#64748B",
        borderSlate: "#E2E8F0",
        primaryBlue: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          muted: "#EFF6FF",
          navy: "#1E3A8A"
        },
        severity: {
          criticalBg: "#FEE2E2",
          criticalText: "#DC2626",
          mediumBg: "#FEF3C7",
          mediumText: "#D97706",
          lowBg: "#DCFCE7",
          lowText: "#16A34A"
        }
      },
    },
  },
  plugins: [],
}
