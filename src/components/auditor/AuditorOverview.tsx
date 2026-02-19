import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, AlertCircle, CheckCircle2, LogOut,
  Search, ShieldCheck, Wrench, Package, BrainCircuit, Loader2
} from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';
import { NotificationCenter } from '../ui/NotificationCenter';
import { format, subDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ExportButtons } from './ExportButtons';
import { toast } from 'sonner';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

function KPICard({ label, value, color, icon, sublabel }: {
  label: string; value: string | number; color: string; icon: React.ReactNode; sublabel?: string;
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</div>
          <div className="text-3xl font-black text-white">{value}</div>
          {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
        </div>
        <div className="opacity-20 text-4xl">{icon}</div>
      </div>
    </Card>
  );
}

export function DashboardCharts() {
  const { assets, requests } = useData();

  const top8Assets = useMemo(() => {
    return Object.entries(
      requests.reduce((acc, req) => {
        const name = req.assets?.name || 'Desconocido';
        const shortName = name.split(' ').slice(0, 2).join(' '); 
        acc[shortName] = (acc[shortName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  }, [requests]);

  const disciplinas = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.requester_disciplina).filter(Boolean)));
  }, [requests]);

  const [selectedDisciplina, setSelectedDisciplina] = useState(disciplinas[0] || '');

  const disciplinaData = useMemo(() => {
    return Object.entries(
      requests
        .filter(r => r.requester_disciplina === selectedDisciplina)
        .reduce((acc, req) => {
           const name = req.assets?.name || 'Desconocido';
           const shortName = name.split(' ').slice(0, 2).join(' ');
           acc[shortName] = (acc[shortName] || 0) + 1;
           return acc;
        }, {} as Record<string, number>)
    )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); 
  }, [requests, selectedDisciplina]);

  const categoryData = useMemo(() =>
    Object.entries(
      assets.reduce((acc: Record<string, number>, a) => {
        const cat = a.category || 'Sin Categoría';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
    [assets]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-bold mb-4 text-sm">Top 8 Activos Más Solicitados</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top8Assets} margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff'}} cursor={{fill: '#1e293b', opacity: 0.4}}/>
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={20}>
                  {top8Assets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-sm">Top por Disciplina</h3>
            <select 
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded p-1.5 focus:outline-none focus:border-primary max-w-[120px]"
              value={selectedDisciplina}
              onChange={e => setSelectedDisciplina(e.target.value)}
            >
              {disciplinas.length > 0 ? (
                disciplinas.map(d => <option key={d} value={d}>{d}</option>)
              ) : (
                <option value="">Sin datos</option>
              )}
            </select>
          </div>
          <div className="h-72">
            {disciplinaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={disciplinaData} margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff'}} cursor={{fill: '#1e293b', opacity: 0.4}}/>
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Sin solicitudes para esta disciplina
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-bold mb-4 text-sm">Distribución por Categoría</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} formatter={v => <span className="text-slate-300">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

const actionBadge: Record<string, { label: string; style: string }> = {
  CREATE:      { label: 'Alta',          style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  APPROVE:     { label: 'Aprobado',      style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  REJECT:      { label: 'Rechazado',     style: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  CHECKOUT:    { label: 'Prestado',      style: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  CHECKIN:     { label: 'Devuelto',      style: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  MAINTENANCE: { label: 'Mantenimiento', style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  UPDATE:      { label: 'Actualización', style: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  ALERT:       { label: 'Alerta',        style: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
};

export function AuditorOverview() {
  const { assets, requests, auditLogs, maintenanceLogs } = useData();
  const { logout } = useAuth();
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  
  // IA Report State
  const [aiReport, setAiReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const kpis = useMemo(() => {
    const total = assets.length;
    const disponible = assets.filter(a => a.status === 'Disponible').length;
    const prestada = assets.filter(a => a.status === 'Prestada').length;
    const mantenimiento = assets.filter(a => ['En mantenimiento', 'Requiere Mantenimiento'].includes(a.status)).length;
    const baja = assets.filter(a => a.status === 'Dada de baja').length;
    const disponibilidad = total > 0 ? Math.round((disponible / total) * 100) : 0;

    const activeLoans = requests.filter(r => r.status === 'ACTIVE').length;
    const overdueLoans = requests.filter(r => r.status === 'OVERDUE').length;
    const totalLoans30d = requests.filter(r => isAfter(new Date(r.created_at), subDays(new Date(), 30))).length;

    return { total, disponible, prestada, mantenimiento, baja, disponibilidad, activeLoans, overdueLoans, totalLoans30d };
  }, [assets, requests]);

  const activeLoansList = requests.filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE');

  // ✨ FILTRO MEJORADO DE TRAZABILIDAD
  const filteredLogs = useMemo(() =>
    auditLogs.filter(l =>
      l.action !== 'CREATE' && 
      (filterAction === 'ALL' || l.action === filterAction) &&
      (searchLog === '' || l.details?.toLowerCase().includes(searchLog.toLowerCase()) || l.actor_name?.toLowerCase().includes(searchLog.toLowerCase()))
    ), [auditLogs, filterAction, searchLog]
  );

  const generatePredictiveReport = async () => {
    if (!GEMINI_API_KEY) { toast.error('Falta API Key de Gemini en entorno'); return; }
    setIsGenerating(true);
    try {
      const topItems = requests.slice(0, 50).map(r => r.assets?.name).filter(Boolean).join(', ');
      const prompt = `Eres Zykla AI, experto en control patrimonial. Analiza el historial reciente de activos prestados: [${topItems}]. Genera un reporte predictivo de 1 párrafo profesional indicando la demanda y sugiriendo qué tipo de activos se deben adquirir con mayor prioridad. Hazlo ver analítico y preséntalo directo al auditor.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 200 } })
      });
      const data = await response.json();
      setAiReport(data.candidates[0].content.parts[0].text);
      toast.success('Reporte generado exitosamente');
    } catch(e) { toast.error('Error al generar reporte de IA'); } finally { setIsGenerating(false); }
  }

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      <ChatAssistant />

      <header className="sticky top-0 z-30 flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-background/80 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-primary" /> Panel de Auditoría
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 hidden sm:block">Trazabilidad total del patrimonio</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons requests={requests} assets={assets} auditLogs={auditLogs} />
          <NotificationCenter />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Total Activos" value={kpis.total} color="border-l-primary" icon={<Package />} sublabel={`${kpis.disponibilidad}% disponibles`} />
          <KPICard label="Disponibilidad" value={`${kpis.disponibilidad}%`} color="border-l-emerald-500" icon={<CheckCircle2 />} sublabel={`${kpis.disponible} disponibles`} />
          <KPICard label="Vencidos" value={kpis.overdueLoans} color="border-l-rose-500" icon={<AlertCircle />} sublabel="Requieren atención" />
          <KPICard label="Mantenimiento" value={kpis.mantenimiento} color="border-l-amber-500" icon={<Wrench />} sublabel="Fuera de servicio" />
        </div>

        {/* 🧠 MÓDULO IA PREDICTIVA */}
        <Card className="border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-900/10 shadow-[0_0_25px_rgba(147,51,234,0.1)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <BrainCircuit className="text-purple-400" /> Reporte de Tendencias Predictivas (Zykla AI)
            </h3>
            <Button onClick={generatePredictiveReport} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg whitespace-nowrap">
              {isGenerating ? <><Loader2 size={16} className="animate-spin mr-2"/> Generando Analítica...</> : 'Generar Reporte Zykla'}
            </Button>
          </div>
          {aiReport ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/20">
               <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-purple-500 pl-4">{aiReport}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Haz clic en el botón para que Zykla analice el historial de la base de datos y sugiera adquisiciones y tendencias.</p>
          )}
        </Card>

        <DashboardCharts />

        {/* 📦 ARTÍCULOS PRESTADOS */}
        <div>
          <h3 className="text-white font-bold flex items-center gap-2 mb-4">
            <Package className="text-emerald-400" size={18} /> Artículos Actualmente Prestados
          </h3>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400 min-w-[600px]">
              <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
                <tr><th className="p-3">Activo</th><th className="p-3">Usuario</th><th className="p-3">Retorno Esp.</th><th className="p-3">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activeLoansList.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-medium text-white">{r.assets?.name || `Activo #${r.asset_id}`}</td>
                    <td className="p-3">{r.requester_name}</td>
                    <td className="p-3 font-mono">{r.expected_return_date ? format(new Date(r.expected_return_date), 'dd/MM/yy') : '—'}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>{r.status}</span></td>
                  </tr>
                ))}
                {activeLoansList.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-600">No hay activos prestados actualmente.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🛡️ TRAZABILIDAD TOTAL */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 mt-8">
            <h3 className="text-white font-bold flex items-center gap-2">
              <ShieldCheck className="text-primary" size={18} /> Trazabilidad Total (Audit Log)
            </h3>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-auto">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  value={searchLog}
                  onChange={e => setSearchLog(e.target.value)}
                  placeholder="Buscar..."
                  className="h-9 w-full md:w-44 pl-7 pr-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="h-9 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Todo el Historial</option>
                <option value="APPROVE">Aprobados</option>
                <option value="REJECT">Rechazados</option>
                <option value="CHECKOUT">Prestados (Salidas)</option>
                <option value="CHECKIN">Devueltos (Entradas)</option>
                <option value="MAINTENANCE">Mantenimientos</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-400 min-w-[600px]">
              <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="p-3 w-32">Timestamp</th>
                  <th className="p-3 w-28">Estado / Acción</th>
                  <th className="p-3 w-32">Usuario</th>
                  <th className="p-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.slice(0, 20).map(log => {
                  const badge = actionBadge[log.action] || { label: log.action, style: 'text-slate-400 bg-slate-700' };
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap align-top">
                        {format(new Date(log.timestamp), 'dd/MM/yy HH:mm', { locale: es })}
                      </td>
                      <td className="p-3 align-top">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 align-top">{log.actor_name || log.actor_id}</td>
                      <td className="p-3 text-slate-400 min-w-[200px] whitespace-normal leading-relaxed break-words align-top">
                        {log.details || '—'}
                      </td>
                    </tr>
                  )
                })}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-600">No hay registros con ese filtro</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-right">
            Mostrando {Math.min(filteredLogs.length, 20)} de {filteredLogs.length} registros • Log inmutable
          </p>
        </div>

      </main>
    </div>
  );
}