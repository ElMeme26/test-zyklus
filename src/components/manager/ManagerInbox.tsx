import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import { NotificationCenter } from '../ui/NotificationCenter';
import { RequestDetailModal } from '../ui/RequestDetailModal';
import {
  Check, X, RotateCcw, Box, User as UserIcon, LogOut,
  Users, QrCode, Clock, Plus, Package, Building2, Info
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Request } from '../../types';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DataLoadingScreen } from '../ui/DataLoadingScreen';
import { UserHome } from '../user/UserHome';

// ─── QR Modal para el Líder ───────────────────────────────────
function LeaderQRModal({ request, onClose }: { request: Request; onClose: () => void }) {
  const qrData = JSON.stringify({
    request_id: request.id,
    bundle_group_id: request.bundle_group_id,
    asset_id: request.asset_id,
    generated_at: new Date().toISOString()
  });

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
        <p className="text-xs text-slate-400 font-bold mb-1">
          {(request as Request & { is_bundle?: boolean; bundle_items?: number }).is_bundle
            ? `📦 Combo (${(request as Request & { bundle_items?: number }).bundle_items} piezas)`
            : request.assets?.name}
        </p>
        <p className="text-[10px] text-slate-500">Aprobación automática de Líder.</p>
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
            ? 'Esta acción cancela definitivamente la solicitud y libera el activo.'
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
            {type === 'reject' ? 'Confirmar Rechazo' : 'Confirmar Devolución'}
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
  const [detailReq, setDetailReq] = useState<Request | null>(null);

  // Agrupar préstamos activos del equipo
  const teamActive = Array.from(
    requests.filter(r =>
      r.users?.manager_id === user?.id &&
      ['ACTIVE', 'OVERDUE', 'APPROVED'].includes(r.status)
    ).reduce((acc, r) => {
      if (r.bundle_group_id) {
        if (!acc.has(r.bundle_group_id)) acc.set(r.bundle_group_id, { ...r, is_bundle: true, bundle_items: 1 });
        else {
          const ex = acc.get(r.bundle_group_id)!;
          ex.bundle_items = (ex.bundle_items || 1) + 1;
        }
      } else {
        acc.set(r.id, r);
      }
      return acc;
    }, new Map<string | number, Request>()).values()
  );

  // Para el modal: obtener el request real con todos los joins
  const getRealRequest = (req: Request): Request =>
    requests.find(r => r.id === req.id) || req;

  return (
    <div className="space-y-4">
      {/* Modal de detalle */}
      {detailReq && (
        <RequestDetailModal
          request={getRealRequest(detailReq)}
          onClose={() => setDetailReq(null)}
        />
      )}

      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Activos en manos de mi equipo</h2>
      {teamActive.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Tu equipo no tiene activos prestados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamActive.map((req) => {
            const isOverdue = req.status === 'OVERDUE';
            const r = req as Request & { is_bundle?: boolean; bundle_items?: number };
            return (
              <div
                key={r.id}
                className={`bg-slate-900 border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all ${isOverdue ? 'border-rose-500/30' : 'border-slate-800'}`}
                onClick={() => setDetailReq(r)}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                  {r.users?.avatar
                    ? <img src={r.users.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    : <UserIcon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{r.requester_name}</p>
                  <p className="text-slate-400 text-xs truncate">
                    {r.is_bundle ? `📦 Combo (${r.bundle_items} equipos)` : r.assets?.name}
                  </p>
                  {/* Institución externa visible en el equipo */}
                  {r.institutions?.name && (
                    <p className="text-cyan-400 text-[10px] flex items-center gap-1 mt-0.5">
                      <Building2 size={9} /> {r.institutions.name}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${isOverdue ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'}`}>
                    {isOverdue ? '🚨 VENCIDO' : '● ACTIVO'}
                  </span>
                  {r.expected_return_date && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {format(new Date(r.expected_return_date), "d MMM", { locale: es })}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-600 mt-1 flex items-center justify-end gap-0.5">
                    <Info size={8} /> ver detalle
                  </p>
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
  const { getUserRequests, getTeamRequests, approveRequest, rejectRequest, returnRequestWithFeedback, requests, isLoading } = useData();
  const { logout, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'inbox' | 'team' | 'myloans'>('inbox');
  const [rejectionModal, setRejectionModal] = useState<{ reqId: number; type: 'reject' | 'return' } | null>(null);
  const [leaderQRReq, setLeaderQRReq] = useState<Request | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Modal de detalle para la bandeja de entrada
  const [inboxDetailReq, setInboxDetailReq] = useState<Request | null>(null);

  const teamRequestsGrouped = getTeamRequests(user?.id || '');
  const pendingRequests = teamRequestsGrouped.filter(r => r.status === 'PENDING');

  const myRequestsGrouped = getUserRequests(user?.id || '');
  const myActiveLoans = myRequestsGrouped.filter(r => ['APPROVED', 'ACTIVE'].includes(r.status));

  // Para el modal: obtener el request real con todos los joins
  const getRealRequest = (req: Request): Request => {
    if (req.bundle_group_id) {
      return requests.find(r => r.bundle_group_id === req.bundle_group_id) || req;
    }
    return requests.find(r => r.id === req.id) || req;
  };

  if (isRequesting) {
    return <UserHome isManagerView={true} onBack={() => setIsRequesting(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <DataLoadingScreen message="Cargando bandeja de solicitudes..." />
      </div>
    );
  }

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

      {/* Modal detalle de inbox */}
      {inboxDetailReq && (
        <RequestDetailModal
          request={getRealRequest(inboxDetailReq)}
          onClose={() => setInboxDetailReq(null)}
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
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
          </div>
        </div>

        <div className="flex border-t border-slate-800">
          {[
            { id: 'inbox', label: 'Bandeja', badge: pendingRequests.length },
            { id: 'team', label: 'Mi Equipo', badge: 0 },
            { id: 'myloans', label: 'Mis Préstamos', badge: myActiveLoans.length },
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

        {/* ── INBOX TAB ── */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <Box size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">Todo al día. No hay solicitudes pendientes.</p>
              </div>
            )}

            {pendingRequests.map((req) => {
              const r = req as Request & { is_bundle?: boolean; bundle_items?: number };
              return (
                <Card key={r.id} className="hover:border-primary/20 transition-all border border-slate-800 bg-slate-900/50">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div
                      className="flex items-start gap-4 flex-1 cursor-pointer"
                      onClick={() => setInboxDetailReq(r)}
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                        {r.users?.avatar
                          ? <img src={r.users.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                          : <UserIcon size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {r.requester_name}
                        </h3>

                        {/* Activo o Combo */}
                        <p className="text-primary text-sm font-medium flex items-center gap-1">
                          {r.is_bundle ? <Package size={14} /> : <Box size={14} />}
                          {r.is_bundle
                            ? `Combo: ${r.motive?.split(']')[0].replace('[COMBO: ', '')} (${r.bundle_items} equipos)`
                            : r.assets?.name}
                        </p>

                        {/* ── INSTITUCIÓN EXTERNA — visible para el líder ── */}
                        {r.institutions?.name && (
                          <div className="flex items-center gap-1.5 mt-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-1 w-fit">
                            <Building2 size={11} className="text-cyan-400 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-cyan-400">Institución Externa</p>
                              <p className="text-[10px] text-cyan-300">{r.institutions.name}</p>
                            </div>
                          </div>
                        )}

                        <p className="text-slate-400 text-xs mt-1 italic">
                          "{r.is_bundle
                            ? (r.motive?.split('] ')[1] || 'Sin motivo adicional')
                            : (r.motive || 'Sin motivo especificado')}"
                        </p>

                        <div className="flex gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {r.days_requested === 0 ? 'Mismo día' : `${r.days_requested} días`}
                          </span>
                          <span>{r.requester_disciplina}</span>
                        </div>

                        <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                          <Info size={9} /> Toca la tarjeta para ver detalles completos
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      className="flex flex-row md:flex-col gap-2 justify-end flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <Button
                        onClick={() => user && approveRequest(r.id, user.id, user.name)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs border-0"
                      >
                        <Check size={14} className="mr-1" /> Aprobar
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setRejectionModal({ reqId: r.id, type: 'return' })}
                          className="flex-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs"
                          title="Devolver con comentario"
                        >
                          <RotateCcw size={13} />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setRejectionModal({ reqId: r.id, type: 'reject' })}
                          className="flex-1 text-xs border-rose-500/30 hover:bg-rose-500/10 text-rose-500"
                          title="Rechazar definitivamente"
                        >
                          <X size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === 'team' && <TeamView />}

        {/* ── MY LOANS TAB ── */}
        {activeTab === 'myloans' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mis Préstamos</h2>
              <Button size="sm" variant="neon" onClick={() => setIsRequesting(true)} className="text-xs">
                <Plus size={14} className="mr-1" /> Auto-solicitar
              </Button>
            </div>

            {myActiveLoans.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <p className="text-sm">No tienes préstamos activos.</p>
              </div>
            ) : (
              myActiveLoans.map((req) => {
                const r = req as Request & { is_bundle?: boolean; bundle_items?: number };
                return (
                  <Card key={r.id} className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold">
                        {r.is_bundle ? `📦 Combo (${r.bundle_items} equipos)` : r.assets?.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {r.is_bundle ? 'Solicitud Grupal' : r.assets?.tag}
                      </p>
                      {r.institutions?.name && (
                        <p className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1">
                          <Building2 size={9} /> {r.institutions.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
                        {r.status}
                      </span>
                      {r.status === 'APPROVED' && (
                        <Button size="sm" variant="neon" onClick={() => setLeaderQRReq(r)} className="text-xs h-8">
                          <QrCode size={12} className="mr-1" /> QR
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}