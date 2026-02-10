import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient'; // Para hacer update directo
import { Card, Button } from '../ui/core';
import { LogOut, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function ManagerInbox() {
  const { user, logout } = useAuth();
  const { requests, fetchData } = useData();

  // Filtrar solicitudes pendientes del departamento del líder
  // (O todas si queremos simplificar para el demo)
  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  const handleProcess = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    const { error } = await supabase
      .from('requests')
      .update({ status: status })
      .eq('id', id);

    if (error) toast.error("Error al procesar");
    else {
      toast.success(status === 'APPROVED' ? "Aprobado" : "Rechazado");
      fetchData(); // Recargar lista
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-xl font-bold text-white">Hola, {user?.name.split(' ')[0]}</h1>
          <p className="text-slate-400 text-xs">Gestión de Equipo</p>
        </div>
        <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
      </header>

      <h2 className="text-white font-bold mb-4 flex items-center gap-2">
        <Clock size={16} className="text-yellow-500"/> Pendientes ({pendingRequests.length})
      </h2>

      <div className="grid gap-4">
        {pendingRequests.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay solicitudes pendientes.</p>
        ) : (
          pendingRequests.map((req: any) => (
            <Card key={req.id} className="p-4 border-slate-800 bg-slate-900/60">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-bold">{req.assets?.name}</h3>
                  <p className="text-xs text-slate-400">Solicitado por: <span className="text-cyan-400">{req.user_name}</span></p>
                </div>
                <div className="bg-slate-800 px-2 py-1 rounded text-xs text-white">{req.days} días</div>
              </div>
              
              {req.motive && (
                <p className="text-xs text-slate-500 italic mb-4 bg-slate-950/50 p-2 rounded">"{req.motive}"</p>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handleProcess(req.id, 'REJECTED')} className="flex-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20">
                  <XCircle size={16} className="mr-2"/> Rechazar
                </Button>
                <Button onClick={() => handleProcess(req.id, 'APPROVED')} className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400">
                  <CheckCircle2 size={16} className="mr-2"/> Aprobar
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}