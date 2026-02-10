import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Card, Button } from '../ui/core';
import { LogOut, TrendingUp, Box, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminDashboard() {
  const { logout } = useAuth();
  const { assets } = useData(); // ✅ Datos reales

  // Cálculos reales
  const totalAssets = assets.length;
  const totalValue = assets.reduce((acc, curr) => acc + (curr.commercial_value || 0), 0);
  const operativos = assets.filter(a => a.status === 'Operativa').length;
  const mantenimiento = assets.filter(a => a.status === 'En mantenimiento').length;

  const dataChart = [
    { name: 'Operativos', val: operativos },
    { name: 'Mantenimiento', val: mantenimiento },
    { name: 'Bajas', val: assets.filter(a => a.status === 'Dada de baja').length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans pb-20">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="text-cyan-500"/> Panel Patrimonial
        </h1>
        <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex justify-between mb-2"><Box className="text-blue-400"/></div>
          <div className="text-2xl font-bold text-white">{totalAssets}</div>
          <div className="text-[10px] text-slate-500 uppercase">Activos Totales</div>
        </Card>
        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex justify-between mb-2"><TrendingUp className="text-emerald-400"/></div>
          <div className="text-2xl font-bold text-white">${(totalValue / 1000).toFixed(0)}k</div>
          <div className="text-[10px] text-slate-500 uppercase">Valor Inventario</div>
        </Card>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataChart}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{background: '#0f172a', border:'none'}} />
            <Bar dataKey="val" fill="#06b6d4" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="text-white font-bold mb-4">Inventario Global</h3>
      <div className="space-y-3">
        {assets.slice(0, 10).map(asset => (
           <Card key={asset.id} className="p-3 flex justify-between items-center border-slate-800 bg-slate-900/30">
             <div>
               <div className="text-white font-bold text-sm">{asset.name}</div>
               <div className="text-xs text-slate-500">{asset.tag}</div>
             </div>
             <div className="text-xs font-bold text-cyan-500">{asset.status}</div>
           </Card>
        ))}
      </div>
    </div>
  );
}