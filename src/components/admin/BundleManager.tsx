import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { Asset } from '../../types';
import { Package, Check, Save } from 'lucide-react';

export const BundleManager = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bundleName, setBundleName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar activos sin bundle asignado
    const load = async () => {
      const { data } = await supabase.from('assets').select('*').is('bundle_id', null).limit(50);
      if (data) setAssets(data as Asset[]);
    };
    load();
  }, [loading]);

  const handleSave = async () => {
    if (!bundleName || selectedIds.length === 0) return alert("Faltan datos");
    setLoading(true);
    
    // 1. Crear Bundle
    const { data: bundle, error } = await supabase
      .from('bundles')
      .insert([{ name: bundleName }])
      .select()
      .single();

    if (error) {
        alert("Error creando bundle");
        setLoading(false);
        return;
    }

    // 2. Actualizar Activos
    await supabase
      .from('assets')
      .update({ bundle_id: bundle.id })
      .in('id', selectedIds);

    alert("Bundle creado!");
    setBundleName('');
    setSelectedIds([]);
    setLoading(false);
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

        <div className="border rounded h-64 overflow-y-auto p-2">
            <p className="text-xs text-gray-500 mb-2">Selecciona los activos:</p>
            {assets.map(a => (
                <div 
                    key={a.id} 
                    onClick={() => setSelectedIds(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                    className={`p-2 border-b cursor-pointer flex justify-between ${selectedIds.includes(a.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                    <span className="text-sm">{a.name}</span>
                    {selectedIds.includes(a.id) && <Check size={16} className="text-blue-600"/>}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};