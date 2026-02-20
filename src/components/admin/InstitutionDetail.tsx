import React from 'react';
import { useData } from '../../context/DataContext';
import type { Institution, Request } from '../../types';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react';

interface Props {
  institution: Institution;
  onBack: () => void;
}

export const InstitutionDetail = ({ institution, onBack }: Props) => {
  const { requests } = useData();
  const loans = requests
    .filter((r) => r.institution_id === institution.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6 animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={18} /> Volver al directorio
      </button>

      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">{institution.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Contacto</p>
              <p>{institution.contact_name || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Email</p>
              <p>{institution.contact_email || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Teléfono</p>
              <p>{institution.contact_phone || 'No registrado'}</p>
            </div>
        </div>
      </div>

      <h3 className="font-bold text-lg text-white mt-8 border-b border-slate-800 pb-2">
        Historial de Préstamos
      </h3>
      
      <div className="space-y-3">
          {loans.map(loan => (
            <div key={loan.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-slate-600 transition-colors">
               <div className="flex gap-4 items-center w-full md:w-auto">
                  <div className={`p-2 rounded-full shrink-0 ${loan.status === 'ACTIVE' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'}`}>
                    {loan.status === 'ACTIVE' ? <Clock size={20}/> : <CheckCircle size={20}/>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">{loan.assets?.name || 'Activo desconocido'}</p>
                    <p className="text-xs text-slate-500">Solicitante: <span className="text-slate-400">{loan.requester_name}</span></p>
                  </div>
               </div>
               
               <div className="text-right text-sm w-full md:w-auto flex justify-between md:block items-center">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                    loan.status === 'ACTIVE' ? 'bg-blue-900 text-blue-300' : 
                    loan.status === 'OVERDUE' ? 'bg-red-900 text-red-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {loan.status}
                  </span>
                  <p className="font-mono text-slate-600 text-xs mt-1">
                    {new Date(loan.created_at).toLocaleDateString()}
                  </p>
               </div>
            </div>
          ))}
          {loans.length === 0 && (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded">
              No hay préstamos registrados para esta institución.
            </div>
          )}
        </div>
    </div>
  );
};