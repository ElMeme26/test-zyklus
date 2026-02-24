import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CategoryFilterProps {
  categories: string[];
  value: string;
  onChange: (cat: string) => void;
  /** Optional label for the button (default: "Categorías") */
  label?: string;
  className?: string;
}

const ALL_LABEL = 'Todas';

/** Selector de categorías para filtrar activos. */
export function CategoryFilter({ categories, value, onChange, label = 'Categorías', className }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayValue = value === ALL_LABEL ? ALL_LABEL : value;
  const options = [ALL_LABEL, ...categories];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className={cn('relative flex-shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-11 px-4 rounded-xl text-xs font-bold transition-all border bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
      >
        <span className="whitespace-nowrap">{label}:</span>
        <span className={cn(
          'max-w-[120px] truncate',
          value !== ALL_LABEL && 'text-primary'
        )}>
          {displayValue}
        </span>
        <ChevronDown size={14} className={cn('transition-transform text-slate-400 flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 min-w-[180px] max-h-[70vh] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-2">
              {options.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    onChange(cat);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-xs font-bold transition-all border-l-2 border-transparent',
                    value === cat
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border-slate-900'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
