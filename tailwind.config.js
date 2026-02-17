/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modo Oscuro (Default)
        background: "#020617", // Slate 950
        surface: "#0f172a",    // Slate 900
        primary: "#06b6d4",    // Cyan 500
        secondary: "#64748b",  // Slate 500
        accent: "#f59e0b",     // Amber 500
        danger: "#f43f5e",     // Rose 500
        success: "#10b981",    // Emerald 500
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #06b6d4, 0 0 10px #06b6d4' },
          '100%': { boxShadow: '0 0 20px #06b6d4, 0 0 30px #06b6d4' },
        }
      }
    },
  },
  plugins: [],
}