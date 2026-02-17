import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Request } from '../../types';
import { Check, X, MessageCircle, AlertCircle } from 'lucide-react';

export const ManagerInbox = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el modal de feedback
  const [feedbackModal, setFeedbackModal] = useState<{isOpen: boolean, reqId: number | null}>({isOpen: false, reqId: null});
  const [feedbackText, setFeedbackText] = useState('');

  const fetchRequests = async () => {
    // Busca solicitudes PENDING donde el manager del usuario sea el usuario actual
    // (Simplificado para el ejemplo: trae todas las PENDING)
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
    
    // CAMBIO CLAVE: Estado ACTION_REQUIRED y guardar feedback
    await supabase.from('requests').update({
      status: 'ACTION_REQUIRED',
      rejection_feedback: feedbackText
    }).eq('id', feedbackModal.reqId);

    setFeedbackModal({ isOpen: false, reqId: null });
    fetchRequests();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Solicitudes Pendientes de Aprobación</h1>
      
      {loading ? <p>Cargando...</p> : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400 flex justify-between items-center">
              <div className="flex gap-4">
                <img src={req.assets?.image} className="w-16 h-16 object-cover rounded bg-gray-100" />
                <div>
                  <h3 className="font-bold text-gray-900">{req.assets?.name}</h3>
                  <p className="text-sm text-gray-600">Solicitado por: <span className="font-semibold">{req.requester_name}</span> ({req.requester_dept})</p>
                  <p className="text-sm text-gray-500 italic">"{req.motive}"</p>
                  <p className="text-xs text-gray-400 mt-1">Duración: {req.days_requested} días</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => openFeedback(req.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition-colors"
                  title="Devolver para más información"
                >
                  <MessageCircle size={16} /> Info
                </button>
                <button 
                  onClick={() => handleReject(req.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium transition-colors"
                >
                  <X size={16} /> Rechazar
                </button>
                <button 
                  onClick={() => handleApprove(req.id)}
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium shadow transition-colors"
                >
                  <Check size={16} /> Aprobar
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-gray-500 text-center py-10">No hay solicitudes pendientes.</p>}
        </div>
      )}

      {/* Modal para solicitar info */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-2">Solicitar más detalles</h3>
            <p className="text-sm text-gray-500 mb-4">La solicitud se devolverá al usuario para que la edite.</p>
            <textarea
              className="w-full border p-2 rounded mb-4 h-24"
              placeholder="Ej: Por favor especifica para qué proyecto usarás este equipo..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setFeedbackModal({isOpen: false, reqId: null})} className="px-4 py-2 text-gray-600">Cancelar</button>
              <button onClick={submitFeedback} className="px-4 py-2 bg-blue-600 text-white rounded">Enviar Solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};