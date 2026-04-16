import React from 'react';
import { X, Wrench, Tag, User as UserIcon, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../../ui/core';
import type { Request } from '../../../types';

export interface MaintenanceLogWithRequest {
  id: number;
  asset_id: string;
  issue_description?: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  cost?: number;
  assets?: { name?: string; tag?: string; category?: string; location?: string };
  users?: { name?: string; disciplina?: string };
  relatedRequest?: Request | null;
}

interface MaintenanceLogModalProps {
  log: MaintenanceLogWithRequest;
  onClose: () => void;
}

/** Modal con detalle de una incidencia de mantenimiento. */
export function MaintenanceLogModal({ log, onClose }: MaintenanceLogModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md border-amber-500/30 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Wrench size={16} className="text-amber-400" /> Detalle de Incidencia
          </h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Activo</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Tag size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold">{log.assets?.name || log.asset_id}</p>
                <p className="text-slate-500 text-xs font-mono">{log.assets?.tag}</p>
                {log.assets?.category && <p className="text-slate-600 text-xs mt-0.5">{log.assets.category}</p>}
                {log.assets?.location && <p className="text-slate-600 text-xs">{log.assets.location}</p>}
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Descripción del Problema</p>
            <p className="text-slate-300 text-sm leading-relaxed">{log.issue_description || 'Sin descripción'}</p>
          </div>

          {log.users?.name && (
            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <UserIcon size={14} className="text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Reportado por</p>
                <p className="text-white text-sm font-medium">{log.users.name}</p>
                {log.users.disciplina && <p className="text-slate-500 text-xs">{log.users.disciplina}</p>}
              </div>
            </div>
          )}

          {log.relatedRequest && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Préstamo Relacionado</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Solicitante</span>
                  <span className="text-white font-medium">{log.relatedRequest.requester_name}</span>
                </div>
                {log.relatedRequest.requester_disciplina && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disciplina</span>
                    <span className="text-slate-300">{log.relatedRequest.requester_disciplina}</span>
                  </div>
                )}
                {log.relatedRequest.users?.manager_id && log.relatedRequest.users?.name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Líder</span>
                    <span className="text-slate-300">{log.relatedRequest.users.name}</span>
                  </div>
                )}
                {log.relatedRequest.checkout_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1"><Clock size={10} />Salida</span>
                    <span className="text-slate-300">{format(new Date(log.relatedRequest.checkout_at), 'd MMM yyyy HH:mm', { locale: es })}</span>
                  </div>
                )}
                {log.relatedRequest.expected_return_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1"><Calendar size={10} />Retorno esp.</span>
                    <span className="text-slate-300">{format(new Date(log.relatedRequest.expected_return_date), 'd MMM yyyy', { locale: es })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reporte</p>
              <p className="text-white text-xs font-medium">{format(new Date(log.created_at), 'd MMM yyyy', { locale: es })}</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Estado</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${log.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                {log.status === 'RESOLVED' ? 'Resuelto' : 'Abierto'}
              </span>
            </div>
          </div>

          {log.resolved_at && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs">
              <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Resuelto el</p>
              <p className="text-slate-300">{format(new Date(log.resolved_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
            </div>
          )}

          {log.cost != null && (
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Costo de Reparación</p>
              <p className="text-white font-black text-lg">${log.cost.toLocaleString()}</p>
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all">
          Cerrar
        </button>
      </Card>
    </div>
  );
}
