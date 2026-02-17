import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input } from '../ui/core';
import { NotificationCenter } from '../ui/NotificationCenter';
import {
  Search, LogOut, Clock, Info, Package, ChevronRight,
  QrCode, RotateCcw, X, CheckCircle, AlertCircle, MessageSquare, Building2
} from 'lucide-react';
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
  onShowQR: (req: Request) => void;
  onFeedback: (req: Request) => void;
}) {
  const { getUserRequests, renewRequest } = useData();
  const { user } = useAuth();
  const userReqs = getUserRequests(user?.id || '');
  const active = userReqs.filter(r => ['PENDING', 'ACTION_REQUIRED', 'APPROVED', 'ACTIVE', 'OVERDUE'].includes(r.status));
  const history = userReqs.filter(r => ['RETURNED', 'MAINTENANCE', 'REJECTED', 'CANCELLED'].includes(r.status));

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
                      <h3 className="text-white font-bold truncate">{req.assets?.name || `Activo #${req.asset_id}`}</h3>
                      <span className="text-xs text-slate-500 font-mono flex-shrink-0">{req.assets?.tag}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <StatusBadge status={req.status} />
                      {req.expected_return_date && (
                        <span className={isOverdue ? 'text-rose-400' : 'text-slate-400'}>
                          <Clock size={10} className="inline mr-1" />
                          {format(new Date(req.expected_return_date), "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>
                    {/* ACTION_REQUIRED: Mostrar feedback del líder */}
                    {isActionRequired && req.feedback_log && (
                      <div className="mt-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                        <p className="text-xs text-orange-300">💬 Líder dice: "{req.feedback_log}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {req.status === 'APPROVED' && (
                      <Button size="sm" variant="neon" onClick={() => onShowQR(req)} className="text-[11px] h-8">
                        <QrCode size={12} className="mr-1" /> QR Salida
                      </Button>
                    )}
                    {req.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => renewRequest(req.id, 7)} className="text-[11px] h-8">
                        <RotateCcw size={12} className="mr-1" /> +7 días
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
            {history.slice(0, 5).map(req => (
              <div key={req.id} className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-slate-300 text-sm font-medium">{req.assets?.name || `Activo #${req.asset_id}`}</p>
                  <p className="text-slate-500 text-xs">{format(new Date(req.created_at), "d MMM yyyy", { locale: es })}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QR MODAL ────────────────────────────────────────────────
function QRModal({ request, onClose }: { request: Request; onClose: () => void }) {
  const qrData = JSON.stringify({ request_id: request.id, asset_id: request.asset_id, generated_at: new Date().toISOString() });

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
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Activo</span>
            <span className="text-white font-medium">{request.assets?.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Retorno</span>
            <span className="text-primary font-medium">
              {request.expected_return_date
                ? format(new Date(request.expected_return_date), "d MMM yyyy", { locale: es })
                : '—'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Solicitud ID</span>
            <span className="text-slate-400 font-mono">#{request.id}</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-3">Presenta este QR al guardia de seguridad.</p>
      </Card>
    </div>
  );
}

// ─── FEEDBACK MODAL ──────────────────────────────────────────
function FeedbackModal({ request, onClose }: { request: Request; onClose: () => void }) {
  const [text, setText] = useState('');
  const { updateAsset } = useData();

  const handleSubmit = async () => {
    const { supabase } = await import('../../supabaseClient');
    await supabase.from('requests').update({
      status: 'PENDING',
      motive: text,
      feedback_log: `Usuario respondió: ${text}`,
    }).eq('id', request.id);
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
          <p className="text-xs text-orange-300">"{request.feedback_log}"</p>
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
export function UserHome() {
  const { assets, createRequest, institutions } = useData();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');

  // Request modal
  const [selectedAsset, setSelectedAsset] = useState<typeof assets[0] | null>(null);
  const [days, setDays] = useState(7);
  const [motive, setMotive] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<number | undefined>();

  // QR + Feedback modals
  const [qrRequest, setQRRequest] = useState<Request | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<Request | null>(null);

  const filteredAssets = useMemo(() =>
    assets.filter(a =>
      a.status === 'Operativa' &&
      !a.maintenance_alert &&
      ((a.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (a.tag?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (a.category?.toLowerCase() || '').includes(search.toLowerCase()))
    ), [assets, search]
  );

  const handleSubmit = async () => {
    if (!selectedAsset || !user) return;
    await createRequest(selectedAsset, user, days, motive, isExternal ? selectedInstitution : undefined);
    setSelectedAsset(null);
    setMotive('');
    setDays(7);
    setIsExternal(false);
    setSelectedInstitution(undefined);
    setActiveTab('loans');
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      <ChatAssistant />
      {qrRequest && <QRModal request={qrRequest} onClose={() => setQRRequest(null)} />}
      {feedbackRequest && <FeedbackModal request={feedbackRequest} onClose={() => setFeedbackRequest(null)} />}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Hola, <span className="text-primary">{user?.name?.split(' ')[0]}</span></h1>
            <p className="text-[11px] text-slate-500">{user?.dept}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />  {/* ← AGREGAR AQUÍ */}
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-800">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'catalog' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'loans' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
          >
            Mis Préstamos
          </button>
        </div>
      </header>

      <main className="p-4">
        {activeTab === 'catalog' ? (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3 text-slate-500 w-4 h-4" />
              <Input
                placeholder="¿Qué necesitas hoy?"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 h-12 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.1)] focus:shadow-[0_0_30px_rgba(6,182,212,0.25)]"
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => (
                <Card key={asset.id} className="group hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                  <div className="aspect-video bg-slate-800 rounded-lg mb-3 overflow-hidden relative">
                    <img
                      src={asset.image || `https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500`}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      alt={asset.name}
                    />
                    <span className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">
                      {asset.tag}
                    </span>
                    {asset.category && (
                      <span className="absolute bottom-2 left-2 bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20">
                        {asset.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1 truncate">{asset.name}</h3>
                  <p className="text-secondary text-xs mb-3 truncate">{asset.description || 'Sin descripción'}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle size={10} /> Disponible
                    </span>
                    <Button size="sm" variant="neon" className="text-[11px] h-7">
                      Solicitar <ChevronRight size={12} />
                    </Button>
                  </div>
                </Card>
              ))}
              {filteredAssets.length === 0 && (
                <div className="col-span-3 text-center py-16 text-slate-500">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No hay activos disponibles con ese filtro.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <MyLoansView onShowQR={(req) => setQRRequest(req)} onFeedback={(req) => setFeedbackRequest(req)} />
        )}
      </main>

      {/* Request Modal — MEJORADO */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md space-y-6 border-primary/30 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">Configura tu solicitud</h2>
                <p className="text-primary text-sm mt-0.5">{selectedAsset.name}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* ✨ SLIDER MEJORADO — MÁS GRANDE Y BONITO */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-white uppercase tracking-wider">Duración</label>
                <div className="bg-primary text-black px-4 py-2 rounded-xl font-black text-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  {days} <span className="text-sm font-medium">días</span>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-6 
                    [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-primary 
                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(6,182,212,0.6)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:w-6 
                    [&::-moz-range-thumb]:h-6 
                    [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-primary 
                    [&::-moz-range-thumb]:border-0
                    [&::-moz-range-thumb]:shadow-[0_0_15px_rgba(6,182,212,0.6)]
                    [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((days - 1) / 29) * 100}%, rgb(30 41 59) ${((days - 1) / 29) * 100}%, rgb(30 41 59) 100%)`
                  }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-500 mt-3 font-mono">
                <span className={days === 1 ? 'text-primary font-bold' : ''}>1 día</span>
                <span className={days === 7 ? 'text-primary font-bold' : ''}>1 semana</span>
                <span className={days === 15 ? 'text-primary font-bold' : ''}>2 semanas</span>
                <span className={days === 30 ? 'text-primary font-bold' : ''}>1 mes</span>
              </div>
            </div>

            {/* Motive */}
            <Input
              placeholder="Motivo del préstamo (opcional, ayuda a aprobar más rápido)"
              value={motive}
              onChange={e => setMotive(e.target.value)}
            />

            {/* ✨ CHECKBOX INSTITUCIÓN EXTERNA */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isExternal}
                  onChange={e => setIsExternal(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-slate-700 bg-slate-900 checked:bg-primary checked:border-primary cursor-pointer transition-all"
                />
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-slate-500 group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    Es para una institución externa
                  </span>
                </div>
              </label>

              {isExternal && (
                <div className="pl-8 animate-in slide-in-from-top-2">
                  <select
                    value={selectedInstitution}
                    onChange={e => setSelectedInstitution(Number(e.target.value))}
                    className="w-full h-11 bg-slate-950 border border-primary/30 rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Selecciona institución...</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Zykla AI Suggestion */}
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex gap-3 items-start">
              <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                <span className="text-primary font-bold">Zykla sugiere:</span> Si solicitas este equipo, considera agregar accesorios complementarios disponibles para optimizar tu proyecto.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="ghost" onClick={() => setSelectedAsset(null)}>Cancelar</Button>
              <Button variant="neon" onClick={handleSubmit}>Enviar Solicitud</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}