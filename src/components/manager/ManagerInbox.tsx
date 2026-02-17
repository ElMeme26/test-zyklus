import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
// CORRECCIÓN: Agregar 'type' aquí
import type { Request } from '../../types';
import { Check, X, MessageCircle, AlertCircle, Clock } from 'lucide-react';

export const ManagerInbox = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el modal de feedback
  const [feedbackModal, setFeedbackModal] = useState<{isOpen: boolean, reqId: number | null}>({isOpen: false, reqId: null});
  const [feedbackText, setFeedbackText] = useState('');

  const fetchRequests = async () => {
    // Busca solicitudes PENDING
    // Nota: En un entorno real filtrarías por manager_id vs user.manager_id
    const { data, error } = await supabase
      .from('requests')
      .select(`*, assets(*), users(*)`)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (data) setRequests(data as Request[]);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id: number) => {
    await supabase.from('requests').update({ status: 'APPROVED', approved_at: new Date() }).eq('id', id);
    fetchRequests();
  };

  const handleReject = async (id: number) => {
    if(!window.confirm("¿Rechazar definitivamente?")) return;
    await supabase.from('requests').update({ status: 'REJECTED' }).eq('id', id);
    fetchRequests();
  };

  const openFeedback = (id: number) => {
    setFeedbackModal({ isOpen: true, reqId: id });
    setFeedbackText('');
  };

  const submitFeedback = async () => {
    if (!feedbackModal.reqId) return;
    
    await supabase.from('requests').update({
      status: 'ACTION_REQUIRED',
      rejection_feedback: feedbackText
    }).eq('id', feedbackModal.reqId);

    setFeedbackModal({ isOpen: false, reqId: null });
    fetchRequests();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-blue-600"/> Bandeja de Aprobaciones
        </h1>
        <p className="text-gray-500">Gestiona las solicitudes de tu equipo.</p>
      </header>
      
      {loading ? <p>Cargando...</p> : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                    {req.assets?.image ? (
                        <img src={req.assets.image} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-xs">IMG</div>
                    )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{req.assets?.name || 'Activo Desconocido'}</h3>
                  <div className="text-sm text-gray-600 space-y-0.5">
                      <p>Solicitante: <span className="font-semibold text-gray-800">{req.requester_name}</span> <span className="text-gray-400">|</span> {req.requester_dept}</p>
                      <p className="italic text-gray-500">"{req.motive}"</p>
                      <p className="text-xs font-mono text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded mt-1">Duración: {req.days_requested} días</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 justify-end">
                <button 
                  onClick={() => openFeedback(req.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm font-medium transition-colors border border-yellow-200"
                  title="Devolver para más información"
                >
                  <MessageCircle size={16} /> Info
                </button>
                <button 
                  onClick={() => handleReject(req.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors border border-red-200"
                >
                  <X size={16} /> Rechazar
                </button>
                <button 
                  onClick={() => handleApprove(req.id)}
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md shadow-green-900/20 transition-transform active:scale-95"
                >
                  <Check size={16} /> Aprobar
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="text-gray-300 w-8 h-8"/>
                </div>
                <p className="text-gray-500 font-medium">¡Todo listo! No hay solicitudes pendientes.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal para solicitar info */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><AlertCircle className="text-yellow-500"/> Solicitar más detalles</h3>
            <p className="text-sm text-gray-500 mb-4">La solicitud se devolverá al usuario para que edite la información.</p>
            <textarea
              className="w-full border border-gray-300 p-3 rounded-lg mb-4 h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="Ej: Por favor especifica para qué proyecto usarás este equipo..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setFeedbackModal({isOpen: false, reqId: null})} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancelar</button>
              <button onClick={submitFeedback} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Enviar Solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};