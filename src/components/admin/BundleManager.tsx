import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Asset } from '../../types';
import { Package, Plus, Save } from 'lucide-react';

export const BundleManager = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bundleName, setBundleName] = useState('');
  const [bundleDesc, setBundleDesc] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar activos disponibles (que no estén ya en un bundle)
  useEffect(() => {
    const loadAssets = async () => {
      const { data } = await supabase
        .from('assets')
        .select('*')
        .is('bundle_id', null) // Solo activos sin bundle
        .eq('status', 'Operativa'); // Solo operativos
      if (data) setAssets(data as Asset[]);
    };
    loadAssets();
  }, []);

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const createBundle = async () => {
    if (!bundleName || selectedAssetIds.length === 0) return alert("Falta nombre o activos");
    setLoading(true);

    try {
      // 1. Crear el Bundle
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .insert([{ name: bundleName, description: bundleDesc }])
        .select()
        .single();

      if (bundleError) throw bundleError;

      // 2. Actualizar los activos seleccionados con el ID del bundle
      const { error: updateError } = await supabase
        .from('assets')
        .update({ bundle_id: bundle.id })
        .in('id', selectedAssetIds);

      if (updateError) throw updateError;

      alert("✅ Bundle creado exitosamente");
      // Reset
      setBundleName('');
      setBundleDesc('');
      setSelectedAssetIds([]);
      // Recargar lista para quitar los ya asignados
      const { data } = await supabase.from('assets').select('*').is('bundle_id', null).eq('status', 'Operativa');
      if (data) setAssets(data as Asset[]);

    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-zf-blue">
        <Package /> Creación de Bundles (Kits)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario Izquierdo */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre del Kit</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              placeholder="Ej. Kit Grabación Campo"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Descripción</label>
            <textarea 
              className="w-full border p-2 rounded" 
              placeholder="¿Qué contiene?"
              value={bundleDesc}
              onChange={(e) => setBundleDesc(e.target.value)}
            />
          </div>
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
            <p className="font-bold">{selectedAssetIds.length} activos seleccionados</p>
            <p>Estos activos se agruparán bajo un mismo ID para préstamos rápidos.</p>
          </div>
          <button 
            onClick={createBundle}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
          >
            <Save size={18} /> {loading ? 'Creando...' : 'Guardar Bundle'}
          </button>
        </div>

        {/* Lista de Activos Derecho */}
        <div className="border rounded-lg h-96 overflow-y-auto p-2 bg-gray-50">
          <p className="text-sm text-gray-500 mb-2 sticky top-0 bg-gray-50 pb-2">Selecciona los componentes:</p>
          {assets.map(asset => (
            <div 
              key={asset.id} 
              onClick={() => toggleAsset(asset.id)}
              className={`p-3 mb-2 rounded cursor-pointer border transition-colors flex justify-between items-center ${
                selectedAssetIds.includes(asset.id) ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div>
                <p className="font-bold text-sm">{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.tag || 'Sin Tag'} | {asset.serial}</p>
              </div>
              {selectedAssetIds.includes(asset.id) && <Check size={16} className="text-blue-600"/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};