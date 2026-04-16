import React, { useState } from 'react';
import { Card, Button } from './core';
import { Loader2 } from 'lucide-react';

interface PaginatedHistoryTableProps<T> {
  data: T[];
  total: number;
  isLoading: boolean;
  onLoadMore: () => void;
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;
  title?: string;
  emptyMessage?: string;
}

export function PaginatedHistoryTable<T extends { id: string | number }>({
  data,
  total,
  isLoading,
  onLoadMore,
  columns,
  title,
  emptyMessage = 'No hay registros',
}: PaginatedHistoryTableProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMore = data.length < total;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      {title && <h3 className="text-white font-bold text-sm">{title}</h3>}

      {data.length === 0 ? (
        <Card className="text-center py-8 text-slate-500">{emptyMessage}</Card>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400 min-w-[600px]">
            <thead className="bg-slate-900 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className="p-3">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="p-3">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && !isLoading && (
        <Button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
        >
          {isLoadingMore ? (
            <>
              <Loader2 size={14} className="animate-spin mr-2" /> Cargando...
            </>
          ) : (
            `Cargar más (${data.length} de ${total})`
          )}
        </Button>
      )}

      {!hasMore && data.length > 0 && (
        <p className="text-center text-xs text-slate-500">Fin del historial ({total} registros totales)</p>
      )}
    </div>
  );
}
