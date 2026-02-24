import { useState } from 'react';
import { Card, Button } from '../../ui/core';

interface RejectionModalProps {
  type: 'reject' | 'return';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** Modal para que el líder rechace una solicitud o la devuelva con comentarios al usuario. */
export function RejectionModal({ onConfirm, onCancel, type }: RejectionModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className={`w-full max-w-sm border ${type === 'reject' ? 'border-rose-500/30' : 'border-amber-500/30'}`}>
        <h3 className="text-white font-bold mb-1">
          {type === 'reject' ? 'Rechazar Solicitud' : 'Devolver para Corrección'}
        </h3>
        <p className="text-slate-400 text-xs mb-4">
          {type === 'reject'
            ? 'Esta acción cancela definitivamente la solicitud y libera el activo.'
            : 'El usuario recibirá una notificación para completar la información.'}
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={type === 'reject' ? 'Razón del rechazo...' : '¿Qué información adicional se requiere?'}
          className="w-full h-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button
            className={`flex-1 ${type === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-500 hover:bg-amber-400 text-black'} font-bold`}
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason.trim()}
          >
            {type === 'reject' ? 'Confirmar Rechazo' : 'Confirmar Devolución'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
