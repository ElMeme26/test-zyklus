import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { getAssetsPaginated } from '../../api/assets';
import { Package, Check, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Asset } from '../../types';

const PAGE_SIZE = 24;

export const BundleManager = () => {
  const { createBundle } = useData();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [bundleName, setBundleName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAssets = useCallback(async (p: number) => {
    setLoadingAssets(true);
    try {
      const res = await getAssetsPaginated(p, PAGE_SIZE, { unbundledOnly: true });
      setAssets(res.assets);
      setTotal(res.total);
    } catch (err) {
      console.error('BundleManager loadAssets:', err);
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    loadAssets(page);
  }, [loadAssets, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleSave = async () => {
    if (!bundleName || selectedIds.length === 0) {
      toast.error('Faltan datos');
      return;
    }
    setLoading(true);
    try {
      await createBundle(bundleName, '', selectedIds);
      toast.success('Kit creado');
      setBundleName('');
      setSelectedIds([]);
      loadAssets(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creando kit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4 flex gap-2"><Package /> Crear Bundle</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del Kit</label>
          <input
            className="w-full border p-2 rounded"
            value={bundleName}
            onChange={e => setBundleName(e.target.value)}
            placeholder="Ej: Kit de Grabación"
          />
          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded flex justify-center gap-2"
          >
            <Save size={18} /> Guardar
          </button>
        </div>

        <div className="border rounded min-h-[200px] flex flex-col">
          <p className="text-xs text-gray-500 mb-2 p-2">Selecciona los activos (sin combo):</p>
          <div className="flex-1 overflow-y-auto p-2 min-h-[180px]">
            {loadingAssets ? (
              <p className="text-sm text-gray-500">Cargando activos...</p>
            ) : (
              assets.map(a => (
                <div
                  key={a.id}
                  onClick={() => setSelectedIds(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                  className={`p-2 border-b cursor-pointer flex justify-between ${selectedIds.includes(a.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <span className="text-sm">{a.name}</span>
                  {selectedIds.includes(a.id) && <Check size={16} className="text-blue-600"/>}
                </div>
              ))
            )}
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between p-2 border-t text-xs text-gray-500 gap-2">
              <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>Pág. {page}/{totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
