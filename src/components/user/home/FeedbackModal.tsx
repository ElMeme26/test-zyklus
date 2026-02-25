import { useState } from 'react';
import { Card, Button } from '../../ui/core';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { Request } from '../../../types';

interface FeedbackModalProps {
  request: Request;
  onClose: () => void;
  onRefresh: () => void;
}

/** Modal para responder al feedback del líder sobre una solicitud. */
export function FeedbackModal({ request, onClose, onRefresh }: FeedbackModalProps) {
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    try {
      const { respondToFeedback } = await import('../../../api/requests');
      await respondToFeedback(request.id, text, request.bundle_group_id ?? undefined);
      toast.success('Respuesta enviada al líder');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const reasonText = request.rejection_feedback || request.feedback_log;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-sm border-orange-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Responder al Líder</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-orange-300">"{reasonText}"</p>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tu respuesta o justificación..."
          className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-400 text-black" onClick={handleSubmit}>Enviar</Button>
        </div>
      </Card>
    </div>
  );
}
