import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
// CORRECCIÓN CLAVE: Agregar "type" para evitar que el navegador busque código JS que no existe
import type { Asset, Institution } from '../../types';
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
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="font-bold text-xl text-blue-600 tracking-tight">ZF Halo <span className="text-gray-400 text-sm font-normal">| Catálogo</span></h1>
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
            <button onClick={signOut} className="p-2 text-gray-500 hover:text-red-600 transition-colors"><LogOut size={18}/></button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Activos Disponibles</h2>
            <p className="text-gray-500">Selecciona un equipo para iniciar una solicitud de préstamo.</p>
        </div>

        {/* Catálogo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.map(asset => (
            <div key={asset.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group hover:ring-2 ring-blue-500 transition-all cursor-pointer hover:shadow-md"
                 onClick={() => setSelectedAsset(asset)}>
              <div className="h-40 bg-gray-100 relative flex items-center justify-center">
                {asset.image ? (
                    <img src={asset.image} className="w-full h-full object-cover"/>
                ) : (
                    <div className="text-gray-300 font-bold text-4xl select-none">ZF</div>
                )}
                
                {asset.bundle_id && (
                   <span className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Bundle</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 truncate" title={asset.name}>{asset.name}</h3>
                <p className="text-xs text-gray-500 uppercase font-bold mt-1 tracking-wide">{asset.category || 'General'}</p>
                <div className="mt-4 flex justify-between items-end">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">DISPONIBLE</span>
                  <span className="text-xs text-gray-400 font-mono">{asset.model || 'S/M'}</span>
                </div>
              </div>
            </div>
          ))}
          {assets.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
                No hay activos operativos disponibles en este momento.
             </div>
          )}
        </div>
      </main>

      {/* Modal de Solicitud */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
               <h3 className="font-bold text-lg">Solicitar Préstamo</h3>
               <button onClick={() => setSelectedAsset(null)} className="text-white/70 hover:text-white transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleRequest} className="p-6 space-y-5">
              <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="w-16 h-16 bg-white rounded-md border border-blue-200 flex items-center justify-center shrink-0">
                    {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover rounded-md"/> : <span className="text-blue-200 font-bold">IMG</span>}
                </div>
                <div>
                    <p className="font-bold text-blue-900 leading-tight">{selectedAsset.name}</p>
                    <p className="text-xs text-blue-600 mt-1 font-mono">{selectedAsset.serial || 'Sin Serie'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Motivo del préstamo</label>
                <textarea 
                  required
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  rows={2}
                  value={requestData.motive}
                  onChange={e => setRequestData({...requestData, motive: e.target.value})}
                  placeholder="Descripción del proyecto o uso..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Calendar size={12}/> Días requeridos</label>
                    <input 
                      type="number" min="1" max="30" required
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm"
                      value={requestData.days}
                      onChange={e => setRequestData({...requestData, days: parseInt(e.target.value)})}
                    />
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <input 
                          type="checkbox" 
                          checked={isExternal}
                          onChange={e => setIsExternal(e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">¿Préstamo Externo?</span>
                    </label>
                </div>
              </div>

              {/* Selector de Instituciones (Solo si es externo) */}
              {isExternal && (
                <div className="animate-in slide-in-from-top-2 border-t pt-4 mt-2">
                    <label className="block text-xs font-bold text-purple-700 uppercase mb-1.5 flex items-center gap-1"><BuildingIcon size={12}/> Institución Destino</label>
                    <select 
                      required={isExternal}
                      className="w-full border border-purple-200 bg-purple-50 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-purple-900"
                      value={requestData.institution_id}
                      onChange={e => setRequestData({...requestData, institution_id: e.target.value})}
                    >
                        <option value="">-- Seleccionar Institución --</option>
                        {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">* Requiere aprobación especial de seguridad.</p>
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold hover:bg-blue-700 transition-transform active:scale-[0.98] shadow-lg shadow-blue-900/20">
                CONFIRMAR SOLICITUD
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};