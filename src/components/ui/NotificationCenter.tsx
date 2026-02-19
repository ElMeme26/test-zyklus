import React, { useState } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Info, AlertCircle, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import type { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const typeConfig: Record<Notification['type'], { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  INFO:     { icon: <Info size={14} />,          color: 'text-cyan-600 dark:text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
  WARNING:  { icon: <AlertTriangle size={14} />, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  ALERT:    { icon: <AlertCircle size={14} />,   color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  CRITICAL: { icon: <Zap size={14} />,           color: 'text-rose-600 dark:text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
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
        className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse-slow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Overlay transparente */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown flotante */}
          <div className="absolute right-0 top-full mt-2 w-80 md:w-96 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-transparent">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-primary" />
                  <span className="text-slate-900 dark:text-white font-bold text-sm">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {unreadCount > 0 && user && (
                    <button
                      onClick={() => markAllRead(user.id)}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <CheckCheck size={12} /> Marcar leídas
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-2">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto scrollbar-hide">
                {userNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                    <Bell size={32} className="mb-3 opacity-30" />
                    <p className="text-sm font-medium">No tienes notificaciones</p>
                    <p className="text-xs mt-1">Todo está al día.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userNotifications.map(notif => {
                      const cfg = typeConfig[notif.type] || typeConfig['INFO'];
                      return (
                        <button
                          key={notif.id}
                          onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                          className={cn(
                            'w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                            !notif.is_read && 'bg-slate-50 dark:bg-slate-800/30'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icono de estado */}
                            <div className={cn('p-1.5 rounded-lg border flex-shrink-0 mt-0.5', cfg.bg, cfg.border, cfg.color)}>
                              {cfg.icon}
                            </div>
                            
                            {/* Contenido */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn(
                                  'text-xs font-bold truncate', 
                                  notif.is_read 
                                    ? 'text-slate-500 dark:text-slate-400 font-medium' 
                                    : 'text-slate-900 dark:text-white'
                                )}>
                                  {notif.title}
                                </p>
                                {!notif.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                              </div>
                              <p className={cn(
                                'text-[11px] mt-0.5 line-clamp-2',
                                notif.is_read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'
                              )}>
                                {notif.message}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 font-mono">
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