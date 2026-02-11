import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext'; 
import type { Asset } from '../../types';
import { Button, Card, Input } from '../ui/core';
import { LogOut, Zap, LayoutGrid, List, Bot, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function UserHome() {
  const { user, logout } = useAuth();
  const { assets, createRequest, requests, isLoading } = useData();
  
  const [view, setView] = useState<'catalog' | 'history'>('catalog');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todos');

  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [days, setDays] = useState(7);
  const [motive, setMotive] = useState('');
  const [zyklaTip, setZyklaTip] = useState<string | null>(null);

  // DEBUG: Ver qué categorías existen realmente en tus datos
  console.log("Categorías disponibles:", [...new Set(assets.map(a => a.category))]);

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) && 
    (cat === 'Todos' || a.category === cat)
  );

  // CORRECCIÓN 1: Acceder a user.email a través de la relación, no directo
  const myRequests = requests.filter(r => r.users?.email === user?.email);

  const handleOpenRequest = (asset: Asset) => {
    setSelectedAsset(asset);
    setDays(7);
    setMotive('');

    // Tips basados en categorías reales del seeder
    if (asset.category === 'Laptop') setZyklaTip("💡 Zykla: ¿Necesitas un mouse o monitor extra?");
    else if (asset.category === 'Osciloscopio') setZyklaTip("💡 Zykla: Verifica que las sondas estén calibradas.");
    else setZyklaTip(null);
  };

  const handleConfirmRequest = () => {
    if (selectedAsset && user) {
      createRequest(selectedAsset, user, days, motive);
      setSelectedAsset(null);
    }
  };

  // CORRECCIÓN 2: Categorías que coinciden con tu Base de Datos (Seeder)
  const categories = ['Todos', 'Laptop', 'Osciloscopio', 'Multímetro', 'Estación de Soldadura', 'Kit de Desarrollo'];

  return (
    <div className="min-h-screen pb-24 bg-slate-950 font-sans relative">
      <header className="p-6 pt-10 flex justify-between items-center bg-slate-900/50 backdrop-blur sticky top-0 z-10 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white">Hola, <span className="text-cyan-400">{user?.name.split(' ')[0]}</span></h1>
          <p className="text-xs text-slate-400">{user?.dept}</p>
        </div>
        <img src={user?.avatar} alt="Profile" className="w-10 h-10 rounded-full border border-slate-700" />
      </header>

      <div className="px-6 pt-6">
        <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button onClick={() => setView('catalog')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${view === 'catalog' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>
            <LayoutGrid size={14} /> Catálogo
          </button>
          <button onClick={() => setView('history')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${view === 'history' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>
            <List size={14} /> Mis Solicitudes ({myRequests.length})
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading && <p className="text-center text-cyan-500 animate-pulse">Cargando datos de la nube...</p>}

        {view === 'catalog' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo..." className="bg-slate-900 border-slate-800" />
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${cat === c ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'text-slate-400 border-slate-800 bg-slate-900'}`}>{c}</button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredAssets.length === 0 && !isLoading && (
                 <p className="text-slate-500 text-center text-sm py-10">No se encontraron activos en esta categoría.</p>
              )}
              
              {filteredAssets.map((asset, i) => (
                <motion.div key={asset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-0 overflow-hidden flex h-32 border-slate-800 bg-slate-900/40 relative">
                    <div className="w-32 h-full relative bg-slate-900 shrink-0">
                       <img src={asset.image} className="w-full h-full object-cover opacity-60" />
                       <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${asset.status === 'Operativa' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>{asset.status}</div>
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm line-clamp-1">{asset.name}</h3>
                        <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider mt-1">{asset.category}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-mono">{asset.tag}</p>
                      </div>
                      <div className="flex justify-end mt-2">
                        {asset.status === 'Operativa' ? (
                          <Button onClick={() => handleOpenRequest(asset)} className="h-8 px-4 rounded-full bg-slate-800 hover:bg-cyan-500 text-white hover:text-black flex items-center gap-2 text-xs font-bold"><Zap className="w-3 h-3" /> Solicitar</Button>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded"><AlertCircle size={10}/> No disp.</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
             {myRequests.length === 0 && <p className="text-slate-500 text-center text-sm">No tienes solicitudes activas.</p>}
             {myRequests.map((req) => (
                <Card key={req.id} className="p-4 border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <div>
                    {/* CORRECCIÓN 3: Acceso seguro a la propiedad assets */}
                    <h3 className="font-bold text-white text-sm">{req.assets?.name || 'Activo Desconocido'}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(req.created_at).toLocaleDateString()} • {req.days_requested} días</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${req.status === 'PENDING' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' : 'text-slate-400'}`}>
                    {req.status}
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 w-full flex justify-center pointer-events-none z-10">
        <Button variant="danger" onClick={logout} className="pointer-events-auto shadow-lg rounded-full px-6 backdrop-blur-md bg-slate-900/80 border-slate-800">
          <LogOut size={16} className="mr-2" /> Salir
        </Button>
      </div>

      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
               <div className="p-4 border-b border-white/5 flex justify-between">
                  <h3 className="text-white font-bold">Solicitud Express</h3>
                  <button onClick={() => setSelectedAsset(null)}><XCircle className="text-slate-400" /></button>
               </div>
               <div className="p-5 space-y-5">
                  <div className="flex gap-4">
                    <img src={selectedAsset.image} className="w-16 h-16 rounded bg-slate-800 object-cover" />
                    <div>
                      <h4 className="text-white font-bold">{selectedAsset.name}</h4>
                      <p className="text-xs text-slate-500">{selectedAsset.tag}</p>
                    </div>
                  </div>
                  {zyklaTip && <div className="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded-lg flex gap-3"><Bot className="text-cyan-400 w-5 h-5" /><p className="text-xs text-cyan-200">{zyklaTip}</p></div>}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2 font-bold uppercase"><span>Duración</span><span className="text-cyan-400 text-lg">{days} Días</span></div>
                    <input type="range" min="1" max="30" value={days} onChange={e => setDays(Number(e.target.value))} className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <Input placeholder="Motivo (Opcional)" value={motive} onChange={e => setMotive(e.target.value)} />
                  <Button onClick={handleConfirmRequest} className="w-full bg-cyan-500 text-black font-bold">Confirmar</Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}