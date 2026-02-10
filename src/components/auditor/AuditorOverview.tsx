import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext'; // ✅ Usamos el contexto real
import { Button, Card, Input } from '../ui/core';
import { LogOut, Search, ScanLine, CheckCircle2 } from 'lucide-react';

export function AuditorOverview() {
  const { logout } = useAuth();
  const { assets } = useData(); // ✅ Datos desde Supabase
  const [search, setSearch] = useState('');

  const filtered = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanLine className="text-purple-400" /> Auditoría
          </h1>
          <p className="text-slate-400 text-sm">Validación física de inventario</p>
        </div>
        <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Escanear Tag o buscar por serie..." 
            className="pl-10 h-12 bg-slate-900 border-slate-700 text-lg"
          />
        </div>

        <div className="grid gap-3">
          {filtered.map(asset => (
             <Card key={asset.id} className="p-4 flex items-center justify-between border-slate-800 hover:border-purple-500/50 transition-colors bg-slate-900/50">
                <div className="flex gap-4 items-center">
                  <div className={`w-1 h-12 rounded-full ${asset.status === 'Operativa' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <img src={asset.image} className="w-12 h-12 rounded bg-slate-800 object-cover" />
                  <div>
                    <h3 className="font-bold text-white">{asset.name}</h3>
                    <p className="text-purple-400 font-mono text-xs">{asset.tag}</p>
                    <span className="text-[10px] text-slate-500 uppercase">{asset.location}</span>
                  </div>
                </div>
                <Button variant="secondary" className="rounded-full w-10 h-10 p-0">
                  <CheckCircle2 size={18} />
                </Button>
             </Card>
          ))}
        </div>
      </div>
    </div>
  );
}