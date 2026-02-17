import React, { useState } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Info, AlertCircle, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import type { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const typeConfig: Record<Notification['type'], { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  INFO:     { icon: <Info size={14} />,          color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
  WARNING:  { icon: <AlertTriangle size={14} />, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  ALERT:    { icon: <AlertCircle size={14} />,   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  CRITICAL: { icon: <Zap size={14} />,           color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
};

export function NotificationCenter() {
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Filtrar notificaciones del usuario actual
  const userNotifications = notifications.filter(n => n.user_id === user?.id).slice(0, 20);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 md:w-96 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-primary" />
                  <span className="text-white font-bold text-sm">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && user && (
                    <button
                      onClick={() => markAllRead(user.id)}
                      className="text-[11px] text-slate-400 hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck size={12} /> Marcar todas
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto scrollbar-hide">
                {userNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Bell size={32} className="mb-3 opacity-30" />
                    <p className="text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {userNotifications.map(notif => {
                      const cfg = typeConfig[notif.type];
                      return (
                        <button
                          key={notif.id}
                          onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                          className={cn(
                            'w-full text-left px-4 py-3 transition-colors hover:bg-slate-800/50',
                            !notif.is_read && 'bg-slate-800/30'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={cn('p-1.5 rounded-lg border flex-shrink-0 mt-0.5', cfg.bg, cfg.border, cfg.color)}>
                              {cfg.icon}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn('text-xs font-bold truncate', notif.is_read ? 'text-slate-300' : 'text-white')}>
                                  {notif.title}
                                </p>
                                {!notif.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-[10px] text-slate-600 mt-1">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}