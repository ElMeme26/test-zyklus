import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/** Interruptor para alternar tema claro/oscuro. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full bg-slate-800 dark:bg-slate-700 transition-colors duration-300 flex items-center px-1"
      aria-label="Cambiar tema"
    >
      {/* Toggle Circle */}
      <div className={`absolute w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-300 flex items-center justify-center ${theme === 'light' ? 'translate-x-0' : 'translate-x-7'}`}>
        {theme === 'light' ? (
          <Sun size={12} className="text-amber-500" />
        ) : (
          <Moon size={12} className="text-cyan-500" />
        )}
      </div>
      
      {/* Background Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun size={12} className={`transition-opacity ${theme === 'light' ? 'opacity-0' : 'opacity-40 text-slate-400'}`} />
        <Moon size={12} className={`transition-opacity ${theme === 'dark' ? 'opacity-0' : 'opacity-40 text-slate-400'}`} />
      </div>
    </button>
  );
}
