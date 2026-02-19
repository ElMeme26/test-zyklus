import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input } from '../ui/core';
import { NotificationCenter } from '../ui/NotificationCenter';
import { Search, LogOut, Clock, Package, ChevronRight, QrCode, X, CheckCircle, MessageSquare, Building2, Info } from 'lucide-react';
import { ChatAssistant } from '../ui/ChatAssistant';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Request } from '../../types';
import { ThemeToggle } from '../ui/ThemeToggle';

// ─── STATUS BADGE ────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:         { label: 'Pendiente',       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ACTION_REQUIRED: { label: 'Acción Req.',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  APPROVED:        { label: 'Aprobado ✓',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ACTIVE:          { label: 'En Préstamo',     color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  OVERDUE:         { label: 'VENCIDO',         color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  RETURNED:        { label: 'Devuelto',        color: 'text-slate-400 bg-slate-700/50 border-slate-600/20' },
  MAINTENANCE:     { label: 'Mantenimiento',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  REJECTED:        { label: 'Rechazado',       color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  CANCELLED:       { label: 'Cancelado',       color: 'text-slate-500 bg-slate-800/50 border-slate-700/20' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { label: status, color: 'text-slate-400 bg-slate-700' };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── MY LOANS VIEW ────────────────────────────────────────────
function MyLoansView({ onShowQR, onFeedback }: {
  onShowQR: (req: any) => void;
  onFeedback: (req: any) => void;
}) {
  const { getUserRequests, requests } = useData();
  const { user } = useAuth();
  const [bundleDetailsId, setBundleDetailsId] = useState<string | null>(null);

  const userReqs = getUserRequests(user?.id || '');
  const active = userReqs.filter(r => ['PENDING', 'ACTION_REQUIRED', 'APPROVED', 'ACTIVE', 'OVERDUE'].includes(r.status));
  const history = userReqs.filter(r => ['RETURNED', 'MAINTENANCE', 'REJECTED', 'CANCELLED'].includes(r.status));

  // Función para obtener los nombres de los activos de un combo específico
  const getBundleAssets = (bundleGroupId: string) => {
    return requests.filter(r => r.bundle_group_id === bundleGroupId).map(r => r.assets?.name);
  };

  return (
    <div className="space-y-6">
      {/* Activos */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Mis Préstamos Activos</h2>
        <div className="space-y-3">
          {active.length === 0 && (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tienes préstamos activos.</p>
            </div>
          )}
          {active.map(req => {
            const isOverdue = req.status === 'OVERDUE';
            const isActionRequired = req.status === 'ACTION_REQUIRED';
            return (
              <Card key={req.id} className={`border transition-all ${isOverdue ? 'border-rose-500/40' : isActionRequired ? 'border-orange-500/40' : 'border-white/5'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Mostrar si es combo o individual */}
                      <h3 className="text-white font-bold truncate">
                        {req.is_bundle ? `📦 Combo: ${req.motive?.split(']')[0].replace('[COMBO: ', '') || 'Kit de equipos'}` : req.assets?.name || `Activo #${req.asset_id}`}
                      </h3>
                      {!req.is_bundle && <span className="text-xs text-slate-500 font-mono flex-shrink-0">{req.assets?.tag}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2">
                      <StatusBadge status={req.status} />
                      {req.expected_return_date && (
                        <span className={isOverdue ? 'text-rose-400' : 'text-slate-400'}>
                          <Clock size={10} className="inline mr-1" />
                          {format(new Date(req.expected_return_date), "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>
                    
                    {/* Detalles del combo si aplica */}
                    {req.is_bundle && (
                      <div className="mt-2">
                        {/* ✨ CORRECCIÓN AQUÍ: Se añade ?? null para evitar el error de TypeScript */}
                        <button 
                          onClick={() => setBundleDetailsId(bundleDetailsId === req.bundle_group_id ? null : (req.bundle_group_id ?? null))} 
                          className="text-[10px] text-primary hover:underline flex items-center gap-1"
                        >
                          <Info size={12} /> {bundleDetailsId === req.bundle_group_id ? 'Ocultar Contenido' : `Ver ${req.bundle_items} equipos incluidos`}
                        </button>
                        {bundleDetailsId === req.bundle_group_id && req.bundle_group_id && (
                          <div className="mt-2 bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-400 space-y-1">
                            {getBundleAssets(req.bundle_group_id).map((name, i) => (
                              <p key={i}>• {name}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACTION_REQUIRED: Mostrar feedback del líder */}
                    {isActionRequired && req.rejection_reason && (
                      <div className="mt-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                        <p className="text-xs text-orange-300">💬 Líder dice: "{req.rejection_reason}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {req.status === 'APPROVED' && (
                      <Button size="sm" variant="neon" onClick={() => onShowQR(req)} className="text-[11px] h-8">
                        <QrCode size={12} className="mr-1" /> {req.is_bundle ? 'QR Único' : 'QR Salida'}
                      </Button>
                    )}
                    {isActionRequired && (
                      <Button size="sm" variant="outline" onClick={() => onFeedback(req)} className="text-[11px] h-8 border-orange-500/40 text-orange-400">
                        <MessageSquare size={12} className="mr-1" /> Responder
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Historial</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map(req => (
              <div key={req.id} className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-slate-300 text-sm font-medium">
                    {req.is_bundle ? `📦 Combo (${req.bundle_items} equipos)` : req.assets?.name || `Activo #${req.asset_id}`}
                  </p>
                  <p className="text-slate-500 text-xs">{format(new Date(req.created_at), "d MMM yyyy", { locale: es })}</p>
                </div>
                <div className="text-right">
                   <StatusBadge status={req.status} />
                   {req.status === 'REJECTED' && req.rejection_reason && (
                      <p className="text-[9px] text-rose-400 mt-1 max-w-[150px] truncate">
                        Motivo: {req.rejection_reason}
                      </p>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QR MODAL ────────────────────────────────────────────────
function QRModal({ request, onClose }: { request: any; onClose: () => void }) {
  const qrData = JSON.stringify({ 
    request_id: request.id, 
    bundle_group_id: request.bundle_group_id, 
    asset_id: request.asset_id, 
    generated_at: new Date().toISOString() 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-xs text-center border-primary/30 shadow-[0_0_60px_rgba(6,182,212,0.2)]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">QR de Salida</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-xl mb-4 inline-block">
          <QRCode value={qrData} size={180} />
        </div>

        {/* Details */}
        <div className="space-y-2 text-left bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Solicitante</span>
            <span className="text-white font-medium">{request.requester_name}</span>
          </div>
          <div className="flex justify-between text-xs text-primary font-bold">
            <span>{request.is_bundle ? 'Combo (Kit)' : 'Activo'}</span>
            <span className="text-right">{request.is_bundle ? `${request.bundle_items} equipos` : request.assets?.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Retorno</span>
            <span className="text-primary font-medium">
              {request.expected_return_date
                ? format(new Date(request.expected_return_date), "d MMM yyyy", { locale: es })
                : '—'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-3">Presenta este {request.is_bundle ? 'ÚNICO ' : ''}QR al guardia de seguridad.</p>
      </Card>
    </div>
  );
}

// ─── FEEDBACK MODAL ──────────────────────────────────────────
function FeedbackModal({ request, onClose }: { request: any; onClose: () => void }) {
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    const { supabase } = await import('../../supabaseClient');
    if(request.bundle_group_id) {
       await supabase.from('requests').update({ status: 'PENDING', motive: text }).eq('bundle_group_id', request.bundle_group_id);
    } else {
       await supabase.from('requests').update({ status: 'PENDING', motive: text }).eq('id', request.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-sm border-orange-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Responder al Líder</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-orange-300">"{request.rejection_reason}"</p>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tu respuesta o justificación..."
          className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-400 text-black" onClick={handleSubmit}>Enviar</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN USER HOME ──────────────────────────────────────────
export function UserHome({ isManagerView = false, onBack }: { isManagerView?: boolean; onBack?: () => void }) {
  const { assets, bundles, createRequest, createBatchRequest, institutions } = useData();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'activos' | 'combos'>('activos');
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');

  // Request modal
  const [selectedAsset, setSelectedAsset] = useState<typeof assets[0] | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<typeof bundles[0] | null>(null);
  const [days, setDays] = useState(0); 
  const [motive, setMotive] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<number | undefined>();

  // QR + Feedback modals
  const [qrRequest, setQRRequest] = useState<any | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<any | null>(null);

  const filteredAssets = useMemo(() =>
    assets.filter(a =>
      a.status === 'Disponible' && 
      !a.maintenance_alert &&
      ((a.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (a.tag?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (a.category?.toLowerCase() || '').includes(search.toLowerCase()))
    ), [assets, search]
  );

  const handleSubmit = async () => {
    if (!user) return;
    if (selectedAsset) {
      await createRequest(selectedAsset, user, days, motive, isExternal ? selectedInstitution : undefined, isManagerView);
    } else if (selectedBundle) {
      await createBatchRequest(selectedBundle, user, days, motive, isManagerView);
    }
    setSelectedAsset(null);
    setSelectedBundle(null);
    setMotive('');
    setDays(0);
    setIsExternal(false);
    setSelectedInstitution(undefined);
    if (!isManagerView) setActiveTab('loans');
    if (isManagerView && onBack) onBack();
  };

  return (
    <div className={`min-h-screen ${isManagerView ? 'bg-transparent' : 'bg-background'} font-sans pb-24`}>
      {!isManagerView && <ChatAssistant />}
      {qrRequest && <QRModal request={qrRequest} onClose={() => setQRRequest(null)} />}
      {feedbackRequest && <FeedbackModal request={feedbackRequest} onClose={() => setFeedbackRequest(null)} />}

      {/* Header */}
      {!isManagerView && (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-lg font-bold text-white">Hola, <span className="text-primary">{user?.name?.split(' ')[0]}</span></h1>
              <p className="text-[11px] text-slate-500">{user?.disciplina}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
            </div>
          </div>

          <div className="flex border-t border-slate-800">
            <button onClick={() => setActiveTab('catalog')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'catalog' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>Catálogo</button>
            <button onClick={() => setActiveTab('loans')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'loans' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>Mis Préstamos</button>
          </div>
        </header>
      )}

      {isManagerView && (
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Auto-Solicitud Líder</h1>
            <p className="text-emerald-400 text-xs font-bold">⚡ Aprobación Directa</p>
          </div>
          <Button variant="outline" onClick={onBack}>Cancelar</Button>
        </header>
      )}

      <main className="p-4">
        {activeTab === 'catalog' ? (
          <>
            <div className="flex flex-col gap-5 mb-8 mt-2 max-w-2xl mx-auto">
              <div className="flex bg-slate-900 rounded-xl p-1.5 border border-slate-800 shadow-inner w-full sm:max-w-md mx-auto">
                <button 
                  onClick={() => setView('activos')} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${view === 'activos' ? 'bg-primary text-black shadow-md scale-105' : 'text-slate-400 hover:text-white'}`}
                >
                  Activos Sueltos
                </button>
                <button 
                  onClick={() => setView('combos')} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${view === 'combos' ? 'bg-primary text-black shadow-md scale-105' : 'text-slate-400 hover:text-white'}`}
                >
                  Combos (Kits)
                </button>
              </div>

              <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                <Input
                  placeholder={view === 'activos' ? "¿Qué activo necesitas hoy?" : "¿Qué combo necesitas hoy?"}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-12 h-12 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.1)] focus:shadow-[0_0_30px_rgba(6,182,212,0.25)] text-base"
                />
              </div>
            </div>

            {/* Grid */}
            {view === 'activos' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredAssets.map(asset => (
                  <Card key={asset.id} className="group hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                    <div className="aspect-video bg-slate-800 rounded-lg mb-3 overflow-hidden relative">
                      <img src={asset.image || `https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={asset.name} />
                      <span className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white keep-white border border-white/10">{asset.tag}</span>
                      {asset.category && <span className="absolute bottom-2 left-2 bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20">{asset.category}</span>}
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1 truncate">{asset.name}</h3>
                    <p className="text-secondary text-xs mb-3 truncate">{asset.description || 'Sin descripción'}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><CheckCircle size={10} /> Disponible</span>
                      <Button size="sm" variant="neon" className="text-[11px] h-7">Solicitar <ChevronRight size={12} /></Button>
                    </div>
                  </Card>
                ))}
                {filteredAssets.length === 0 && (
                  <div className="col-span-full text-center py-16 text-slate-500">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay activos disponibles con ese filtro.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bundles.map(bundle => (
                  <Card key={bundle.id} className="border-primary/20 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedBundle(bundle)}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                        <Package size={24} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{bundle.name}</h3>
                        <p className="text-slate-400 text-xs">{(bundle.assets || []).length} equipos incluidos</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {bundle.assets?.slice(0, 3).map(a => <span key={a.id} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded">{a.name}</span>)}
                      {(bundle.assets?.length || 0) > 3 && <span className="text-[10px] text-slate-500 flex items-center">+{bundle.assets!.length - 3} más</span>}
                    </div>
                    <Button size="sm" variant="neon" className="w-full text-xs h-9 font-bold tracking-wider">
                      Solicitar Combo Completo
                    </Button>
                  </Card>
                ))}
                {bundles.length === 0 && (
                  <div className="col-span-full text-center py-16 text-slate-500">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay combos configurados en el sistema.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <MyLoansView onShowQR={(req) => setQRRequest(req)} onFeedback={(req) => setFeedbackRequest(req)} />
        )}
      </main>

      {/* Request Modal */}
      {(selectedAsset || selectedBundle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md space-y-6 border-primary/30 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">Configura tu solicitud</h2>
                <p className="text-primary text-sm mt-0.5">
                  {selectedAsset ? selectedAsset.name : `Combo: ${selectedBundle?.name}`}
                </p>
              </div>
              <button onClick={() => { setSelectedAsset(null); setSelectedBundle(null); }} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-white uppercase tracking-wider">Retorno</label>
                <div className="bg-primary text-black px-4 py-2 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  {days === 0 ? 'Mismo Día' : `${days} días`}
                </div>
              </div>
              
              <div className="relative">
                <input type="range" min="0" max="30" value={days} onChange={e => setDays(Number(e.target.value))}
                  className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(6,182,212,0.6)]
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                  style={{ background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(days / 30) * 100}%, rgb(30 41 59) ${(days / 30) * 100}%, rgb(30 41 59) 100%)` }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-500 mt-3 font-mono">
                <span className={days === 0 ? 'text-primary font-bold' : ''}>Hoy (9pm)</span>
                <span className={days === 7 ? 'text-primary font-bold' : ''}>1 sem</span>
                <span className={days === 15 ? 'text-primary font-bold' : ''}>15 días</span>
                <span className={days === 30 ? 'text-primary font-bold' : ''}>30 días</span>
              </div>
            </div>

            <Input placeholder="Motivo del préstamo (opcional)" value={motive} onChange={e => setMotive(e.target.value)} />

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={isExternal} onChange={e => setIsExternal(e.target.checked)} className="w-5 h-5 rounded border-2 border-slate-700 bg-slate-900 checked:bg-primary checked:border-primary cursor-pointer transition-all" />
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-slate-500 group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Es para una institución externa</span>
                </div>
              </label>

              {isExternal && (
                <div className="pl-8 animate-in slide-in-from-top-2">
                  <select value={selectedInstitution} onChange={e => setSelectedInstitution(Number(e.target.value))} className="w-full h-11 bg-slate-950 border border-primary/30 rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Selecciona institución...</option>
                    {institutions.map(inst => (<option key={inst.id} value={inst.id}>{inst.name}</option>))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setSelectedAsset(null); setSelectedBundle(null); }}>Cancelar</Button>
              <Button variant="neon" onClick={handleSubmit}>{isManagerView ? 'Auto-Aprobar' : 'Enviar Solicitud'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}