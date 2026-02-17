import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../../supabaseClient';
import { Request } from '../../types';
import { X, CheckCircle, AlertTriangle, Package, User as UserIcon } from 'lucide-react';

export const GuardScanner = () => {
  const [scannedData, setScannedData] = useState<Request | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleScan = async (rawValue: string) => {
    if (loading || scannedData) return;
    setLoading(true);
    setStatusMsg(null);

    try {
      // El QR puede ser un JSON {"type":"request", "id":123} o directo el ID
      let requestId = rawValue;
      try {
        const parsed = JSON.parse(rawValue);
        requestId = parsed.id;
      } catch (e) {
        // Asumimos que es el ID directo si falla el parse
      }

      const { data, error } = await supabase
        .from('requests')
        .select(`*, assets(*), users(*)`)
        .eq('id', requestId)
        .single();

      if (error || !data) throw new Error("Solicitud no encontrada en el sistema.");

      setScannedData(data as Request);

    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || "Error de lectura" });
    } finally {
      setLoading(false);
    }
  };

  const processTransaction = async () => {
    if (!scannedData) return;

    const currentStep = scannedData.security_check_step || 0;
    let newStatus = scannedData.status;
    let newStep = currentStep;
    let actionType = '';

    // LÓGICA DE NEGOCIO ZF HALO
    if (currentStep === 0) {
      // Intento de SALIDA
      if (scannedData.status !== 'APPROVED') {
        setStatusMsg({ type: 'error', text: `Error: El activo está en estado ${scannedData.status}, debe estar APPROVED.` });
        return;
      }
      newStep = 1;
      newStatus = 'ACTIVE';
      actionType = 'checkout';
    } else if (currentStep === 1) {
      // Intento de RETORNO
      if (scannedData.status !== 'ACTIVE' && scannedData.status !== 'OVERDUE') {
         // Permitimos retorno aunque esté vencido
         setStatusMsg({ type: 'error', text: "El activo no consta como entregado actualmente." });
         return;
      }
      newStep = 2;
      newStatus = 'RETURNED';
      actionType = 'checkin';
    } else {
      setStatusMsg({ type: 'error', text: "Este pase ya ha completado su ciclo (Salida y Retorno)." });
      return;
    }

    // Actualizar DB
    const updates: any = {
      security_check_step: newStep,
      status: newStatus,
      security_notes: notes ? `${scannedData.security_notes || ''} | [${new Date().toLocaleDateString()}] ${notes}` : scannedData.security_notes
    };

    if (actionType === 'checkout') updates.checkout_at = new Date().toISOString();
    if (actionType === 'checkin') updates.returned_at = new Date().toISOString();

    const { error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', scannedData.id);

    if (error) {
      setStatusMsg({ type: 'error', text: "Error al guardar en base de datos." });
    } else {
      alert(actionType === 'checkout' ? "✅ SALIDA AUTORIZADA" : "✅ RETORNO REGISTRADO");
      setScannedData(null);
      setNotes('');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
      <div className="w-full max-w-md">
        <header className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
          <h1 className="text-xl font-bold text-blue-400 tracking-wider">ZF HALO <span className="text-white">SECURITY</span></h1>
          <div className="px-3 py-1 bg-blue-900 rounded-full text-xs font-mono">GUARD MODE</div>
        </header>

        {statusMsg && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${statusMsg.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500' : 'bg-green-500/20 text-green-200'}`}>
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">{statusMsg.text}</span>
          </div>
        )}

        {!scannedData ? (
          <div className="bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl relative">
            <Scanner onScan={(res) => res && handleScan(res[0].rawValue)} />
            <div className="absolute bottom-0 w-full bg-black/60 p-4 text-center text-sm text-gray-300 backdrop-blur-sm">
              Enfoque el código QR del pase de salida
            </div>
            {loading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center font-bold animate-pulse">VERIFICANDO...</div>}
          </div>
        ) : (
          <div className="bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8">
            {/* Header Modal */}
            <div className={`p-4 flex justify-between items-center ${scannedData.security_check_step === 0 ? 'bg-emerald-600' : 'bg-blue-600'} text-white`}>
              <h2 className="font-bold text-lg flex items-center gap-2">
                {scannedData.security_check_step === 0 ? 'Validar SALIDA' : 'Validar RETORNO'}
              </h2>
              <button onClick={() => setScannedData(null)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Asset Info */}
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-300">
                  <img src={scannedData.assets?.image || '/placeholder-asset.png'} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{scannedData.assets?.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">S/N: {scannedData.assets?.serial}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                    {scannedData.assets?.category || 'Equipo General'}
                  </span>
                </div>
              </div>

              <hr className="border-gray-100"/>

              {/* User Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <UserIcon size={16} className="text-blue-600"/>
                  <span className="font-semibold text-sm">{scannedData.requester_name}</span>
                </div>
                <div className="pl-6 text-xs text-gray-500">
                  <p>Depto: {scannedData.requester_dept}</p>
                  <p>ID Solicitud: #{scannedData.id}</p>
                </div>
              </div>

              {/* Checkin Logic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones / Daños</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder={scannedData.security_check_step === 0 ? "Todo correcto..." : "Describir si hay daños..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button 
                onClick={processTransaction}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2
                  ${scannedData.security_check_step === 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <CheckCircle size={20} />
                {scannedData.security_check_step === 0 ? 'AUTORIZAR SALIDA' : 'CONFIRMAR RECEPCIÓN'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};