// src/components/ui/NotificationCenter.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, X, CheckCheck, Info, AlertTriangle, AlertCircle, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { requestPushPermission } from '../../context/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification } from '../../types';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  INFO:     { icon: <Info size={14} />,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
  WARNING:  { icon: <AlertTriangle size={14} />, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  ALERT:    { icon: <AlertCircle size={14} />,   color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
  CRITICAL: { icon: <Zap size={14} />,           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
};

function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const cfg = typeConfig[notif.type] || typeConfig.INFO;
  const time = format(new Date(notif.created_at), "d MMM, HH:mm", { locale: es });

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${notif.is_read ? 'bg-slate-900/30 border-slate-800/50 opacity-60' : `${cfg.bg} cursor-pointer active:scale-[0.98]`}`}
      onClick={() => !notif.is_read && onRead(notif.id)}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${notif.is_read ? 'bg-slate-800/50' : cfg.bg} ${cfg.color}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-bold leading-tight ${notif.is_read ? 'text-slate-400' : 'text-white'}`}>
            {notif.title}
          </p>
          {!notif.is_read && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />}
        </div>
        <p className={`text-xs leading-relaxed mt-0.5 ${notif.is_read ? 'text-slate-600' : 'text-slate-300'}`}>
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-600 mt-1">{time}</p>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const { notifications, markNotificationRead, markAllRead } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if ('Notification' in window) setPushEnabled(Notification.permission === 'granted');
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const isInsideButton = panelRef.current?.contains(target);
      const isInsidePortal = portalRef.current?.contains(target);
      if (!isInsideButton && !isInsidePortal) setOpen(false);
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

  // Bloquear scroll del body cuando el panel está abierto en móvil
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const isMobile = window.matchMedia('(max-width: 639px)').matches;
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!user) return null;

  const role = user.role;
  const userId = user.id;

  const myNotifs = notifications.filter(n => n.user_id === userId);
  const myUnread = myNotifs.filter(n => !n.is_read).length;
  const globalUnread = notifications.filter(n => !n.is_read).length;

  // FIX: All roles can see their own notification panel
  // LIDER now also sees their own notifications (was broken before)
  const badgeCount =
    role === 'USUARIO'           ? myUnread :
    role === 'LIDER_EQUIPO'      ? myUnread > 0 ? myUnread : globalUnread :
    role === 'ADMIN_PATRIMONIAL' ? myUnread :
    role === 'AUDITOR'           ? globalUnread :
    myUnread;

  // FIX: All roles can open notification panel now
  const canSeePanel = true;

  const panelNotifs = role === 'AUDITOR' || (role === 'LIDER_EQUIPO' && myNotifs.length === 0)
    ? notifications.slice(0, 30)
    : myNotifs.slice(0, 30);

  const panelUnread = role === 'AUDITOR'
    ? globalUnread
    : myUnread;

  const handleBellClick = () => {
    setOpen(prev => !prev);
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushEnabled(granted);
  };

  const handleMarkAll = () => markAllRead(userId);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-90 ${
          open ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Notificaciones"
      >
        <Bell size={20} />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION PANEL — en móvil usa Portal (z-index alto); en desktop dropdown normal */}
      {canSeePanel && open && (() => {
        const panelContent = (
          <>
            {/* Backdrop móvil */}
            <div
              className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm sm:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            <div
              className={`
                fixed z-[9999] bg-slate-950 border border-slate-800 shadow-2xl
                bottom-0 left-0 right-0 rounded-t-3xl h-[90vh] min-h-[400px] max-h-[90dvh]
                sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-12 sm:h-auto
                sm:z-50 sm:w-96 sm:rounded-2xl sm:max-h-[75vh] sm:min-h-0
                flex flex-col
                animate-in slide-in-from-bottom-4 sm:slide-in-from-top-2
                duration-200
              `}
              role="dialog"
              aria-label="Panel de notificaciones"
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 flex-shrink-0">
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
                    >
                      <Bell size={10} /> Activar
                    </button>
                  )}
                  {pushEnabled && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <Bell size={10} /> Activas
                    </span>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {!pushEnabled && 'Notification' in window && Notification.permission === 'default' && (
                <div className="mx-3 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 flex-shrink-0">
                  <BellOff size={16} className="text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-300 text-xs font-bold">Activa notificaciones del sistema</p>
                    <p className="text-amber-500 text-[10px]">Recibe alertas aunque la app esté cerrada</p>
                  </div>
                  <button
                    onClick={handleEnablePush}
                    className="text-[10px] font-black text-black bg-amber-400 hover:bg-amber-300 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    Activar
                  </button>
                </div>
              )}

              <div className="overflow-y-auto flex-1 p-3 space-y-2 min-h-0">
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

              <div className="sm:hidden" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
            </div>
          </>
        );
        return isMobile && typeof document !== 'undefined'
          ? createPortal(<div ref={portalRef}>{panelContent}</div>, document.body)
          : panelContent;
      })()}
    </div>
  );
}