import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import {
  TrendingUp, AlertCircle, CheckCircle2, LogOut,
  Search, ShieldCheck, Wrench, Package, BrainCircuit, Loader2,
  Flame
} from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';
import { NotificationCenter } from '../ui/NotificationCenter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ExportButtons } from './ExportButtons';
import { DataLoadingScreen } from '../ui/DataLoadingScreen';
import { toast } from 'sonner';
import { RefreshButton } from '../ui/RefreshButton';
import { generatePredictiveReport as generateReport } from '../../lib/geminiUtils';
import {
  AuditorKPICard,
  DashboardCharts,
  AuditorOverdueList,
  actionBadge,
} from './overview';

/** Panel del auditor: KPIs, gráficas, préstamos vencidos y exportación. */
export function AuditorOverview() {
  const { assets, requests, auditLogs, maintenanceLogs, stats, isLoading } = useData();
  const { logout } = useAuth();
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [aiReport, setAiReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const kpis = useMemo(() => {
    const total = stats?.assetCounts?.total ?? assets.length;
    const disponible = stats?.assetCounts?.disponible ?? assets.filter(a => a.status === 'Disponible').length;
    const mantenimiento = stats?.assetCounts?.mantenimiento ?? assets.filter(a => ['En mantenimiento', 'Requiere Mantenimiento'].includes(a.status)).length;
    const disponibilidad = total > 0 ? Math.round((disponible / total) * 100) : 0;
    const overdueLoans = stats?.requestCounts?.overdue ?? requests.filter(r => r.status === 'OVERDUE').length;
    return { total, disponible, mantenimiento, disponibilidad, overdueLoans };
  }, [stats, assets, requests]);

  const filteredLogs = useMemo(() =>
    auditLogs.filter(l =>
      l.action !== 'CREATE' &&
      (filterAction === 'ALL' || l.action === filterAction) &&
      (searchLog === '' || l.details?.toLowerCase().includes(searchLog.toLowerCase()) || l.actor_name?.toLowerCase().includes(searchLog.toLowerCase()))
    ), [auditLogs, filterAction, searchLog]);

  const generatePredictiveReport = async () => {
    setIsGenerating(true);
    try {
      const assetNames = requests
        .filter(r => r.assets?.name)
        .map(r => r.assets!.name as string);
      const report = await generateReport(assetNames, 'auditor');
      setAiReport(report);
      toast.success('Reporte generado exitosamente');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error Zykla AI: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <DataLoadingScreen message="Cargando panel de auditoría..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      <ChatAssistant />

      <header className="sticky top-0 z-30 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-background/80 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-primary" /> Panel de Auditoría
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 hidden sm:block">Trazabilidad total del patrimonio</p>
        </div>
        <div className="flex flex-wrap justify-end items-center gap-2 w-full sm:w-auto">
          <ExportButtons
            requests={requests}
            assets={assets}
            auditLogs={auditLogs}
            maintenanceLogs={maintenanceLogs}
          />
          <RefreshButton />
          <NotificationCenter />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 space-y-8 max-w-7xl mx-auto">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AuditorKPICard label="Total Activos" value={kpis.total} color="border-l-primary" icon={<Package />} sublabel={`${kpis.disponibilidad}% disponibles`} />
          <AuditorKPICard label="Disponibilidad" value={`${kpis.disponibilidad}%`} color="border-l-emerald-500" icon={<CheckCircle2 />} sublabel={`${kpis.disponible} disponibles`} />
          <AuditorKPICard label="Vencidos" value={kpis.overdueLoans} color="border-l-rose-500" icon={<AlertCircle />} sublabel="Requieren atención" />
          <AuditorKPICard label="Mantenimiento" value={kpis.mantenimiento} color="border-l-amber-500" icon={<Wrench />} sublabel="Fuera de servicio" />
        </div>

        <Card className="border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-900/10 shadow-[0_0_25px_rgba(147,51,234,0.1)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <BrainCircuit className="text-purple-400" /> Reporte de Tendencias Predictivas (Zykla AI)
            </h3>
            <Button
              onClick={generatePredictiveReport}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg w-full sm:w-auto justify-center whitespace-normal sm:whitespace-nowrap text-sm"
            >
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

        <div>
          <h3 className="text-white font-bold flex items-center gap-2 mb-4">
            <Flame className="text-rose-400" size={18} />
            Préstamos Vencidos
            {kpis.overdueLoans > 0 && (
              <span className="ml-1 text-[11px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                {kpis.overdueLoans}
              </span>
            )}
            <span className="text-slate-500 text-xs font-normal ml-1">— Ordenados por mayor tiempo sin devolver</span>
          </h3>
          <AuditorOverdueList requests={requests} />
        </div>

        <div>
          <h3 className="text-white font-bold flex items-center gap-2 mb-4">
            <Package className="text-emerald-400" size={18} /> Artículos Actualmente Prestados
            <span className="text-slate-500 text-xs font-normal ml-1">— Solo activos (sin vencidos)</span>
          </h3>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400 min-w-[600px]">
              <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
                <tr><th className="p-3">Activo</th><th className="p-3">Usuario</th><th className="p-3">Retorno Esp.</th><th className="p-3">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {requests.filter(r => r.status === 'ACTIVE').map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-medium text-white">{r.assets?.name ?? `Activo #${r.asset_id}`}</td>
                    <td className="p-3">{r.requester_name}</td>
                    <td className="p-3 font-mono">{r.expected_return_date ? format(new Date(r.expected_return_date), 'dd/MM/yy') : '—'}</td>
                    <td className="p-3"><span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVO</span></td>
                  </tr>
                ))}
                {requests.filter(r => r.status === 'ACTIVE').length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-600">No hay activos prestados actualmente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                  const badge = actionBadge[log.action] ?? { label: log.action, style: 'text-slate-400 bg-slate-700' };
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
                      <td className="p-3 text-slate-300 align-top">{log.actor_name ?? log.actor_id}</td>
                      <td className="p-3 text-slate-400 min-w-[200px] whitespace-normal leading-relaxed break-words align-top">
                        {log.details ?? '—'}
                      </td>
                    </tr>
                  );
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
