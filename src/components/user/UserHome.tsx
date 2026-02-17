import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { Asset, Institution } from '../../types';
import { LogOut, Search, Calendar, Building as BuildingIcon } from 'lucide-react';

export const UserHome = () => {
  const { user, signOut } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  
  // Estado del carrito/solicitud
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isExternal, setIsExternal] = useState(false);
  const [requestData, setRequestData] = useState({
    days: 1,
    motive: '',
    institution_id: ''
  });

  useEffect(() => {
    // 1. Cargar activos disponibles
    const loadData = async () => {
      const { data: assetsData } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'Operativa'); // Ajusta según tu CSV (Operativa, Disponible, etc)
      
      if (assetsData) setAssets(assetsData as Asset[]);

      // 2. Cargar instituciones para el dropdown
      const { data: instData } = await supabase.from('institutions').select('*');
      if (instData) setInstitutions(instData as Institution[]);
    };
    loadData();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !user) return;

    const payload: any = {
      asset_id: selectedAsset.id,
      user_id: user.id,
      requester_name: user.name,
      requester_dept: user.dept || 'N/A',
      days_requested: requestData.days,
      motive: requestData.motive,
      status: 'PENDING',
      security_check_step: 0
    };

    // Si es externo, agregar institución
    if (isExternal && requestData.institution_id) {
      payload.institution_id = parseInt(requestData.institution_id);
    }

    const { error } = await supabase.from('requests').insert([payload]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Solicitud enviada exitosamente.");
      setSelectedAsset(null);
      setRequestData({ days: 1, motive: '', institution_id: '' });
      setIsExternal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="font-bold text-xl text-blue-600">ZF Halo <span className="text-gray-400 text-sm">| Catálogo</span></h1>
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user?.name}</span>
            <button onClick={signOut} className="p-2 text-gray-500 hover:text-red-600"><LogOut size={18}/></button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        {/* Catálogo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.map(asset => (
            <div key={asset.id} className="bg-white rounded-lg shadow overflow-hidden group hover:ring-2 ring-blue-500 transition-all cursor-pointer"
                 onClick={() => setSelectedAsset(asset)}>
              <div className="h-40 bg-gray-200 relative">
                <img src={asset.image || '/placeholder.png'} className="w-full h-full object-cover"/>
                {asset.bundle_id && (
                   <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">Bundle</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 truncate">{asset.name}</h3>
                <p className="text-sm text-gray-500">{asset.category || 'General'}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Disponible</span>
                  <span className="text-xs text-gray-400">{asset.model}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal de Solicitud */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
               <h3 className="font-bold text-lg">Solicitar Préstamo</h3>
               <button onClick={() => setSelectedAsset(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleRequest} className="p-6 space-y-4">
              <div className="flex gap-4 items-center bg-blue-50 p-3 rounded-lg">
                <img src={selectedAsset.image || '/placeholder.png'} className="w-16 h-16 rounded object-cover bg-white"/>
                <div>
                    <p className="font-bold text-blue-900">{selectedAsset.name}</p>
                    <p className="text-xs text-blue-700">{selectedAsset.serial}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Motivo del préstamo</label>
                <textarea 
                  required
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  value={requestData.motive}
                  onChange={e => setRequestData({...requestData, motive: e.target.value})}
                  placeholder="Descripción del proyecto o uso..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1"><Calendar size={14} className="inline"/> Días requeridos</label>
                    <input 
                      type="number" min="1" max="30" required
                      className="w-full border p-2 rounded"
                      value={requestData.days}
                      onChange={e => setRequestData({...requestData, days: parseInt(e.target.value)})}
                    />
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isExternal}
                          onChange={e => setIsExternal(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">¿Préstamo Externo?</span>
                    </label>
                </div>
              </div>

              {/* Selector de Instituciones (Solo si es externo) */}
              {isExternal && (
                <div className="animate-in slide-in-from-top-2">
                    <label className="block text-sm font-medium mb-1 text-purple-700"><BuildingIcon size={14} className="inline"/> Institución Destino</label>
                    <select 
                      required={isExternal}
                      className="w-full border border-purple-300 bg-purple-50 p-2 rounded focus:ring-2 focus:ring-purple-500"
                      value={requestData.institution_id}
                      onChange={e => setRequestData({...requestData, institution_id: e.target.value})}
                    >
                        <option value="">-- Seleccionar Institución --</option>
                        {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">* Requiere aprobación especial de seguridad.</p>
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                Confirmar Solicitud
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};