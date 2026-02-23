// src/components/ui/RefreshButton.tsx
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

export function RefreshButton() {
  const { fetchData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData({ silent: true });
      toast.success('Datos actualizados');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      title="Actualizar datos"
      className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-90 text-slate-400 hover:text-primary hover:bg-primary/10 border border-slate-800 hover:border-primary/30 disabled:opacity-50"
    >
      <RefreshCw
        size={18}
        className={isRefreshing ? 'animate-spin text-primary' : ''}
      />
      {isRefreshing && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}
