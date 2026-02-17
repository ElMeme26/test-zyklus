import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, TrendingUp, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';

export function AuditorOverview() {
  const { assets, requests } = useData();
  const { logout } = useAuth();

  // KPIs Calculados
  const totalAssets = assets.length;
  const activeLoans = requests.filter(r => r.status === 'ACTIVE').length;
  const overdueLoans = requests.filter(r => r.status === 'OVERDUE').length;
  const damagedAssets = assets.filter(a => a.status === 'En mantenimiento').length;
  
  // Datos para Gráficas
  const categoryData = assets.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.category);
    if (existing) existing.value++;
    else acc.push({ name: curr.category, value: 1 });
    return acc;
  }, []);

  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-background p-6 pb-20 font-sans">
      <ChatAssistant />
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-primary"/> Panel de Auditoría
          </h1>
          <p className="text-secondary text-sm mt-1">Supervisión y trazabilidad de activos.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => alert("Generando reporte PDF...")}>
            <FileText size={16} className="mr-2"/> Reporte Mensual
          </Button>
          <Button variant="secondary" onClick={() => alert("Exportando CSV...")}>
            <Download size={16} className="mr-2"/> Exportar Data
          </Button>
          <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-l-4 border-l-primary">
          <div className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Total Activos</div>
          <div className="text-3xl font-bold text-white">{totalAssets}</div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <div className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Préstamos Activos</div>
          <div className="text-3xl font-bold text-emerald-400">{activeLoans}</div>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <div className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Vencidos</div>
          <div className="text-3xl font-bold text-rose-400">{overdueLoans}</div>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <div className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Mantenimiento</div>
          <div className="text-3xl font-bold text-amber-400">{damagedAssets}</div>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-white font-bold mb-4">Distribución por Categoría</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={2}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#fff'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {categoryData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-slate-300">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-white font-bold mb-4">Tendencia de Préstamos (Últimos 6 meses)</h3>
          <div className="h-64 flex items-center justify-center border border-dashed border-slate-700 rounded-xl">
            <p className="text-slate-500 text-sm">Datos insuficientes para proyección histórica</p>
          </div>
        </Card>
      </div>

      {/* Trazabilidad Reciente */}
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="text-primary"/> Últimos Movimientos</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-surface text-xs uppercase font-bold text-slate-500">
            <tr>
              <th className="p-4 rounded-tl-xl">Activo</th>
              <th className="p-4">Usuario</th>
              <th className="p-4">Estado</th>
              <th className="p-4 rounded-tr-xl text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-surface/50">
            {requests.slice(0, 5).map(req => (
              <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-medium text-white">{req.asset_id}</td>
                <td className="p-4">{req.requester_name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    req.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 
                    req.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-xs">{new Date(req.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}