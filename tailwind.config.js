/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // Slate 950 (Fondo principal ultra oscuro)
        surface: "#0f172a",    // Slate 900 (Fondo de tarjetas)
        primary: "#06b6d4",    // Cyan 500 (Tu color Neón Principal)
        secondary: "#64748b",  // Slate 500 (Textos secundarios)
        accent: "#f59e0b",     // Amber 500 (Alertas)
        danger: "#f43f5e",     // Rose 500 (Errores/Rechazos)
        success: "#10b981",    // Emerald 500 (Éxito/Aprobaciones)
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