import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../../supabaseClient';
import type { Request } from '../../types'; // Importación de TIPO segura
import { X, CheckCircle, AlertTriangle, User as UserIcon } from 'lucide-react';

export const GuardScanner = () => {
  const [scannedData, setScannedData] = useState<Request | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleScan = async (rawValue: string) => {
    if (loading || scannedData || !rawValue) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      // Intentar parsear si es JSON o usar rawValue como ID
      let requestId = rawValue;
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed.id) requestId = parsed.id;
      } catch {}

      const { data, error } = await supabase
        .from('requests')
        .select(`*, assets(*), users(*)`)
        .eq('id', requestId)
        .single();

      if (error || !data) throw new Error("Solicitud no encontrada.");

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

    // LÓGICA ZF HALO
    if (currentStep === 0) {
      if (scannedData.status !== 'APPROVED') {
        setStatusMsg({ type: 'error', text: `Estado inválido: ${scannedData.status}. Requiere APPROVED.` });
        return;
      }
      newStep = 1;
      newStatus = 'ACTIVE';
      actionType = 'checkout';
    } else if (currentStep === 1) {
      newStep = 2;
      newStatus = 'RETURNED';
      actionType = 'checkin';
    } else {
      setStatusMsg({ type: 'error', text: "Ciclo completado anteriormente." });
      return;
    }

    const updates: any = {
      security_check_step: newStep,
      status: newStatus,
      security_notes: notes ? `${scannedData.security_notes || ''} | ${notes}` : scannedData.security_notes
    };

    if (actionType === 'checkout') updates.checkout_at = new Date().toISOString();
    if (actionType === 'checkin') updates.returned_at = new Date().toISOString();

    const { error } = await supabase.from('requests').update(updates).eq('id', scannedData.id);

    if (error) {
      setStatusMsg({ type: 'error', text: "Error al guardar." });
    } else {
      alert(actionType === 'checkout' ? "✅ SALIDA AUTORIZADA" : "✅ RETORNO REGISTRADO");
      setScannedData(null);
      setNotes('');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-xl font-bold text-blue-400 mb-4">ZF HALO SECURITY</h1>

      {statusMsg && (
        <div className={`mb-4 p-3 rounded w-full max-w-md ${statusMsg.type === 'error' ? 'bg-red-900' : 'bg-green-900'}`}>
          {statusMsg.text}
        </div>
      )}

      {!scannedData ? (
        <div className="w-full max-w-sm border-2 border-slate-600 rounded-lg overflow-hidden">
          <Scanner onScan={(res) => res && res.length > 0 && handleScan(res[0].rawValue)} />
          <p className="text-center p-2 text-sm text-gray-400">Escanea el QR del pase</p>
        </div>
      ) : (
        <div className="bg-white text-slate-900 rounded-xl w-full max-w-md p-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">{scannedData.security_check_step === 0 ? 'SALIDA' : 'RETORNO'}</h2>
            <button onClick={() => setScannedData(null)}><X /></button>
          </div>
          
          <div className="space-y-2 mb-4">
            <p><strong>Activo:</strong> {scannedData.assets?.name}</p>
            <p><strong>Solicitante:</strong> {scannedData.requester_name}</p>
            <p><strong>Depto:</strong> {scannedData.requester_dept}</p>
          </div>

          <textarea 
            className="w-full border p-2 rounded mb-4 text-black"
            placeholder="Observaciones..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button 
            onClick={processTransaction}
            className="w-full bg-blue-600 text-white py-3 rounded font-bold"
          >
            CONFIRMAR
          </button>
        </div>
      )}
    </div>
  );
};