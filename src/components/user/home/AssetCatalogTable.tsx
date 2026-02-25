import { Card, Button } from '../../ui/core';
import { Package, MapPin, ShoppingCart, ChevronRight } from 'lucide-react';
import type { Asset } from '../../../types';

const statusColors: Record<string, string> = {
  'Disponible': 'text-emerald-400 bg-emerald-500/10',
  'Prestada': 'text-cyan-400 bg-cyan-500/10',
  'En trámite': 'text-amber-400 bg-amber-500/10',
};

interface AssetCatalogTableProps {
  assets: Asset[];
  onSelect: (a: Asset) => void;
  onAddToCart?: (a: Asset) => void;
}

/** Tabla del catálogo de activos con vista cuadrícula o lista. */
export function AssetCatalogTable({ assets, onSelect, onAddToCart }: AssetCatalogTableProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm text-slate-400">
        <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
          <tr>
            <th className="p-3">Activo</th>
            <th className="p-3 hidden sm:table-cell">Categoría</th>
            <th className="p-3 hidden md:table-cell">Ubicación</th>
            <th className="p-3 text-center">Estado</th>
            <th className="p-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {assets.map(a => (
            <tr key={a.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => onSelect(a)}>
              <td className="p-3">
                <span className="text-white font-medium">{a.name}</span>
                <span className="text-slate-500 text-xs ml-2 font-mono">{a.tag}</span>
              </td>
              <td className="p-3 hidden sm:table-cell text-xs text-slate-400">{a.category || '—'}</td>
              <td className="p-3 hidden md:table-cell text-xs text-slate-500">
                {a.location ? <span className="flex items-center gap-1"><MapPin size={10} />{a.location}</span> : '—'}
              </td>
              <td className="p-3 text-center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${statusColors[a.status] || 'text-slate-400 bg-slate-700'}`}>
                  {a.status}
                </span>
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onAddToCart && (
                    <button
                      onClick={e => { e.stopPropagation(); onAddToCart(a); }}
                      className="p-2 rounded-lg border border-slate-600 text-slate-400 hover:text-primary hover:border-primary/50 transition-all"
                      title="Añadir al carrito"
                    >
                      <ShoppingCart size={14} />
                    </button>
                  )}
                  <Button size="sm" variant="neon" className="text-[11px] h-7" onClick={e => { e.stopPropagation(); onSelect(a); }}>
                    Solicitar <ChevronRight size={12} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {assets.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay activos disponibles con ese filtro.</p>
        </div>
      )}
    </div>
  );
}
