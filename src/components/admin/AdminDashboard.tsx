import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext'; // Ahora esto funcionará
import type { Asset } from '../../types';
import { InstitutionsManager } from './InstitutionsManager';
import { BundleManager } from './BundleManager';
// Asegúrate de tener instalado lucide-react: npm install lucide-react
import { 
  LogOut, Database, Plus, Search, Edit, Trash2, X, Upload, 
  CheckSquare, Square, LayoutGrid, Building2, Package
} from 'lucide-react';

export const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  
  // Extraemos las funciones del contexto que acabamos de arreglar
  const { assets, addAsset, updateAsset, deleteAsset, getNextTag } = useData();

  const [activeTab, setActiveTab] = useState<'inventory' | 'bundles' | 'institutions'>('inventory');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});

  // Filtrado simple
  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    (a.tag && a.tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveAsset = async () => {
    if (currentAsset.id) {
      await updateAsset(currentAsset.id, currentAsset);
    } else {
      await addAsset(currentAsset as Asset);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este activo?")) {
      await deleteAsset(id);
    }
  };

  const openNewAssetModal = () => {
    setCurrentAsset({ 
      tag: getNextTag(), 
      status: 'Operativa', 
      category: 'General',
      name: ''
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-600 rounded-lg"><Database size={20} className="text-white"/></div>
           <div>
               <h1 className="font-bold text-white text-lg">ZF Halo Admin</h1>
               <p className="text-xs text-slate-400">Bienvenido, {user?.name}</p>
           </div>
        </div>
        <button onClick={signOut} className="text-slate-400 hover:text-red-400 p-2"><LogOut size={20}/></button>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 p-4 hidden md:block">
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
              <LayoutGrid size={18}/> Inventario
            </button>
            <button onClick={() => setActiveTab('bundles')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'bundles' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Package size={18}/> Bundles (Kits)
            </button>
            <button onClick={() => setActiveTab('institutions')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'institutions' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Building2 size={18}/> Instituciones
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          
          {/* VISTA: INVENTARIO */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4"/>
                  <input 
                    className="w-full bg-slate-900 border border-slate-700 rounded pl-9 p-2 text-white focus:border-blue-500 outline-none"
                    placeholder="Buscar activo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button onClick={openNewAssetModal} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2">
                  <Plus size={16}/> Nuevo Activo
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-950 uppercase font-bold text-xs">
                    <tr>
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Tag / Serie</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-800/50">
                        <td className="p-4 font-medium text-white">{asset.name}</td>
                        <td className="p-4">{asset.tag} <br/><span className="text-xs text-slate-500">{asset.serial}</span></td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs ${asset.status === 'Operativa' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button onClick={() => { setCurrentAsset(asset); setShowModal(true); }} className="p-1 hover:text-blue-400"><Edit size={16}/></button>
                          <button onClick={() => handleDelete(asset.id)} className="p-1 hover:text-red-400"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAssets.length === 0 && <div className="p-8 text-center text-slate-500">No se encontraron activos.</div>}
              </div>
            </div>
          )}

          {/* VISTA: BUNDLES */}
          {activeTab === 'bundles' && <BundleManager />}

          {/* VISTA: INSTITUCIONES */}
          {activeTab === 'institutions' && <InstitutionsManager />}

        </main>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">{currentAsset.id ? 'Editar Activo' : 'Nuevo Activo'}</h3>
                <button onClick={() => setShowModal(false)}><X className="text-slate-500 hover:text-white"/></button>
             </div>
             
             <div className="space-y-3">
               <input 
                 className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white" 
                 placeholder="Nombre del equipo"
                 value={currentAsset.name} 
                 onChange={e => setCurrentAsset({...currentAsset, name: e.target.value})}
               />
               <div className="grid grid-cols-2 gap-3">
                 <input 
                   className="bg-slate-950 border border-slate-800 p-2 rounded text-white" 
                   placeholder="Tag (ZF-XXX)"
                   value={currentAsset.tag} 
                   onChange={e => setCurrentAsset({...currentAsset, tag: e.target.value})}
                 />
                 <input 
                   className="bg-slate-950 border border-slate-800 p-2 rounded text-white" 
                   placeholder="Serie (S/N)"
                   value={currentAsset.serial} 
                   onChange={e => setCurrentAsset({...currentAsset, serial: e.target.value})}
                 />
               </div>
               <select 
                 className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white"
                 value={currentAsset.status}
                 onChange={e => setCurrentAsset({...currentAsset, status: e.target.value})}
               >
                 <option value="Operativa">Operativa</option>
                 <option value="En mantenimiento">En mantenimiento</option>
                 <option value="Prestada">Prestada</option>
               </select>
             </div>

             <div className="flex justify-end gap-2 mt-4">
               <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
               <button onClick={handleSaveAsset} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">Guardar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};