/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Source Serif 4'", "'Iowan Old Style'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        paper: "#fbfbf7",
        ink: {
          50: "#f8f8f7",
          100: "#eeeeec",
          200: "#d8d8d4",
          400: "#8a8a85",
          700: "#3a3a37",
          900: "#16160f",
        },
        accent: {
          DEFAULT: "#3056d3",
          subtle: "#e8efff",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(22,22,15,0.04), 0 4px 16px rgba(22,22,15,0.04)",
      },
    },
  },
  plugins: [],
};

