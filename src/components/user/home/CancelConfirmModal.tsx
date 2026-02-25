import { Card, Button } from '../../ui/core';
import { AlertTriangle } from 'lucide-react';

interface CancelConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmación para cancelar una solicitud. */
export function CancelConfirmModal({ onConfirm, onCancel }: CancelConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-sm border-rose-500/30">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">¿Cancelar solicitud?</h3>
            <p className="text-slate-400 text-xs mt-1">El activo quedará disponible de nuevo. Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Mantener</Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-500 text-white border-0 font-bold" onClick={onConfirm}>Sí, cancelar</Button>
        </div>
      </Card>
    </div>
  );
}
