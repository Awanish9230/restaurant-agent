/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        artisan: {
          terracotta: "#E05A47",
          terracottaHover: "#C84B3A",
          amber: "#F59E0B",
          amberLight: "#FEF3C7",
          sage: "#10B981",
          sageLight: "#D1FAE5",
          cream: "#FBF9F5",
          sand: "#F2EDE4",
          charcoal: "#1C1917",
          slate: "#44403C",
          muted: "#78716C",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
        glow: "0 8px 30px rgba(224, 90, 71, 0.12)",
        card: "0 4px 20px -2px rgba(28, 25, 23, 0.06), 0 2px 6px -1px rgba(28, 25, 23, 0.04)",
      },
    },
  },
  plugins: [],
};
