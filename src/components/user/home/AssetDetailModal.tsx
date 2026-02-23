import { Card, Button } from '../../ui/core';
import { X, CheckCircle, Tag, MapPin, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { Asset } from '../../../types';

interface AssetDetailModalProps {
  asset: Asset;
  onClose: () => void;
  onRequest: (asset: Asset) => void;
  onAddToCart?: (asset: Asset) => boolean | void;
}

export function AssetDetailModal({ asset, onClose, onRequest, onAddToCart }: AssetDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-sm border-primary/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Ficha del Activo</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        {asset.image && (
          <div className="aspect-video bg-slate-800 rounded-xl overflow-hidden mb-4">
            <img src={asset.image} className="w-full h-full object-cover" alt={asset.name} />
          </div>
        )}

        <div className="space-y-2 mb-4">
          <div>
            <p className="text-white font-bold text-lg">{asset.name}</p>
            <p className="text-slate-500 text-xs font-mono">{asset.tag}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {asset.category && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Tag size={12} className="text-slate-500" />
                <span>{asset.category}</span>
              </div>
            )}
            {asset.location && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin size={12} className="text-slate-500" />
                <span>{asset.location}</span>
              </div>
            )}
            {asset.brand && (
              <div className="flex items-start gap-1.5 text-slate-400 col-span-2">
                <span className="text-slate-600">Marca:</span>
                <span>{asset.brand} {asset.model ? `— ${asset.model}` : ''}</span>
              </div>
            )}
          </div>

          {asset.description && (
            <p className="text-slate-400 text-xs leading-relaxed">{asset.description}</p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle size={10} /> Disponible para préstamo
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button variant="neon" className="flex-1" onClick={() => { onClose(); onRequest(asset); }}>
              Solicitar Ahora
            </Button>
          </div>
          {onAddToCart && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const added = onAddToCart?.(asset);
                onClose();
                if (added === true) toast.success(`${asset.name} añadido al carrito`);
                else if (added === false) toast.warning('Este activo ya está en el carrito');
              }}
            >
              <ShoppingCart size={14} className="mr-2" /> Añadir al carrito
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
