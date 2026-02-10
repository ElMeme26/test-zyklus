/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // Slate 950 (Fondo principal oscuro)
        surface: "#0f172a",    // Slate 900 (Fondo de tarjetas)
        primary: "#06b6d4",    // Cyan 500 (El color Neón principal)
        secondary: "#64748b",  // Slate 500 (Textos secundarios)
        accent: "#f59e0b",     // Amber 500 (Para alertas o destacados)
        danger: "#f43f5e",     // Rose 500 (Para errores/rechazos)
        success: "#10b981",    // Emerald 500 (Para éxito/aprobaciones)
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}