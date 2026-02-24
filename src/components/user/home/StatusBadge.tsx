import { statusConfig } from './constants';

interface StatusBadgeProps {
  status: string;
}

/** Badge que muestra el estado de una solicitud (color y etiqueta). */
export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status] || { label: status, color: 'text-slate-400 bg-slate-700' };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
