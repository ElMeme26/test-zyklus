import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

export interface VirtualizedAuditTableProps<T> {
  data: T[];
  total: number;
  isLoading: boolean;
  onLoadMore: () => void;
  columns: Array<{
    key: keyof T;
    label: string;
    width?: string;
    render?: (value: any, item: T) => React.ReactNode;
  }>;
  title?: string;
  emptyMessage?: string;
}

/**
 * Tabla virtualizada para manejar grandes listas de datos (100+).
 * Renderiza filas bajo demanda cuando el usuario hace scroll.
 *
 * Nota: react-window debe estar instalado. Por ahora proporciona
 * fallback a tabla estándar con "Cargar más" para compatibilidad.
 */
export function VirtualizedAuditTable<T extends { id?: string | number }>({
  data,
  total,
  isLoading,
  onLoadMore,
  columns,
  title = 'Datos',
  emptyMessage = 'No hay datos para mostrar'
}: VirtualizedAuditTableProps<T>) {
  const hasMore = data.length < total;

  // Fallback a tabla estándar con lazy loading mientras react-window se instala
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          {title}
        </h3>
      )}

      {data.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    style={{ width: col.width }}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-300"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {data.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      style={{ width: col.width }}
                      className="px-4 py-3 text-sm text-slate-300"
                    >
                      {col.render
                        ? col.render(item[col.key], item)
                        : String(item[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                Cargar más ({data.length} de {total})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
