import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Card, Button } from '../ui/core';
import { LogOut, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';

export function ManagerInbox() {
  const { user, logout } = useAuth();
  const { requests, processRequest, returnAsset } = useData();
  const [tab, setTab] = useState<'pending' | 'active'>('pending');

  const pending = requests.filter(r => r.status === 'PENDING');
  // Consider active if approved or active
  const active = requests.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-xl font-bold text-white">Hola, {user?.name.split(' ')[0]}</h1>
          <p className="text-slate-400 text-xs">Gestión de Equipo</p>
        </div>
        <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
      </header>

      <div className="flex gap-2 mb-6 bg-slate-900/50 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === 'pending' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'}`}>
          Pendientes ({pending.length})
        </button>
        <button onClick={() => setTab('active')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === 'active' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'}`}>
          En Préstamo ({active.length})
        </button>
      </div>

      <div className="grid gap-4">
        {tab === 'pending' ? (
          pending.length === 0 ? <p className="text-slate-500 text-sm">Todo al día.</p> :
          pending.map((req) => (
            <Card key={req.id} className="p-4 border-slate-800 bg-slate-900/60">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-bold">{req.assets?.name || 'Activo Desconocido'}</h3>
                  <p className="text-xs text-slate-400">Solicitado por: <span className="text-cyan-400">{req.requester_name}</span></p>
                </div>
                <div className="bg-slate-800 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                    <Clock size={12}/> {req.days_requested}d
                </div>
              </div>
              
              {req.motive && (
                <p className="text-xs text-slate-500 italic mb-4 bg-slate-950/50 p-2 rounded">"{req.motive}"</p>
              )}

              <div className="flex gap-2">
                <Button onClick={() => processRequest(req.id, 'REJECTED', req.asset_id)} className="flex-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20">
                  <XCircle size={16} className="mr-2"/> Rechazar
                </Button>
                <Button onClick={() => processRequest(req.id, 'APPROVED', req.asset_id)} className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400">
                  <CheckCircle2 size={16} className="mr-2"/> Aprobar
                </Button>
              </div>
            </Card>
          ))
        ) : (
          active.length === 0 ? <p className="text-slate-500 text-sm">No hay activos en préstamo.</p> :
          active.map((req) => (
            <Card key={req.id} className="p-4 border-slate-800 bg-slate-900/60 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold">{req.assets?.name}</h3>
                <p className="text-xs text-slate-400">En uso por: {req.requester_name}</p>
                <p className="text-[10px] text-emerald-500 mt-1">Desde: {new Date(req.created_at).toLocaleDateString()}</p>
              </div>
              <Button onClick={() => returnAsset(req.id, req.asset_id)} className="bg-slate-800 hover:bg-cyan-500 hover:text-black border-slate-700">
                <RotateCcw size={14} className="mr-2"/> Devolver
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}