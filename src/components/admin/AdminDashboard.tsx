import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { Asset } from '../../types'; // <--- CORREGIDO AQUÍ
import { Card, Button, Input } from '../ui/core';
import { LogOut, Database, Plus, Search, Bot, Edit, Trash2, X, ChevronLeft, ChevronRight, Upload, Layers, CheckSquare, Square, LayoutGrid, Building2, ScanLine } from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant'; 
import { InstitutionsManager } from './InstitutionsManager';

function InventoryView() {
  const { assets, addAsset, updateAsset, deleteAsset, importAssets, getNextTag, createBatchRequest } = useData();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 8;

  const filteredAssets = assets.filter(a => (a.name?.toLowerCase() || '').includes(search.toLowerCase()) && (catFilter === 'Todas' || a.category === catFilter));
  const paginatedAssets = filteredAssets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

  const toggleSelection = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => importAssets(ev.target?.result as string); r.readAsText(f); }};
  const handleSave = async () => { if(isEditing && currentAsset.id) await updateAsset(currentAsset.id, currentAsset); else await addAsset(currentAsset); setShowModal(false); };

  return (
    <div className="animate-in fade-in">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4"/><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-slate-900 border-slate-800"/></div>
        <div className="flex gap-2"><input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileUpload} /><Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-2"/> Importar</Button></div>
      </div>

      {selectedIds.size > 0 && <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-30 bg-cyan-600 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-4"><span className="text-sm font-bold">{selectedIds.size} seleccionados</span><Button size="sm" variant="secondary" onClick={() => createBatchRequest(assets.filter(a => selectedIds.has(a.id)), {id:'admin', name:'Admin', email:'admin@zf.com', role:'ADMIN_PATRIMONIAL', dept:'IT', avatar:''}, 7, "Combo Admin")} className="h-7 text-cyan-700 bg-white">Crear Combo</Button><button onClick={() => setSelectedIds(new Set())}><X size={16}/></button></div>}

      <div className="hidden md:block bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-500"><tr><th className="p-4 w-10"></th><th className="p-4">Activo</th><th className="p-4 text-center">Estado</th><th className="p-4 text-right">Acciones</th></tr></thead>
          <tbody className="divide-y divide-slate-800">{paginatedAssets.map(a => <tr key={a.id} className="hover:bg-slate-800/50"><td className="p-4"><button onClick={() => toggleSelection(a.id)}>{selectedIds.has(a.id) ? <CheckSquare className="text-cyan-500"/> : <Square/>}</button></td><td className="p-4 text-white font-bold">{a.name} <span className="text-slate-500 font-normal">({a.tag})</span></td><td className="p-4 text-center"><span className="bg-slate-800 px-2 py-1 rounded text-xs">{a.status}</span></td><td className="p-4 text-right flex justify-end gap-2"><button onClick={() => { setIsEditing(true); setCurrentAsset(a); setShowModal(true); }}><Edit size={16}/></button><button onClick={() => deleteAsset(a.id)} className="text-rose-500"><Trash2 size={16}/></button></td></tr>)}</tbody>
        </table>
      </div>

      <div className="md:hidden grid gap-4 mb-20">{paginatedAssets.map(a => <Card key={a.id} className="p-4 flex gap-4"><button onClick={() => toggleSelection(a.id)}>{selectedIds.has(a.id) ? <CheckSquare className="text-cyan-500"/> : <Square className="text-slate-500"/>}</button><div><h3 className="text-white font-bold">{a.name}</h3><p className="text-xs text-slate-500">{a.tag}</p></div></Card>)}</div>

      <button onClick={() => { setIsEditing(false); setCurrentAsset({ tag: getNextTag(), status: 'Operativa', category: 'IT' }); setShowModal(true); }} className="fixed bottom-24 right-6 w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg text-black z-30"><Plus size={24}/></button>

      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-4"><h3 className="text-white font-bold">{isEditing?'Editar':'Nuevo'}</h3><Input placeholder="Nombre" value={currentAsset.name||''} onChange={e=>setCurrentAsset({...currentAsset,name:e.target.value})}/><div className="flex gap-2"><Input placeholder="Tag" value={currentAsset.tag||''} onChange={e=>setCurrentAsset({...currentAsset,tag:e.target.value})}/><Input placeholder="Serie" value={currentAsset.serial||''} onChange={e=>setCurrentAsset({...currentAsset,serial:e.target.value})}/></div><div className="flex justify-end gap-2 pt-4"><Button variant="secondary" onClick={()=>setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></div></div></div>}
    </div>
  );
}

export function AdminDashboard() {
  const { logout } = useAuth();
  const { processQRScan: scanQR } = useData();
  const [currentView, setCurrentView] = useState<'inventory' | 'external'>('inventory');

  const handleScan = async () => { const qr = prompt("QR JSON:"); if(qr) await scanQR(qr); };

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-24 relative">
      <ChatAssistant />
      <header className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-4">
           <h1 className="text-xl font-bold text-white flex items-center gap-2"><Database className="text-cyan-500"/> Panel Maestro</h1>
           <div className="hidden md:flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
              <button onClick={() => setCurrentView('inventory')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${currentView === 'inventory' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><LayoutGrid size={14}/> Inventario</button>
              <button onClick={() => setCurrentView('external')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${currentView === 'external' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><Building2 size={14}/> Externos</button>
           </div>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleScan} className="border-cyan-500/30 text-cyan-400"><ScanLine size={16} className="mr-2"/> Escanear</Button><Button variant="ghost" onClick={logout}><LogOut size={18}/></Button></div>
      </header>
      <main className="p-6">{currentView === 'inventory' ? <InventoryView /> : <InstitutionsManager />}</main>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 p-2 flex justify-around z-50">
          <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center p-2 ${currentView === 'inventory' ? 'text-cyan-500' : 'text-slate-500'}`}><LayoutGrid size={20}/><span className="text-[10px] font-bold">Interno</span></button>
          <button onClick={handleScan} className="flex flex-col items-center p-2 text-white bg-cyan-600 rounded-full -mt-6 shadow-lg border-4 border-slate-950"><ScanLine size={24}/></button>
          <button onClick={() => setCurrentView('external')} className={`flex flex-col items-center p-2 ${currentView === 'external' ? 'text-cyan-500' : 'text-slate-500'}`}><Building2 size={20}/><span className="text-[10px] font-bold">Externo</span></button>
      </div>
    </div>
  );
}