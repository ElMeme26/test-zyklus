import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input } from '../ui/core';
import { Search, ShoppingCart, LogOut, Clock, Info } from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';

export function UserHome() {
  const { assets, createRequest } = useData();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  
  // Estado para el modal de solicitud
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [days, setDays] = useState(7);
  const [motive, setMotive] = useState('');

  const filteredAssets = assets.filter(a => 
    a.status === 'Operativa' && 
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!selectedAsset || !user) return;
    await createRequest(selectedAsset, user, days, motive);
    setSelectedAsset(null);
    setMotive('');
    setDays(7);
  };

  return (
    <div className="min-h-screen bg-background p-6 font-sans pb-24">
      <ChatAssistant /> {/* Zykla Personal para Usuario */}
      
      <header className="flex justify-between items-center mb-8 sticky top-0 bg-background/80 backdrop-blur z-20 py-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white">Catálogo <span className="text-primary">Zyklus</span></h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Mis Préstamos</Button>
          <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
        </div>
      </header>

      {/* Buscador */}
      <div className="relative mb-8 max-w-lg mx-auto">
        <Search className="absolute left-4 top-3 text-slate-500 w-5 h-5" />
        <Input 
          placeholder="¿Qué necesitas hoy?" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-12 h-12 text-lg rounded-full shadow-[0_0_20px_rgba(6,182,212,0.15)] focus:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
        />
      </div>

      {/* Grid de Activos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => (
          <Card key={asset.id} className="group hover:-translate-y-1 transition-transform duration-300">
            <div className="aspect-video bg-slate-800 rounded-lg mb-4 overflow-hidden relative">
              <img src={asset.image || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500"} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-white border border-white/10">
                {asset.tag}
              </div>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{asset.name}</h3>
            <p className="text-secondary text-sm mb-4 truncate">{asset.description || "Sin descripción"}</p>
            
            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">DISPONIBLE</span>
              <Button size="sm" variant="neon" onClick={() => setSelectedAsset(asset)}>
                Solicitar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de Solicitud (3 Clicks Flow) */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md space-y-6 border-primary/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <div>
              <h2 className="text-2xl font-bold text-white">Configura tu solicitud</h2>
              <p className="text-primary text-sm mt-1">{selectedAsset.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Duración</span>
                  <span className="text-white font-bold">{days} días</span>
                </label>
                <input 
                  type="range" min="1" max="30" value={days} onChange={e => setDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>1d</span><span>30d</span></div>
              </div>

              <Input 
                placeholder="Motivo (Opcional, ayuda a aprobar más rápido)" 
                value={motive} 
                onChange={e => setMotive(e.target.value)}
              />
              
              <div className="bg-primary/10 p-3 rounded-lg flex gap-3 items-start border border-primary/20">
                <Info className="text-primary shrink-0" size={18} />
                <p className="text-xs text-slate-300">Zykla sugiere: Si pides esta laptop, considera agregar un mouse ergonómico a tu pedido.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSelectedAsset(null)}>Cancelar</Button>
              <Button variant="neon" onClick={handleSubmit}>ENVIAR SOLICITUD</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}