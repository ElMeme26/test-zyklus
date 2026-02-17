import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import { NotificationCenter } from '../ui/NotificationCenter';
import { Check, X, RotateCcw, Box, User as UserIcon, LogOut, Users, QrCode, Clock, AlertCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Request } from '../../types';
import { ThemeToggle } from '../ui/ThemeToggle';

// ─── QR Modal para el Líder ───────────────────────────────────
function LeaderQRModal({ request, onClose }: { request: Request; onClose: () => void }) {
  const qrData = JSON.stringify({ request_id: request.id, asset_id: request.asset_id, generated_at: new Date().toISOString() });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-xs text-center border-primary/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Mi QR de Salida</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="bg-white p-4 rounded-xl mb-4 inline-block">
          <QRCode value={qrData} size={180} />
        </div>
        <p className="text-xs text-slate-400">Solicitud #{request.id} • {request.assets?.name}</p>
        <p className="text-[10px] text-slate-500 mt-1">Aprobación automática como Líder.</p>
      </Card>
    </div>
  );
}

// ─── Rejection Modal ──────────────────────────────────────────
function RejectionModal({ onConfirm, onCancel, type }: {
  type: 'reject' | 'return';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className={`w-full max-w-sm border ${type === 'reject' ? 'border-rose-500/30' : 'border-amber-500/30'}`}>
        <h3 className="text-white font-bold mb-1">
          {type === 'reject' ? '❌ Rechazar Solicitud' : '↩️ Devolver para Corrección'}
        </h3>
        <p className="text-slate-400 text-xs mb-4">
          {type === 'reject'
            ? 'Esta acción cancela definitivamente la solicitud.'
            : 'El usuario recibirá una notificación para completar la información.'}
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={type === 'reject' ? 'Razón del rechazo...' : '¿Qué información adicional se requiere?'}
          className="w-full h-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button
            className={`flex-1 ${type === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-500 hover:bg-amber-400 text-black'} font-bold`}
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason.trim()}
          >
            {type === 'reject' ? 'Rechazar' : 'Devolver'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Team View ────────────────────────────────────────────────
function TeamView() {
  const { requests } = useData();
  const { user } = useAuth();
  const teamActive = requests.filter(r =>
    r.users?.manager_id === user?.id &&
    ['ACTIVE', 'OVERDUE', 'APPROVED'].includes(r.status)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Activos en manos de mi equipo</h2>
      {teamActive.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Tu equipo no tiene activos prestados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamActive.map(req => {
            const isOverdue = req.status === 'OVERDUE';
            return (
              <div key={req.id} className={`bg-slate-900 border rounded-xl p-4 flex items-center gap-4 ${isOverdue ? 'border-rose-500/30' : 'border-slate-800'}`}>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                  {req.users?.avatar ? <img src={req.users.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : <UserIcon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{req.requester_name}</p>
                  <p className="text-slate-400 text-xs truncate">{req.assets?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${isOverdue ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'}`}>
                    {isOverdue ? '🚨 VENCIDO' : '● ACTIVO'}
                  </span>
                  {req.expected_return_date && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {format(new Date(req.expected_return_date), "d MMM", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN MANAGER INBOX ──────────────────────────────────────
export function ManagerInbox() {
  const { requests, approveRequest, rejectRequest, returnRequestWithFeedback, createRequest, assets } = useData();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'team' | 'myloans'>('inbox');
  const [rejectionModal, setRejectionModal] = useState<{ reqId: number; type: 'reject' | 'return' } | null>(null);
  const [leaderQRReq, setLeaderQRReq] = useState<Request | null>(null);

  const pendingRequests = requests.filter(r =>
    r.status === 'PENDING' &&
    r.users?.manager_id === user?.id
  );

  const myRequests = requests.filter(r =>
    r.user_id === user?.id && ['APPROVED', 'ACTIVE'].includes(r.status)
  );

  const handleAutoRequest = async () => {
    const available = assets.filter(a => a.status === 'Operativa');
    if (!available.length || !user) return;
    // Auto-aprobación: crear solicitud directamente como APPROVED
    const { supabase } = await import('../../supabaseClient');
    const { data } = await supabase.from('requests').insert({
      asset_id: available[0].id,
      user_id: user.id,
      requester_name: user.name,
      requester_dept: user.dept,
      days_requested: 7,
      motive: 'Auto-solicitud líder',
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
    }).select(`*, assets:asset_id(*)`).single();
    if (data) setLeaderQRReq(data);
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      {leaderQRReq && <LeaderQRModal request={leaderQRReq} onClose={() => setLeaderQRReq(null)} />}
      {rejectionModal && (
        <RejectionModal
          type={rejectionModal.type}
          onConfirm={(reason) => {
            if (rejectionModal.type === 'reject') rejectRequest(rejectionModal.reqId, reason);
            else returnRequestWithFeedback(rejectionModal.reqId, reason);
            setRejectionModal(null);
          }}
          onCancel={() => setRejectionModal(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Hola, <span className="text-primary">{user?.name?.split(' ')[0]}</span></h1>
            <p className="text-[11px] text-slate-500">{pendingRequests.length} solicitudes pendientes</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />  {/* ← AGREGAR AQUÍ */}
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-800">
          {[
            { id: 'inbox', label: 'Bandeja', badge: pendingRequests.length },
            { id: 'team', label: 'Mi Equipo', badge: 0 },
            { id: 'myloans', label: 'Mis Préstamos', badge: myRequests.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-primary text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto">
        {/* INBOX TAB */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <Box size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">Todo al día. No hay solicitudes pendientes.</p>
              </div>
            )}
            {pendingRequests.map(req => (
              <Card key={req.id} className="hover:border-primary/20 transition-all">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                      {req.users?.avatar
                        ? <img src={req.users.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                        : <UserIcon size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{req.requester_name}</h3>
                      <p className="text-primary text-sm font-medium">{req.assets?.name || `Activo #${req.asset_id}`}</p>
                      <p className="text-slate-400 text-xs mt-1 italic">"{req.motive || 'Sin motivo especificado'}"</p>
                      <div className="flex gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1"><Clock size={10} /> {req.days_requested} días</span>
                        <span>{req.requester_dept}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-row md:flex-col gap-2 justify-end flex-shrink-0">
                    <Button
                      onClick={() => user && approveRequest(req.id, user.id, user.name)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                    >
                      <Check size={14} className="mr-1" /> Aprobar
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setRejectionModal({ reqId: req.id, type: 'return' })}
                        className="flex-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs"
                        title="Devolver con comentario"
                      >
                        <RotateCcw size={13} />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setRejectionModal({ reqId: req.id, type: 'reject' })}
                        className="flex-1 text-xs"
                        title="Rechazar definitivamente"
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && <TeamView />}

        {/* MY LOANS TAB */}
        {activeTab === 'myloans' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mis Préstamos</h2>
              <Button size="sm" variant="outline" onClick={handleAutoRequest} className="text-xs">
                + Auto-solicitar
              </Button>
            </div>
            {myRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <p className="text-sm">No tienes préstamos activos.</p>
              </div>
            ) : (
              myRequests.map(req => (
                <Card key={req.id} className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-bold">{req.assets?.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{req.assets?.tag}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
                      {req.status}
                    </span>
                    {req.status === 'APPROVED' && (
                      <Button size="sm" variant="neon" onClick={() => setLeaderQRReq(req)} className="text-xs">
                        <QrCode size={12} className="mr-1" /> QR
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}