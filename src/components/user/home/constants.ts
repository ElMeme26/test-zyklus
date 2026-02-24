/** Mapeo de estados de solicitud a etiqueta y color. */
export const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:         { label: 'Pendiente',       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ACTION_REQUIRED: { label: 'Acción Req.',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  APPROVED:        { label: 'Aprobado ✓',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ACTIVE:          { label: 'En Préstamo',     color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  OVERDUE:         { label: 'VENCIDO',         color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  RETURNED:        { label: 'Devuelto',        color: 'text-slate-400 bg-slate-700/50 border-slate-600/20' },
  MAINTENANCE:     { label: 'Mantenimiento',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  REJECTED:        { label: 'Rechazado',       color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  CANCELLED:       { label: 'Cancelado',       color: 'text-slate-500 bg-slate-800/50 border-slate-700/20' },
};

export const CATALOG_PAGE_SIZE = 24;
