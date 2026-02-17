import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import {
  FileText, Download, TrendingUp, AlertCircle, CheckCircle2, LogOut,
  Search, Filter, Clock, ShieldCheck, Wrench, Package
} from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';
import { NotificationCenter } from '../ui/NotificationCenter';
import { format, subDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

// ─── KPI CARD ─────────────────────────────────────────────────
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

// ─── AUDIT LOG ROW ────────────────────────────────────────────
const actionBadge: Record<string, string> = {
  CREATE: 'text-emerald-400 bg-emerald-500/10',
  APPROVE: 'text-cyan-400 bg-cyan-500/10',
  REJECT: 'text-rose-400 bg-rose-500/10',
  CHECKOUT: 'text-blue-400 bg-blue-500/10',
  CHECKIN: 'text-purple-400 bg-purple-500/10',
  MAINTENANCE: 'text-amber-400 bg-amber-500/10',
  UPDATE: 'text-slate-400 bg-slate-500/10',
  ALERT: 'text-rose-400 bg-rose-500/10',
};

export function AuditorOverview() {
  const { assets, requests, auditLogs, maintenanceLogs } = useData();
  const { logout, user } = useAuth();
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  // ─── KPIs ─────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = assets.length;
    const operativa = assets.filter(a => a.status === 'Operativa').length;
    const prestada = assets.filter(a => a.status === 'Prestada').length;
    const mantenimiento = assets.filter(a => ['En mantenimiento', 'Requiere Mantenimiento'].includes(a.status)).length;
    const baja = assets.filter(a => a.status === 'Dada de baja').length;
    const disponibilidad = total > 0 ? Math.round((operativa / total) * 100) : 0;

    const activeLoans = requests.filter(r => r.status === 'ACTIVE').length;
    const overdueLoans = requests.filter(r => r.status === 'OVERDUE').length;
    const totalLoans30d = requests.filter(r => isAfter(new Date(r.created_at), subDays(new Date(), 30))).length;

    return { total, operativa, prestada, mantenimiento, baja, disponibilidad, activeLoans, overdueLoans, totalLoans30d };
  }, [assets, requests]);

  // ─── CHART DATA ───────────────────────────────────────────
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

  const statusData = useMemo(() => [
    { name: 'Operativa', value: kpis.operativa },
    { name: 'Prestada', value: kpis.prestada },
    { name: 'Mantenimiento', value: kpis.mantenimiento },
    { name: 'Baja', value: kpis.baja },
  ].filter(d => d.value > 0), [kpis]);

  // Top activos más solicitados
  const topAssets = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    requests.forEach(r => {
      const id = r.asset_id;
      if (!counts[id]) counts[id] = { name: r.assets?.name || id, count: 0 };
      counts[id].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [requests]);

  // Vencidos por usuario
  const overdueByUser = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    requests.filter(r => r.status === 'OVERDUE').forEach(r => {
      const name = r.requester_name;
      if (!counts[name]) counts[name] = { name, count: 0 };
      counts[name].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [requests]);

  // ─── FILTERED AUDIT LOGS ─────────────────────────────────
  const filteredLogs = useMemo(() =>
    auditLogs.filter(l =>
      (filterAction === 'ALL' || l.action === filterAction) &&
      (searchLog === '' || l.details?.toLowerCase().includes(searchLog.toLowerCase()) || l.actor_name?.toLowerCase().includes(searchLog.toLowerCase()))
    ), [auditLogs, filterAction, searchLog]
  );

  // ─── EXPORT ──────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['ID', 'Activo', 'Solicitante', 'Departamento', 'Estado', 'Días', 'Fecha', 'Retorno'];
    const rows = requests.map(r => [
      r.id, r.assets?.name || r.asset_id, r.requester_name, r.requester_dept,
      r.status, r.days_requested, r.created_at, r.expected_return_date || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `zyklus_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      <ChatAssistant />

      {/* Header */}
      <header className="sticky top-0 z-30 flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-background/80 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-primary" /> Panel de Auditoría
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Trazabilidad total del patrimonio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} className="mr-1.5" /> Exportar CSV
          </Button>
          <NotificationCenter />
          <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Total Activos" value={kpis.total} color="border-l-primary" icon={<Package />} sublabel={`${kpis.disponibilidad}% disponibles`} />
          <KPICard label="Disponibilidad" value={`${kpis.disponibilidad}%`} color="border-l-emerald-500" icon={<CheckCircle2 />} sublabel={`${kpis.operativa} operativos`} />
          <KPICard label="Vencidos" value={kpis.overdueLoans} color="border-l-rose-500" icon={<AlertCircle />} sublabel="Requieren atención" />
          <KPICard label="Mantenimiento" value={kpis.mantenimiento} color="border-l-amber-500" icon={<Wrench />} sublabel="Fuera de servicio" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Distribution */}
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

          {/* Status Distribution */}
          <Card>
            <h3 className="text-white font-bold mb-4 text-sm">Estado del Inventario</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Requested */}
          <Card>
            <h3 className="text-white font-bold mb-4 text-sm">Top 8 Activos Más Solicitados</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAssets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Overdue Users */}
          <Card>
            <h3 className="text-white font-bold mb-4 text-sm">Top Vencidos por Usuario</h3>
            {overdueByUser.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <p className="text-sm">Sin retrasos activos 🎉</p>
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overdueByUser}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Audit Trail — Time-Travel */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <ShieldCheck className="text-primary" size={18} /> Trazabilidad Total (Audit Log)
            </h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  value={searchLog}
                  onChange={e => setSearchLog(e.target.value)}
                  placeholder="Buscar en logs..."
                  className="h-9 pl-7 pr-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary w-44"
                />
              </div>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="h-9 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Todas</option>
                <option value="CREATE">CREATE</option>
                <option value="APPROVE">APPROVE</option>
                <option value="CHECKOUT">CHECKOUT</option>
                <option value="CHECKIN">CHECKIN</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="REJECT">REJECT</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Acción</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.slice(0, 20).map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'dd/MM/yy HH:mm', { locale: es })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${actionBadge[log.action] || 'text-slate-400 bg-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{log.actor_name || log.actor_id}</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{log.details || '—'}</td>
                  </tr>
                ))}
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

        {/* Maintenance Logs */}
        {maintenanceLogs.length > 0 && (
          <div>
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Wrench className="text-amber-400" size={18} /> Historial de Mantenimientos
            </h3>
            <div className="space-y-2">
              {maintenanceLogs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <div>
                    <p className="text-white font-medium text-sm">{log.assets?.name || `Activo #${log.asset_id}`}</p>
                    <p className="text-slate-500 text-xs">{log.issue_description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${log.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                      {log.status}
                    </span>
                    {log.cost && <p className="text-xs text-slate-500 mt-1">${log.cost}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}