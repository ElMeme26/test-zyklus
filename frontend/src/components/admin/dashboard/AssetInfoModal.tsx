import React from 'react';
import { X } from 'lucide-react';
import { Card } from '../../ui/core';
import type { Asset } from '../../../types';

interface AssetInfoModalProps {
  asset?: Asset;
  relatedRequest?: { requester_name: string; status: string; expected_return_date?: string };
  onClose: () => void;
}

/** Modal con ficha técnica del activo (tras escanear QR o ver detalle). */
export function AssetInfoModal({ asset, relatedRequest, onClose }: AssetInfoModalProps) {
  if (!asset) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md border-primary/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Ficha Técnica</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          {asset.image && (
            <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
              <img src={asset.image} className="w-full h-full object-cover" alt={asset.name} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Nombre', asset.name],
              ['Tag', asset.tag],
              ['Estado', asset.status],
              ['Categoría', asset.category || '—'],
              ['Marca', asset.brand || '—'],
              ['Modelo', asset.model || '—'],
              ['Serie', asset.serial || '—'],
              ['Ubicación', asset.location || '—'],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-950 rounded-lg p-2 border border-slate-800">
                <p className="text-slate-500 text-[10px] uppercase font-bold">{k}</p>
                <p className="text-white font-medium mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </div>
          {relatedRequest && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-primary font-bold mb-1">Préstamo Activo</p>
              <p className="text-xs text-slate-300">Solicitante: {relatedRequest.requester_name}</p>
              <p className="text-xs text-slate-400">Estado: {relatedRequest.status}</p>
              {relatedRequest.expected_return_date && (
                <p className="text-xs text-slate-400">Retorno: {new Date(relatedRequest.expected_return_date).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
