import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { Asset, AssetState } from '../../types';
import { Card, Button, Input } from '../ui/core';
import { LogOut, Database, Plus, Search, Edit, Trash2, X,
  Upload, CheckSquare, Square, LayoutGrid, Building2,
  ScanLine, Wrench, Shield, AlertTriangle, CheckCircle,
  QrCode, Printer                                        // ← AGREGAR
} from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';
import { InstitutionsManager } from './InstitutionsManager';
import { NotificationCenter } from '../ui/NotificationCenter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AssetQRPrint } from './AssetQRPrint';


// ─── ASSET INFO MODAL (QR Scan Informativo) ──────────────────
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
          {(asset.maintenance_alert || asset.status === 'Requiere Mantenimiento') && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <p className="text-xs text-amber-300">Este activo requiere mantenimiento preventivo.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── MAINTENANCE PANEL ───────────────────────────────────────
function MaintenancePanel() {
  const { assets, maintenanceLogs, validateMaintenanceAsset, reportMaintenance, resolveMaintenance } = useData();
  const maintenanceAssets = assets.filter(a =>
    a.status === 'En mantenimiento' || a.status === 'Requiere Mantenimiento' || a.maintenance_alert
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="text-amber-400" /> Panel de Mantenimiento
        </h2>
      </div>

      {/* Activos que requieren atención */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
          Requieren Atención ({maintenanceAssets.length})
        </h3>
        {maintenanceAssets.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500">
            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500/30" />
            <p className="text-sm">Todo el inventario en buen estado 🎉</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {maintenanceAssets.map(asset => (
              <Card key={asset.id} className="border-amber-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-white font-bold">{asset.name}</h4>
                    <p className="text-slate-400 text-xs">{asset.tag} · {asset.category}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                        {asset.status}
                      </span>
                      {asset.usage_count !== undefined && (
                        <span className="text-[10px] text-slate-500">Usos: {asset.usage_count}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => validateMaintenanceAsset(asset.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex-shrink-0"
                  >
                    <CheckCircle size={12} className="mr-1" /> Validar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Logs de Mantenimiento */}
      {maintenanceLogs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
            Historial de Incidencias
          </h3>
          <div className="space-y-2">
            {maintenanceLogs.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{log.assets?.name || `#${log.asset_id}`}</p>
                  <p className="text-slate-500 text-xs">{log.issue_description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {log.status === 'OPEN' && (
                    <Button size="sm" variant="outline" onClick={() => resolveMaintenance(log.id)} className="text-xs text-emerald-400 border-emerald-500/30">
                      Resolver
                    </Button>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${log.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVENTORY VIEW ───────────────────────────────────────────
function InventoryView() {
  const { assets, addAsset, updateAsset, deleteAsset, importAssets, getNextTag, createBatchRequest } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const [showQRPrint, setShowQRPrint] = useState(false);
  const [qrPrintAssets, setQrPrintAssets] = useState<Asset[]>([]);

// Helper: abrir modal de impresión para un solo activo
const handlePrintSingle = (asset: Asset) => {
  setQrPrintAssets([asset]);
  setShowQRPrint(true);
};

// Helper: abrir modal de impresión para los seleccionados
const handlePrintSelected = () => {
  const selected = assets.filter(a => selectedIds.has(a.id));
  if (selected.length === 0) return;
  setQrPrintAssets(selected);
  setShowQRPrint(true);
};

  const categories = ['Todas', ...Array.from(new Set(assets.map(a => a.category).filter(Boolean)))];
  const filteredAssets = assets.filter(a =>
    (a.name?.toLowerCase() || '').includes(search.toLowerCase()) &&
    (catFilter === 'Todas' || a.category === catFilter)
  );

  const toggleSelection = (id: string) => {
    const n = new Set(selectedIds);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedIds(n);
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
    'Operativa': 'text-emerald-400 bg-emerald-500/10',
    'Prestada': 'text-cyan-400 bg-cyan-500/10',
    'En mantenimiento': 'text-amber-400 bg-amber-500/10',
    'Requiere Mantenimiento': 'text-orange-400 bg-orange-500/10',
    'Dada de baja': 'text-slate-500 bg-slate-700/50',
  };

  return (
    <div className="animate-in fade-in">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
          <Input placeholder="Buscar activo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-slate-900 border-slate-800" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.slice(0, 5).map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${catFilter === cat ? 'bg-primary text-black border-primary' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}>
              {cat}
            </button>
          ))}
          <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileUpload} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} className="mr-1.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Batch actions */}
      
      {selectedIds.size > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-primary text-black px-5 py-2 rounded-full shadow-lg flex items-center gap-4 font-bold text-sm">
          <span>{selectedIds.size} seleccionados</span>
          {user && (
            <Button size="sm" variant="secondary" onClick={() => {
              createBatchRequest(assets.filter(a => selectedIds.has(a.id)), user, 7, 'Combo Admin');
              setSelectedIds(new Set());
            }} className="h-7 text-xs">
              Crear Combo
            </Button>
          )}
          {/* ← BOTÓN NUEVO */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handlePrintSelected}
            className="h-7 text-xs flex items-center gap-1"
          >
            <Printer size={12} /> Imprimir QR
          </Button>
          <button onClick={() => setSelectedIds(new Set())}><X size={16} /></button>
        </div>
      )}

      {/* Table */}
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
            {filteredAssets.map(a => (
              <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3">
                  <button onClick={() => toggleSelection(a.id)}>
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColors[a.status] || 'text-slate-400 bg-slate-700'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {/* ← BOTÓN NUEVO — imprimir QR de un solo activo */}
                    <button
                      onClick={() => handlePrintSingle(a)}
                      className="text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Imprimir QR"
                    >
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
        {filteredAssets.length === 0 && (
          <div className="text-center py-12 text-slate-500">Sin activos con ese filtro.</div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setIsEditing(false); setCurrentAsset({ tag: getNextTag(), status: 'Operativa', maintenance_period_days: 180, maintenance_usage_threshold: 10 }); setShowModal(true); }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg text-black z-30 hover:scale-110 transition-transform"
      >
        <Plus size={24} />
      </button>

      {/* Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
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

            {/* Estado */}
            <select
              className="w-full h-10 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={currentAsset.status || 'Operativa'}
              onChange={e => setCurrentAsset({ ...currentAsset, status: e.target.value as AssetState })}
            >
              <option value="Operativa">Operativa</option>
              <option value="En mantenimiento">En mantenimiento</option>
              <option value="Requiere Mantenimiento">Requiere Mantenimiento</option>
              <option value="Prestada">Prestada</option>
              <option value="Dada de baja">Dada de baja</option>
              <option value="Fuera de servicio">Fuera de servicio</option>
            </select>

            {/* Mantenimiento Preventivo */}
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
              <p className="text-[10px] text-slate-500">El activo se bloqueará automáticamente al alcanzar estos umbrales.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ← AGREGAR AQUÍ, al final, antes del cierre del div */}
      {showQRPrint && (
        <AssetQRPrint
          assets={qrPrintAssets}
          onClose={() => setShowQRPrint(false)}
        />
      )}
    </div>
  );
}

// ─── MAIN ADMIN DASHBOARD ────────────────────────────────────
export function AdminDashboard() {
  const { logout } = useAuth();
  const { processQRScan, assets, maintenanceLogs } = useData();
  const [currentView, setCurrentView] = useState<'inventory' | 'external' | 'maintenance'>('inventory');
  const [scannedInfo, setScannedInfo] = useState<{ asset?: Asset; request?: { requester_name: string; status: string; expected_return_date?: string } } | null>(null);

  const maintenanceCount = assets.filter(a => a.maintenance_alert || a.status === 'En mantenimiento' || a.status === 'Requiere Mantenimiento').length;

  const handleScan = async () => {
    const qr = prompt('Escanea o ingresa el QR del activo:');
    if (!qr) return;
    const result = await processQRScan(qr);
    if (result) setScannedInfo(result);
  };

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

      {/* Header */}
      <header className="sticky top-0 z-30 flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="text-primary" size={20} /> Panel Maestro
          </h1>
          <div className="hidden md:flex bg-slate-800 p-1 rounded-lg border border-slate-700 gap-1">
            {[
              { id: 'inventory', icon: <LayoutGrid size={13} />, label: 'Inventario' },
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
          <Button variant="outline" size="sm" onClick={handleScan} className="border-primary/30 text-primary hover:bg-primary/10 text-xs">
            <ScanLine size={14} className="mr-1" /> Escanear
          </Button>
          <NotificationCenter />
          <ThemeToggle /> {/* ← AGREGAR AQUÍ */}
          <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6">
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'external' && <InstitutionsManager />}
        {currentView === 'maintenance' && <MaintenancePanel />}
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 p-2 flex justify-around z-50">
        <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center p-2 gap-0.5 ${currentView === 'inventory' ? 'text-primary' : 'text-slate-500'}`}>
          <LayoutGrid size={20} /><span className="text-[10px] font-bold">Inventario</span>
        </button>
        <button onClick={handleScan} className="flex flex-col items-center p-2 text-black bg-primary rounded-full -mt-5 shadow-lg border-4 border-slate-950">
          <ScanLine size={22} />
        </button>
        <button onClick={() => setCurrentView('external')} className={`flex flex-col items-center p-2 gap-0.5 ${currentView === 'external' ? 'text-primary' : 'text-slate-500'}`}>
          <Building2 size={20} /><span className="text-[10px] font-bold">Externos</span>
        </button>
        <button onClick={() => setCurrentView('maintenance')} className={`flex flex-col items-center p-2 gap-0.5 relative ${currentView === 'maintenance' ? 'text-amber-400' : 'text-slate-500'}`}>
          <Wrench size={20} />
          {maintenanceCount > 0 && <span className="absolute -top-1 right-0 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{maintenanceCount}</span>}
          <span className="text-[10px] font-bold">Mant.</span>
        </button>
      </div>
    </div>
  );
}