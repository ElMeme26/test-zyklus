export const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

export const actionBadge: Record<string, { label: string; style: string }> = {
  CREATE:      { label: 'Alta',          style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  APPROVE:     { label: 'Aprobado',      style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  REJECT:      { label: 'Rechazado',     style: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  CHECKOUT:    { label: 'Prestado',      style: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  CHECKIN:     { label: 'Devuelto',      style: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  MAINTENANCE: { label: 'Mantenimiento', style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  UPDATE:      { label: 'Actualización', style: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  ALERT:       { label: 'Alerta',        style: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
};
