import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { Asset, AssetState } from '../../types';
import type { Request } from '../../types';
import { Card, Button, Input } from '../ui/core';
import {
  LogOut, Database, Plus, Search, Edit, Trash2, X,
  Upload, CheckSquare, Square, LayoutGrid, Building2,
  ScanLine, Wrench, Shield, CheckCircle,
  QrCode, Printer, PieChart, User, Calendar, Tag, Clock, Package,
  TrendingUp, AlertCircle, CheckCircle2, ShieldCheck, BrainCircuit, Loader2, Flame
} from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';
import { InstitutionsManager } from './InstitutionsManager';
import { NotificationCenter } from '../ui/NotificationCenter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AssetQRPrint } from './AssetQRPrint';
import { getAssetsPaginated } from '../../api/assets';
import { DataLoadingScreen } from '../ui/DataLoadingScreen';
import { DashboardCharts } from '../auditor/AuditorOverview';
import { Scanner } from '@yudiel/react-qr-scanner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { RefreshButton } from '../ui/RefreshButton';
import { generatePredictiveReport as generateReport } from '../../lib/geminiUtils';
import { BundleManager } from './BundleManager';

// ─── KPI CARD ────────────────────────────────────────────────────
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
// test
// ─── ACTION BADGE ────────────────────────────────────────────────
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

// ─── OVERDUE RANKING LIST ────────────────────────────────────────
function OverdueList({ requests }: { requests: Request[] }) {
  const now = new Date();
  const overdueList = requests
    .filter(r => r.status === 'OVERDUE' && r.expected_return_date)
    .map(r => ({
      ...r,
      daysLate: differenceInDays(now, new Date(r.expected_return_date!)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  if (overdueList.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500">
        <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500/40" />
        <p className="text-sm">Sin préstamos vencidos 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto w-full">
      <table className="w-full text-left text-xs text-slate-400 min-w-[580px]">
        <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
          <tr>
            <th className="p-3 w-10">#</th>
            <th className="p-3">Activo</th>
            <th className="p-3">Solicitante</th>
            <th className="p-3">Disciplina</th>
            <th className="p-3 text-center">Días Vencido</th>
            <th className="p-3">Debió Retornar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {overdueList.map((r, idx) => {
            const urgency =
              r.daysLate >= 7 ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              r.daysLate >= 3 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                'text-amber-400 bg-amber-500/10 border-amber-500/20';

            return (
              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 font-black text-slate-600">
                  {idx === 0 && <Flame size={14} className="text-red-400 inline" />}
                  {idx > 0 && <span className="text-slate-600 text-[10px]">#{idx + 1}</span>}
                </td>
                <td className="p-3 font-medium text-white">
                  {r.assets?.name ?? `Activo #${r.asset_id}`}
                  <span className="text-slate-500 text-[10px] font-mono ml-2">{r.assets?.tag}</span>
                </td>
                <td className="p-3">{r.requester_name}</td>
                <td className="p-3 text-slate-500">{r.requester_disciplina ?? '—'}</td>
                <td className="p-3 text-center">
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${urgency}`}>
                    {r.daysLate}d
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-500">
                  {r.expected_return_date
                    ? format(new Date(r.expected_return_date), 'dd/MM/yy', { locale: es })
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── ASSET INFO MODAL ────────────────────────────────────────
function AssetInfoModal({ asset, relatedRequest, onClose }: {
  asset?: Asset;
  relatedRequest?: { requester_name: string; status: string; expected_return_date?: string };
  onClose: () => void;
}) {
  if (!asset) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md border-primary/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">📋 Ficha Técnica</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          {asset.image && (
            <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
              <img src={asset.image} className="w-full h-full object-cover" alt={asset.name} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Nombre', asset.name],
              ['Tag', asset.tag],
              ['Estado', asset.status],
              ['Categoría', asset.category || '—'],
              ['Marca', asset.brand || '—'],
              ['Modelo', asset.model || '—'],
              ['Serie', asset.serial || '—'],
              ['Ubicación', asset.location || '—'],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-950 rounded-lg p-2 border border-slate-800">
                <p className="text-slate-500 text-[10px] uppercase font-bold">{k}</p>
                <p className="text-white font-medium mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </div>
          {relatedRequest && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-primary font-bold mb-1">Préstamo Activo</p>
              <p className="text-xs text-slate-300">Solicitante: {relatedRequest.requester_name}</p>
              <p className="text-xs text-slate-400">Estado: {relatedRequest.status}</p>
              {relatedRequest.expected_return_date && (
                <p className="text-xs text-slate-400">Retorno: {new Date(relatedRequest.expected_return_date).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── MAINTENANCE LOG DETAIL MODAL ────────────────────────────
function MaintenanceLogModal({ log, onClose }: {
  log: {
    id: number;
    asset_id: string;
    issue_description?: string;
    status: string;
    created_at: string;
    resolved_at?: string;
    cost?: number;
    assets?: { name?: string; tag?: string; category?: string; location?: string };
    users?: { name?: string; disciplina?: string };
    relatedRequest?: Request | null;
  };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md border-amber-500/30 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Wrench size={16} className="text-amber-400" /> Detalle de Incidencia
          </h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          {/* Activo */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Activo</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Tag size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold">{log.assets?.name || log.asset_id}</p>
                <p className="text-slate-500 text-xs font-mono">{log.assets?.tag}</p>
                {log.assets?.category && <p className="text-slate-600 text-xs mt-0.5">{log.assets.category}</p>}
                {log.assets?.location && <p className="text-slate-600 text-xs">{log.assets.location}</p>}
              </div>
            </div>
          </div>

          {/* Issue */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Descripción del Problema</p>
            <p className="text-slate-300 text-sm leading-relaxed">{log.issue_description || 'Sin descripción'}</p>
          </div>

          {/* Reported by */}
          {log.users?.name && (
            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <User size={14} className="text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Reportado por</p>
                <p className="text-white text-sm font-medium">{log.users.name}</p>
                {log.users.disciplina && <p className="text-slate-500 text-xs">{log.users.disciplina}</p>}
              </div>
            </div>
          )}

          {/* Related Loan */}
          {log.relatedRequest && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Préstamo Relacionado</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Solicitante</span>
                  <span className="text-white font-medium">{log.relatedRequest.requester_name}</span>
                </div>
                {log.relatedRequest.requester_disciplina && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disciplina</span>
                    <span className="text-slate-300">{log.relatedRequest.requester_disciplina}</span>
                  </div>
                )}
                {log.relatedRequest.users?.manager_id && log.relatedRequest.users?.name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Líder</span>
                    <span className="text-slate-300">{log.relatedRequest.users.name}</span>
                  </div>
                )}
                {log.relatedRequest.checkout_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1"><Clock size={10} />Salida</span>
                    <span className="text-slate-300">{format(new Date(log.relatedRequest.checkout_at), 'd MMM yyyy HH:mm', { locale: es })}</span>
                  </div>
                )}
                {log.relatedRequest.expected_return_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1"><Calendar size={10} />Retorno esp.</span>
                    <span className="text-slate-300">{format(new Date(log.relatedRequest.expected_return_date), 'd MMM yyyy', { locale: es })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates & status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reporte</p>
              <p className="text-white text-xs font-medium">{format(new Date(log.created_at), 'd MMM yyyy', { locale: es })}</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Estado</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${log.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                {log.status === 'RESOLVED' ? 'Resuelto' : 'Abierto'}
              </span>
            </div>
          </div>

          {log.resolved_at && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs">
              <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Resuelto el</p>
              <p className="text-slate-300">{format(new Date(log.resolved_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
            </div>
          )}

          {log.cost != null && (
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Costo de Reparación</p>
              <p className="text-white font-black text-lg">${log.cost.toLocaleString()}</p>
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all">
          Cerrar
        </button>
      </Card>
    </div>
  );
}

// ─── MAINTENANCE PANEL ──────────────────────────────────────
function MaintenancePanel({ onPrintAll }: { onPrintAll: (assets: Asset[]) => void }) {
  const { maintenanceLogs, validateMaintenanceAsset, resolveMaintenance, requests, fetchData } = useData();
  const [searchMaint, setSearchMaint] = useState('');
  const [selectedLog, setSelectedLog] = useState<typeof maintenanceLogs[0] | null>(null);
  const [maintenanceAssets, setMaintenanceAssets] = useState<Asset[]>([]);
  const [maintLoading, setMaintLoading] = useState(false);

  const loadMaintenanceAssets = useCallback(() => {
    setMaintLoading(true);
    getAssetsPaginated(1, 500, { maintenanceOnly: true })
      .then(res => setMaintenanceAssets(res.assets))
      .catch(() => setMaintenanceAssets([]))
      .finally(() => setMaintLoading(false));
  }, []);

  useEffect(() => { loadMaintenanceAssets(); }, [loadMaintenanceAssets, maintenanceLogs.length]);

  const filteredMaint = maintenanceAssets.filter(a =>
    (a.name?.toLowerCase() || '').includes(searchMaint.toLowerCase()) ||
    (a.tag?.toLowerCase() || '').includes(searchMaint.toLowerCase())
  );

  // Find related request for a log
  const getRelatedRequest = (assetId: string): Request | null => {
    return requests.find(r =>
      r.asset_id === assetId && ['MAINTENANCE', 'RETURNED', 'ACTIVE', 'OVERDUE'].includes(r.status)
    ) || null;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {selectedLog && (
        <MaintenanceLogModal
          log={{ ...selectedLog, relatedRequest: getRelatedRequest(selectedLog.asset_id) }}
          onClose={() => setSelectedLog(null)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="text-amber-400" /> Panel de Mantenimiento
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o tag..."
              value={searchMaint}
              onChange={e => setSearchMaint(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => onPrintAll(maintenanceAssets)}
            className="border-primary/30 text-primary hover:bg-primary/10 h-10 whitespace-nowrap"
          >
            <Printer size={16} className="mr-2" /> Imprimir Todos los QR
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
          Requieren Atención ({filteredMaint.length})
        </h3>
        {maintLoading ? (
          <div className="flex justify-center py-16">
            <DataLoadingScreen message="Cargando mantenimiento..." />
          </div>
        ) : filteredMaint.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500">
            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500/30" />
            <p className="text-sm">Todo el inventario en buen estado 🎉</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMaint.map(asset => (
              <Card key={asset.id} className="border-amber-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-white font-bold">{asset.name}</h4>
                    <p className="text-slate-400 text-xs">{asset.tag} · {asset.category}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                        {asset.status}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" onClick={async () => { await validateMaintenanceAsset(asset.id); loadMaintenanceAssets(); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex-shrink-0">
                    <CheckCircle size={12} className="mr-1" /> Validar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {maintenanceLogs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Historial de Incidencias</h3>
          <div className="space-y-2">
            {maintenanceLogs.slice(0, 8).map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:border-amber-500/30 hover:bg-slate-900 transition-all"
              >
                <div>
                  <p className="text-white text-sm font-medium">{log.assets?.name || `#${log.asset_id}`}</p>
                  <p className="text-slate-500 text-xs">{log.issue_description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLog(log)}
                    className="text-[11px] border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                  >
                    Open
                  </Button>
                  {log.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => { e.stopPropagation(); resolveMaintenance(log.id).then(loadMaintenanceAssets); }}
                      className="text-xs text-emerald-400 border-emerald-500/30"
                    >
                      Resolver
                    </Button>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${log.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Toca una incidencia para ver el detalle completo</p>
        </div>
      )}
    </div>
  );
}

const INVENTORY_PAGE_SIZE = 50;

// ─── BUNDLE MANAGER PANEL (modal) ─────────────────────────────
function BundleManagerPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-2xl border-primary/30 max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <Package size={20} className="text-primary" /> Gestión de Kits
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <BundleManager />
        </div>
      </Card>
    </div>
  );
}

// ─── INVENTORY VIEW ──────────────────────────────────────────
function InventoryView({ onPrintSelected, onPrintSingle }: {
  onPrintSelected: (ids: Set<string>, assets: Asset[]) => void;
  onPrintSingle: (asset: Asset) => void;
}) {
  const { addAsset, updateAsset, deleteAsset, importAssets, getNextTag, createBundle } = useData();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('Todas');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryAssets, setInventoryAssets] = useState<Asset[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAssetsMap, setSelectedAssetsMap] = useState<Map<string, Asset>>(new Map());
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [bundleDesc, setBundleDesc] = useState('');
  const [showBundleManager, setShowBundleManager] = useState(false);

  const categoryOptions = ['Todas', ...categories];

  const loadInventory = useCallback(async (page: number) => {
    setInventoryLoading(true);
    try {
      const res = await getAssetsPaginated(page, INVENTORY_PAGE_SIZE, {
        search: search || undefined,
        category: catFilter !== 'Todas' ? catFilter : undefined,
        unbundledOnly: false,
      });
      setInventoryAssets(res.assets);
      setInventoryTotal(res.total);
      if (res.categories?.length) setCategories(res.categories);
    } catch (err) {
      console.error('loadInventory:', err);
      setInventoryAssets([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [search, catFilter]);

  useEffect(() => { setInventoryPage(1); }, [search, catFilter]);
  useEffect(() => { loadInventory(inventoryPage); }, [loadInventory, inventoryPage]);

  const inventoryTotalPages = Math.ceil(inventoryTotal / INVENTORY_PAGE_SIZE) || 1;

  const toggleSelection = (asset: Asset) => {
    const n = new Set(selectedIds);
    const m = new Map(selectedAssetsMap);
    if (n.has(asset.id)) {
      n.delete(asset.id);
      m.delete(asset.id);
    } else {
      n.add(asset.id);
      m.set(asset.id, asset);
    }
    setSelectedIds(n);
    setSelectedAssetsMap(m);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { const r = new FileReader(); r.onload = ev => importAssets(ev.target?.result as string); r.readAsText(f); }
  };

  const handleSave = async () => {
    if (isEditing && currentAsset.id) await updateAsset(currentAsset.id, currentAsset);
    else await addAsset(currentAsset);
    setShowModal(false);
  };

  const statusColors: Record<string, string> = {
    'Disponible': 'text-emerald-400 bg-emerald-500/10',
    'Prestada': 'text-cyan-400 bg-cyan-500/10',
    'En mantenimiento': 'text-amber-400 bg-amber-500/10',
    'Requiere Mantenimiento': 'text-orange-400 bg-orange-500/10',
    'Dada de baja': 'text-slate-500 bg-slate-700/50',
  };

  return (
    <div className="animate-in fade-in">
      {/* Bundle Manager Panel */}
      {showBundleManager && <BundleManagerPanel onClose={() => setShowBundleManager(false)} />}

      <div className="flex flex-col gap-4 mb-6">
        {/* Header row: título + acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 shadow-lg gap-4">
          <div>
            <h3 className="text-white font-bold text-lg">Gestión de Inventario</h3>
            <p className="text-slate-500 text-xs mt-1">Da de alta equipos nuevos o importa de forma masiva</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none border-primary/20 text-primary hover:bg-primary/10">
              <Upload size={16} className="mr-2" /> Importar CSV
            </Button>
            <Button
              variant="neon"
              onClick={async () => {
                setIsEditing(false);
                const tag = await getNextTag();
                setCurrentAsset({ tag, status: 'Disponible', maintenance_period_days: 180, maintenance_usage_threshold: 10 });
                setShowModal(true);
              }}
              className="flex-1 sm:flex-none"
            >
              <Plus size={16} className="mr-2" /> Alta Activo
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Barra de búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
            <Input placeholder="Buscar activo por nombre o tag..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11 bg-slate-900 border-slate-800" />
          </div>
          <div className="flex gap-2 flex-wrap items-center overflow-x-auto pb-1">
            {categoryOptions.map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(String(cat))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${catFilter === cat ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── BOTÓN COMBOS — lado derecho de la búsqueda ── */}
          <button
            onClick={() => setShowBundleManager(true)}
            className="flex-shrink-0 flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-all border bg-slate-900 text-slate-300 border-slate-700 hover:border-primary/60 hover:text-primary hover:bg-primary/5 active:scale-95"
          >
            <Package size={15} />
            <span className="hidden xs:inline">Combos</span>
          </button>
        </div>

        {/* Filtros de categoría (fila separada) */}
        <div className="flex gap-2 flex-wrap items-center overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(String(cat))}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                catFilter === cat
                  ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-primary text-black px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center gap-4 font-bold text-sm">
          <span>{selectedIds.size} seleccionados</span>
          <Button size="sm" variant="secondary" onClick={() => setShowBundleModal(true)} className="h-8 text-xs bg-black text-primary hover:bg-slate-900 border-0">Crear</Button>
          <Button size="sm" variant="secondary" onClick={() => onPrintSelected(selectedIds, Array.from(selectedAssetsMap.values()))} className="h-8 text-xs bg-black text-primary hover:bg-slate-900 border-0">
            <Printer size={14} /> Imprimir QR
          </Button>
          <button onClick={() => { setSelectedIds(new Set()); setSelectedAssetsMap(new Map()); }} className="hover:text-rose-600"><X size={18} /></button>
        </div>
      )}

      {showBundleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm space-y-4 border-primary/30">
            <h3 className="text-white font-bold text-lg">Nuevo Combo</h3>
            <p className="text-xs text-slate-400">Agrupará los {selectedIds.size} activos seleccionados.</p>
            <Input placeholder="Nombre del Combo" value={bundleName} onChange={e => setBundleName(e.target.value)} />
            <Input placeholder="Descripción breve" value={bundleDesc} onChange={e => setBundleDesc(e.target.value)} />
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setShowBundleModal(false)} variant="ghost" className="flex-1">Cancelar</Button>
              <Button variant="neon" className="flex-1" disabled={!bundleName.trim()}
                onClick={async () => {
                  await createBundle(bundleName, bundleDesc, Array.from(selectedIds));
                  setShowBundleModal(false);
                  setSelectedIds(new Set());
                  setSelectedAssetsMap(new Map());
                  setBundleName('');
                  setBundleDesc('');
                  loadInventory(inventoryPage);
                }}>
                Guardar Combo
              </Button>
            </div>
          </Card>
        </div>
      )}

      {inventoryLoading ? (
        <div className="flex justify-center py-16">
          <DataLoadingScreen message="Cargando inventario..." />
        </div>
      ) : (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
            <tr>
              <th className="p-3 w-10"></th>
              <th className="p-3">Activo</th>
              <th className="p-3 hidden md:table-cell">Categoría</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {inventoryAssets.map(a => (
              <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3">
                  <button onClick={() => toggleSelection(a)}>
                    {selectedIds.has(a.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-slate-600" />}
                  </button>
                </td>
                <td className="p-3">
                  <span className="text-white font-medium">{a.name}</span>
                  <span className="text-slate-500 text-xs ml-2 font-mono">{a.tag}</span>
                  {a.maintenance_alert && <span className="ml-2 text-[10px] text-amber-400">⚠ Mant.</span>}
                </td>
                <td className="p-3 hidden md:table-cell text-xs">{a.category || '—'}</td>
                <td className="p-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${statusColors[a.status] || 'text-slate-400 bg-slate-700'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onPrintSingle(a)} className="text-slate-400 hover:text-cyan-400 transition-colors" title="Imprimir QR">
                      <QrCode size={14} />
                    </button>
                    <button onClick={() => { setIsEditing(true); setCurrentAsset(a); setShowModal(true); }} className="text-slate-400 hover:text-primary transition-colors">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => deleteAsset(a.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventoryAssets.length === 0 && (
          <div className="text-center py-12 text-slate-500">Sin activos con ese filtro.</div>
        )}
        {(inventoryTotal > 0 || inventoryAssets.length > 0) && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 p-4 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              Mostrando {(inventoryPage - 1) * INVENTORY_PAGE_SIZE + 1}–{Math.min(inventoryPage * INVENTORY_PAGE_SIZE, inventoryTotal)} de {inventoryTotal} activos
            </span>
            {inventoryTotalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setInventoryPage(p => Math.max(1, p - 1))} disabled={inventoryPage <= 1}>Anterior</Button>
                <span className="flex items-center px-4 text-sm text-slate-400">Página {inventoryPage} de {inventoryTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setInventoryPage(p => Math.min(inventoryTotalPages, p + 1))} disabled={inventoryPage >= inventoryTotalPages}>Siguiente</Button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-white font-bold">{isEditing ? 'Editar' : 'Nuevo'} Activo</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nombre *" value={currentAsset.name || ''} onChange={e => setCurrentAsset({ ...currentAsset, name: e.target.value })} />
              <Input placeholder="Tag (auto)" value={currentAsset.tag || ''} onChange={e => setCurrentAsset({ ...currentAsset, tag: e.target.value })} />
              <Input placeholder="Categoría" value={currentAsset.category || ''} onChange={e => setCurrentAsset({ ...currentAsset, category: e.target.value })} />
              <Input placeholder="Marca" value={currentAsset.brand || ''} onChange={e => setCurrentAsset({ ...currentAsset, brand: e.target.value })} />
              <Input placeholder="Modelo" value={currentAsset.model || ''} onChange={e => setCurrentAsset({ ...currentAsset, model: e.target.value })} />
              <Input placeholder="N° Serie" value={currentAsset.serial || ''} onChange={e => setCurrentAsset({ ...currentAsset, serial: e.target.value })} />
              <Input placeholder="Ubicación" value={currentAsset.location || ''} onChange={e => setCurrentAsset({ ...currentAsset, location: e.target.value })} />
              <Input type="number" placeholder="Valor Comercial" value={currentAsset.commercial_value || ''} onChange={e => setCurrentAsset({ ...currentAsset, commercial_value: Number(e.target.value) })} />
            </div>

            <select
              className="w-full h-10 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={currentAsset.status || 'Disponible'}
              onChange={e => setCurrentAsset({ ...currentAsset, status: e.target.value as AssetState })}
            >
              <option value="Disponible">Disponible</option>
              <option value="En Mantenimiento">En mantenimiento</option>
              <option value="Requiere Mantenimiento">Requiere Mantenimiento</option>
              <option value="Prestada">Prestada</option>
              <option value="Dada de baja">Dada de baja</option>
              <option value="Fuera de servicio">Fuera de servicio</option>
            </select>

            <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5 space-y-3">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Shield size={12} /> Reglas de Mantenimiento Preventivo
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Cada N días</label>
                  <Input type="number" placeholder="180" value={currentAsset.maintenance_period_days || ''} onChange={e => setCurrentAsset({ ...currentAsset, maintenance_period_days: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Después de N préstamos</label>
                  <Input type="number" placeholder="10" value={currentAsset.maintenance_usage_threshold || ''} onChange={e => setCurrentAsset({ ...currentAsset, maintenance_usage_threshold: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ADMIN DASHBOARD ────────────────────────────────────
export function AdminDashboard() {
  const { logout } = useAuth();
  const { processQRScan, requests, auditLogs, stats, isLoading, fetchData } = useData();
  const [currentView, setCurrentView] = useState<'inventory' | 'analytics' | 'external' | 'maintenance'>('inventory');

  const [scannedInfo, setScannedInfo] = useState<{ asset?: Asset; request?: { requester_name: string; status: string; expected_return_date?: string } } | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [showQRPrint, setShowQRPrint] = useState(false);
  const [qrPrintAssets, setQrPrintAssets] = useState<Asset[]>([]);

  const maintenanceCount = stats?.assetCounts?.mantenimiento ?? 0;

  // ─── Estado para Analytics (como auditor) ──────────────────────
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [aiReport, setAiReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const kpis = useMemo(() => {
    const total = stats?.assetCounts?.total ?? 0;
    const disponible = stats?.assetCounts?.disponible ?? 0;
    const mantenimiento = stats?.assetCounts?.mantenimiento ?? 0;
    const disponibilidad = total > 0 ? Math.round((disponible / total) * 100) : 0;
    const overdueLoans = stats?.requestCounts?.overdue ?? requests.filter(r => r.status === 'OVERDUE').length;

    return { total, disponible, mantenimiento, disponibilidad, overdueLoans };
  }, [stats, requests]);

  const filteredLogs = useMemo(() =>
    auditLogs.filter(l =>
      l.action !== 'CREATE' && 
      (filterAction === 'ALL' || l.action === filterAction) &&
      (searchLog === '' || l.details?.toLowerCase().includes(searchLog.toLowerCase()) || l.actor_name?.toLowerCase().includes(searchLog.toLowerCase()))
    ), [auditLogs, filterAction, searchLog]
  );

  const generatePredictiveReport = async () => {
    setIsGenerating(true);
    try {
      const assetNames = requests
        .filter(r => r.assets?.name)
        .map(r => r.assets!.name as string);
      const report = await generateReport(assetNames, 'administrador');
      setAiReport(report);
      toast.success('Reporte generado exitosamente');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error Zykla AI: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCameraScan = async (detectedCodes: { rawValue?: string }[]) => {
    const code = detectedCodes?.[0]?.rawValue;
    if (!code) return;
    setUseCamera(false);
    const result = await processQRScan(code);
    if (result) setScannedInfo(result as { asset?: Asset; request?: { requester_name: string; status: string; expected_return_date?: string } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <DataLoadingScreen message="Cargando panel de administración..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans pb-24 relative">
      <ChatAssistant />

      {scannedInfo && (
        <AssetInfoModal
          asset={scannedInfo.asset}
          relatedRequest={scannedInfo.request}
          onClose={() => setScannedInfo(null)}
        />
      )}

      {useCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-primary/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <ScanLine size={18} className="text-primary" /> Escanear QR del Activo
              </h3>
              <button onClick={() => setUseCamera(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
              <Scanner
                onScan={handleCameraScan}
                constraints={{ facingMode: 'environment' }}
                styles={{ container: { width: '100%', height: '100%' } }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">Centra el QR en la pantalla.</p>
          </Card>
        </div>
      )}

      {showQRPrint && (
        <AssetQRPrint assets={qrPrintAssets} onClose={() => setShowQRPrint(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="text-primary" size={20} /> Panel Maestro
          </h1>
          <div className="hidden md:flex bg-slate-800 p-1 rounded-lg border border-slate-700 gap-1">
            {[
              { id: 'inventory', icon: <LayoutGrid size={13} />, label: 'Inventario' },
              { id: 'analytics', icon: <PieChart size={13} />, label: 'Analíticas' },
              { id: 'external', icon: <Building2 size={13} />, label: 'Externos' },
              { id: 'maintenance', icon: <Wrench size={13} />, label: `Mant. ${maintenanceCount > 0 ? `(${maintenanceCount})` : ''}` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as typeof currentView)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${currentView === tab.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setUseCamera(true)} className="border-primary/30 text-primary hover:bg-primary/10 text-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <ScanLine size={14} className="mr-1" /> Escanear
          </Button>
          <RefreshButton />
          <NotificationCenter />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6">
        {currentView === 'inventory' && (
          <InventoryView
            onPrintSelected={(_ids, assetsToPrint) => { setQrPrintAssets(assetsToPrint); setShowQRPrint(true); }}
            onPrintSingle={(a) => { setQrPrintAssets([a]); setShowQRPrint(true); }}
          />
        )}
        {currentView === 'analytics' && (
          <div className="animate-in fade-in space-y-8 max-w-7xl mx-auto">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Activos" value={kpis.total} color="border-l-primary" icon={<Package />} sublabel={`${kpis.disponibilidad}% disponibles`} />
              <KPICard label="Disponibilidad" value={`${kpis.disponibilidad}%`} color="border-l-emerald-500" icon={<CheckCircle2 />} sublabel={`${kpis.disponible} disponibles`} />
              <KPICard label="Vencidos" value={kpis.overdueLoans} color="border-l-rose-500" icon={<AlertCircle />} sublabel="Requieren atención" />
              <KPICard label="Mantenimiento" value={kpis.mantenimiento} color="border-l-amber-500" icon={<Wrench />} sublabel="Fuera de servicio" />
            </div>

            {/* 🧠 IA PREDICTIVA */}
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

            {/* 🚨 PRÉSTAMOS VENCIDOS — RANKING POR TIEMPO */}
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
              <OverdueList requests={requests} />
            </div>

            {/* 📦 ARTÍCULOS ACTUALMENTE PRESTADOS */}
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
          </div>
        )}
        {currentView === 'external' && <InstitutionsManager />}
        {currentView === 'maintenance' && (
          <MaintenancePanel
            onPrintAll={(assetsToPrint) => { setQrPrintAssets(assetsToPrint); setShowQRPrint(true); }}
          />
        )}
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 p-2 grid grid-cols-4 z-50">
        {[
          { id: 'inventory', icon: <LayoutGrid size={20} />, label: 'Inventario' },
          { id: 'analytics', icon: <PieChart size={20} />, label: 'Analíticas' },
          { id: 'external', icon: <Building2 size={20} />, label: 'Externos' },
          { id: 'maintenance', icon: <Wrench size={20} />, label: 'Mant.' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id as typeof currentView)}
            className={`flex flex-col items-center p-2 gap-0.5 relative ${currentView === tab.id ? (tab.id === 'maintenance' ? 'text-amber-400' : 'text-primary') : 'text-slate-500'}`}
          >
            {tab.icon}
            {tab.id === 'maintenance' && maintenanceCount > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{maintenanceCount}</span>
            )}
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}