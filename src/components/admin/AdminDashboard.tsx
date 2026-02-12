import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { Asset } from '../../types';
import { Button, Input } from '../ui/core';
import { LogOut, Database, Plus, Search, Bot, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

// --- ZYKLA WIDGET ---
function ZyklaWidget({ assets }: { assets: Asset[] }) {
  const totalValue = assets.reduce((sum, a) => sum + (Number(a.commercial_value) || 0), 0);
  const maintenanceCount = assets.filter(a => a.status === 'En mantenimiento').length;
  const criticalStock = assets.filter(a => a.status === 'Operativa' && a.category === 'IT').length;

  const insight = useMemo(() => {
    if (maintenanceCount > 5) return {
      text: `⚠️ Alerta: Tienes ${maintenanceCount} equipos en mantenimiento. Contacta a soporte.`,
      color: "text-yellow-400"
    };
    if (criticalStock < 3) return {
      text: `📉 Stock Bajo en IT: Solo quedan ${criticalStock} disponibles.`,
      color: "text-rose-400"
    };
    return {
      text: `✅ Todo en orden. Valor del inventario: $${(totalValue/1000).toFixed(1)}k USD.`,
      color: "text-emerald-400"
    };
  }, [maintenanceCount, criticalStock, totalValue]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 flex items-start gap-4">
      <div className={`bg-slate-800 p-3 rounded-xl ${insight.color}`}><Bot size={24}/></div>
      <div>
        <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider mb-1">Zykla Intelligence</h3>
        <p className="text-slate-300 text-sm">{insight.text}</p>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { logout } = useAuth();
  const { assets, addAsset, updateAsset, deleteAsset } = useData();
  
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [statusFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});

  const filteredAssets = assets.filter(a => {
    const matchesSearch = (a.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
                          (a.tag?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesCat = catFilter === 'Todas' || a.category === catFilter;
    const matchesStatus = statusFilter === 'Todos' || a.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = filteredAssets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentAsset({ status: 'Operativa', category: 'IT', image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400' });
    setShowModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setIsEditing(true);
    setCurrentAsset(asset);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentAsset.name || !currentAsset.tag) return;
    if (isEditing && currentAsset.id) {
      await updateAsset(currentAsset.id, currentAsset);
    } else {
      await addAsset(currentAsset);
    }
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans pb-24 relative">
      <header className="flex justify-between items-center mb-6 pt-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="text-cyan-500"/> Panel Patrimonial
          </h1>
          <p className="text-xs text-slate-500 mt-1">Control Maestro</p>
        </div>
        <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
      </header>

      <ZyklaWidget assets={assets} />

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-slate-900 border-slate-800"/>
        </div>
        <select className="bg-slate-900 border border-slate-800 rounded-lg text-white text-xs px-3" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="Todas">Todas las Categorías</option>
          <option value="IT">IT</option>
          <option value="Lab Radar">Lab Radar</option>
          <option value="Validación HIL">Validación HIL</option>
          <option value="Vehículos">Vehículos</option>
        </select>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-500">
            <tr>
              <th className="p-4">Activo</th>
              <th className="p-4">Ubicación</th>
              <th className="p-4 text-right">Valor</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedAssets.map(asset => (
              <tr key={asset.id} className="hover:bg-slate-800/50">
                <td className="p-4 flex items-center gap-3">
                  <img src={asset.image} className="w-8 h-8 rounded bg-slate-800 object-cover" />
                  <div>
                    <div className="font-bold text-white">{asset.name}</div>
                    <div className="text-xs font-mono">{asset.tag}</div>
                  </div>
                </td>
                <td className="p-4 text-xs">{asset.location}</td>
                <td className="p-4 text-right text-emerald-400">${Number(asset.commercial_value).toLocaleString()}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${asset.status === 'Operativa' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700'}`}>{asset.status}</span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => openEditModal(asset)} className="text-cyan-400 p-1 hover:bg-cyan-900/20 rounded"><Edit size={16}/></button>
                  <button onClick={() => deleteAsset(asset.id)} className="text-rose-400 p-1 hover:bg-rose-900/20 rounded"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-4 flex justify-between items-center border-t border-slate-800">
          <span className="text-xs text-slate-500">Pág {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14}/></Button>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14}/></Button>
          </div>
        </div>
      </div>

      <button onClick={openCreateModal} className="fixed bottom-6 right-6 w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg text-black z-20 hover:scale-105 transition-transform"><Plus size={24} /></button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-4">
            <div className="flex justify-between">
              <h3 className="text-white font-bold">{isEditing ? 'Editar' : 'Nuevo'} Activo</h3>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400" /></button>
            </div>
            <Input placeholder="Nombre" value={currentAsset.name || ''} onChange={e => setCurrentAsset({...currentAsset, name: e.target.value})} />
            <div className="flex gap-2">
              <Input placeholder="Tag" value={currentAsset.tag || ''} onChange={e => setCurrentAsset({...currentAsset, tag: e.target.value})} />
              <Input placeholder="Serie" value={currentAsset.serial || ''} onChange={e => setCurrentAsset({...currentAsset, serial: e.target.value})} />
            </div>
            <Input type="number" placeholder="Valor Comercial" value={currentAsset.commercial_value || ''} onChange={e => setCurrentAsset({...currentAsset, commercial_value: Number(e.target.value)})} />
            <Input placeholder="Ubicación" value={currentAsset.location || ''} onChange={e => setCurrentAsset({...currentAsset, location: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-2">
              <select className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm" value={currentAsset.category} onChange={e => setCurrentAsset({...currentAsset, category: e.target.value})}>
                <option value="IT">IT</option><option value="Lab Radar">Lab Radar</option><option value="Vehículos">Vehículos</option><option value="Validación HIL">HIL</option>
              </select>
              <select className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm" value={currentAsset.status} onChange={e => setCurrentAsset({...currentAsset, status: e.target.value as any})}>
                <option value="Operativa">Operativa</option><option value="En mantenimiento">Mantenimiento</option><option value="Dada de baja">Baja</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}