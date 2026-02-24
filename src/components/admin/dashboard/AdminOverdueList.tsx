import React from 'react';
import { CheckCircle2, Flame } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Request } from '../../../types';

interface AdminOverdueListProps {
  requests: Request[];
}

/** Lista de préstamos vencidos ordenados por días de retraso. */
export function AdminOverdueList({ requests }: AdminOverdueListProps) {
  const now = new Date();
  const overdueList = requests
    .filter(r => r.status === 'OVERDUE' && r.expected_return_date)
    .map(r => ({
      ...r,
      daysLate: differenceInDays(now, new Date(r.expected_return_date!)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  if (overdueList.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500">
        <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500/40" />
        <p className="text-sm">Sin préstamos vencidos</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto w-full">
      <table className="w-full text-left text-xs text-slate-400 min-w-[580px]">
        <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
          <tr>
            <th className="p-3 w-10">#</th>
            <th className="p-3">Activo</th>
            <th className="p-3">Solicitante</th>
            <th className="p-3">Disciplina</th>
            <th className="p-3 text-center">Días Vencido</th>
            <th className="p-3">Debió Retornar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {overdueList.map((r, idx) => {
            const urgency =
              r.daysLate >= 7 ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              r.daysLate >= 3 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                              'text-amber-400 bg-amber-500/10 border-amber-500/20';

            return (
              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 font-black text-slate-600">
                  {idx === 0 && <Flame size={14} className="text-red-400 inline" />}
                  {idx > 0 && <span className="text-slate-600 text-[10px]">#{idx + 1}</span>}
                </td>
                <td className="p-3 font-medium text-white">
                  {r.assets?.name ?? `Activo #${r.asset_id}`}
                  <span className="text-slate-500 text-[10px] font-mono ml-2">{r.assets?.tag}</span>
                </td>
                <td className="p-3">{r.requester_name}</td>
                <td className="p-3 text-slate-500">{r.requester_disciplina ?? '—'}</td>
                <td className="p-3 text-center">
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${urgency}`}>
                    {r.daysLate}d
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-500">
                  {r.expected_return_date
                    ? format(new Date(r.expected_return_date), 'dd/MM/yy', { locale: es })
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
