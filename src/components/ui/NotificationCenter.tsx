// src/components/ui/NotificationCenter.tsx
// Mobile-first. Lógica de visibilidad por rol:
// - USUARIO: ve sus propias notificaciones (+ badge con total de los demás)
// - LIDER_EQUIPO: NO ve sus notificaciones propias, solo badge si otros tienen
// - ADMIN_PATRIMONIAL: ve sus notificaciones propias + badge global

import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, X, Check, CheckCheck, Info, AlertTriangle, AlertCircle, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { requestPushPermission } from '../../context/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification } from '../../types';

// ─── ICON BY TYPE ─────────────────────────────────────────────
const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  INFO:     { icon: <Info size={14} />,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
  WARNING:  { icon: <AlertTriangle size={14} />, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  ALERT:    { icon: <AlertCircle size={14} />,   color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
  CRITICAL: { icon: <Zap size={14} />,           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
};

// ─── SINGLE NOTIFICATION ITEM ─────────────────────────────────
function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const cfg = typeConfig[notif.type] || typeConfig.INFO;
  const time = format(new Date(notif.created_at), "d MMM, HH:mm", { locale: es });

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${notif.is_read ? 'bg-slate-900/30 border-slate-800/50 opacity-60' : `${cfg.bg} cursor-pointer active:scale-[0.98]`}`}
      onClick={() => !notif.is_read && onRead(notif.id)}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${notif.is_read ? 'bg-slate-800/50' : cfg.bg} ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-bold leading-tight ${notif.is_read ? 'text-slate-400' : 'text-white'}`}>
            {notif.title}
          </p>
          {!notif.is_read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
          )}
        </div>
        <p className={`text-xs leading-relaxed mt-0.5 ${notif.is_read ? 'text-slate-600' : 'text-slate-300'}`}>
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-600 mt-1">{time}</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export function NotificationCenter() {
  const { notifications, markNotificationRead, markAllRead } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Check push permission on mount
  useEffect(() => {
    if ('Notification' in window) setPushEnabled(Notification.permission === 'granted');
  }, []);

  // Close on outside tap (mobile-friendly)
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  if (!user) return null;

  const role = user.role;
  const userId = user.id;

  // ── LÓGICA DE VISIBILIDAD ──────────────────────────────────
  // Notificaciones PROPIAS del usuario actual
  const myNotifs = notifications.filter(n => n.user_id === userId);
  const myUnread = myNotifs.filter(n => !n.is_read).length;

  // Total de notificaciones no leídas de TODOS los usuarios (para badge global)
  const globalUnread = notifications.filter(n => !n.is_read).length;

  // Badge counter: qué número mostrar en la campanita
  // USUARIO: solo sus propias
  // LIDER: suma de todos menos las suyas (si las tuviera)
  // ADMIN: sus propias (el panel solo muestra las suyas)
  const badgeCount =
    role === 'USUARIO'           ? myUnread :
    role === 'LIDER_EQUIPO'      ? globalUnread :
    role === 'ADMIN_PATRIMONIAL' ? myUnread :
    role === 'AUDITOR'           ? globalUnread :
    myUnread;

  // Lo que se MUESTRA en el panel abierto
  // LIDER: No puede ver notificaciones propias en el panel — no se muestra panel
  const canSeePanel = role !== 'LIDER_EQUIPO';

  // Notificaciones a mostrar en el panel (solo las del usuario actual)
  const panelNotifs = myNotifs.slice(0, 30);
  const panelUnread = myUnread;

  const handleBellClick = async () => {
    if (!canSeePanel) {
      // LIDER toca la campanita pero no tiene panel — solo mensaje
      // (el badge es informativo de su equipo)
      return;
    }
    setOpen(prev => !prev);
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushEnabled(granted);
  };

  const handleMarkAll = () => markAllRead(userId);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell Button ─────────────────────────────────────── */}
      <button
        onClick={handleBellClick}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-90 ${
          open ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title={role === 'LIDER_EQUIPO' ? 'Tu equipo tiene notificaciones' : 'Notificaciones'}
      >
        <Bell size={20} />

        {/* Badge */}
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse-once">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {/* ── LEADER TOOLTIP (no tiene panel) ─────────────────── */}
      {role === 'LIDER_EQUIPO' && open && (
        <div className="absolute right-0 top-12 z-50 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 text-center animate-in slide-in-from-top-2">
          <Bell size={24} className="text-primary mx-auto mb-2" />
          <p className="text-white text-sm font-bold">Tu equipo tiene {globalUnread} notificación{globalUnread !== 1 ? 'es' : ''}</p>
          <p className="text-slate-400 text-xs mt-1">Como líder ves el total de tu equipo. El badge te indica actividad.</p>
          <button onClick={() => setOpen(false)} className="mt-3 text-xs text-slate-500 underline">Cerrar</button>
        </div>
      )}

      {/* ── NOTIFICATION PANEL (mobile-first, full-screen en mobile) ── */}
      {canSeePanel && open && (
        <>
          {/* Backdrop mobile */}
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />

          <div className={`
            fixed z-50 bg-slate-950 border border-slate-800 shadow-2xl
            /* Mobile: bottom sheet */
            bottom-0 left-0 right-0 rounded-t-3xl max-h-[82vh]
            /* Desktop: dropdown */
            sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-12 sm:w-96 sm:rounded-2xl sm:max-h-[75vh]
            flex flex-col animate-in
            sm:slide-in-from-top-2
            slide-in-from-bottom-4
            duration-200
          `}>
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-white font-bold text-sm">Notificaciones</h3>
                {panelUnread > 0 && (
                  <p className="text-primary text-[10px] font-bold">{panelUnread} sin leer</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {panelUnread > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <CheckCheck size={12} /> Todas leídas
                  </button>
                )}
                {!pushEnabled && 'Notification' in window && (
                  <button
                    onClick={handleEnablePush}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors"
                    title="Activar notificaciones del sistema"
                  >
                    <Bell size={10} /> Activar
                  </button>
                )}
                {pushEnabled && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold" title="Notificaciones del sistema activas">
                    <Bell size={10} /> Activas
                  </span>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Push permission banner */}
            {!pushEnabled && 'Notification' in window && Notification.permission === 'default' && (
              <div className="mx-3 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <BellOff size={16} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300 text-xs font-bold">Activa notificaciones del sistema</p>
                  <p className="text-amber-500 text-[10px]">Recibe alertas aunque la app esté cerrada</p>
                </div>
                <button onClick={handleEnablePush} className="text-[10px] font-black text-black bg-amber-400 hover:bg-amber-300 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0">
                  Activar
                </button>
              </div>
            )}

            {/* Notification list */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2 pb-safe">
              {panelNotifs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Bell size={22} className="text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Sin notificaciones</p>
                  <p className="text-slate-600 text-xs mt-1">Estás al día 👍</p>
                </div>
              ) : (
                panelNotifs.map(n => (
                  <NotifItem key={n.id} notif={n} onRead={markNotificationRead} />
                ))
              )}
            </div>

            {/* Footer safe area for mobile */}
            <div className="pb-safe-area-inset-bottom" />
          </div>
        </>
      )}
    </div>
  );
}