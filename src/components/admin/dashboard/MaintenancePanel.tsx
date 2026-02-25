import React, { useState, useCallback, useEffect } from 'react';
import { Search, Wrench, Printer, CheckCircle } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { getAssetsPaginated } from '../../../api/assets';
import { Card, Button, Input } from '../../ui/core';
import { DataLoadingScreen } from '../../ui/DataLoadingScreen';
import { MaintenanceLogModal } from './MaintenanceLogModal';
import type { Asset } from '../../../types';
import type { Request } from '../../../types';

interface MaintenancePanelProps {
  onPrintAll: (assets: Asset[]) => void;
}

/** Panel de mantenimiento: activos que requieren atención e historial de incidencias. */
export function MaintenancePanel({ onPrintAll }: MaintenancePanelProps) {
  const { maintenanceLogs, validateMaintenanceAsset, resolveMaintenance, requests } = useData();
  const [searchMaint, setSearchMaint] = useState('');
  const [selectedLog, setSelectedLog] = useState<typeof maintenanceLogs[0] | null>(null);
  const [maintenanceAssets, setMaintenanceAssets] = useState<Asset[]>([]);
  const [maintLoading, setMaintLoading] = useState(false);

  const loadMaintenanceAssets = useCallback(() => {
    setMaintLoading(true);
    getAssetsPaginated(1, 500, { maintenanceOnly: true })
      .then(res => setMaintenanceAssets(res.assets))
      .catch(() => setMaintenanceAssets([]))
      .finally(() => setMaintLoading(false));
  }, []);

  useEffect(() => { loadMaintenanceAssets(); }, [loadMaintenanceAssets, maintenanceLogs.length]);

  const filteredMaint = maintenanceAssets.filter(a =>
    (a.name?.toLowerCase() || '').includes(searchMaint.toLowerCase()) ||
    (a.tag?.toLowerCase() || '').includes(searchMaint.toLowerCase())
  );

  const getRelatedRequest = (assetId: string): Request | null => {
    return requests.find(r =>
      r.asset_id === assetId && ['MAINTENANCE', 'RETURNED', 'ACTIVE', 'OVERDUE'].includes(r.status)
    ) || null;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {selectedLog && (
        <MaintenanceLogModal
          log={{ ...selectedLog, relatedRequest: getRelatedRequest(selectedLog.asset_id) }}
          onClose={() => setSelectedLog(null)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="text-amber-400" /> Panel de Mantenimiento
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o tag..."
              value={searchMaint}
              onChange={e => setSearchMaint(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => onPrintAll(maintenanceAssets)}
            className="border-primary/30 text-primary hover:bg-primary/10 h-10 whitespace-nowrap"
          >
            <Printer size={16} className="mr-2" /> Imprimir Todos los QR
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
          Requieren Atención ({filteredMaint.length})
        </h3>
        {maintLoading ? (
          <div className="flex justify-center py-16">
            <DataLoadingScreen message="Cargando mantenimiento..." />
          </div>
        ) : filteredMaint.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500">
            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500/30" />
            <p className="text-sm">Todo el inventario en buen estado</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMaint.map(asset => (
              <Card key={asset.id} className="border-amber-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-white font-bold">{asset.name}</h4>
                    <p className="text-slate-400 text-xs">{asset.tag} · {asset.category}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                        {asset.status}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" onClick={async () => { await validateMaintenanceAsset(asset.id); loadMaintenanceAssets(); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex-shrink-0">
                    <CheckCircle size={12} className="mr-1" /> Validar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {maintenanceLogs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Historial de Incidencias</h3>
          <div className="space-y-2">
            {maintenanceLogs.slice(0, 8).map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:border-amber-500/30 hover:bg-slate-900 transition-all"
              >
                <div>
                  <p className="text-white text-sm font-medium">{log.assets?.name || `#${log.asset_id}`}</p>
                  <p className="text-slate-500 text-xs">{log.issue_description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLog(log)}
                    className="text-[11px] border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                  >
                    Ver
                  </Button>
                  {log.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => { e.stopPropagation(); resolveMaintenance(log.id).then(loadMaintenanceAssets); }}
                      className="text-xs text-emerald-400 border-emerald-500/30"
                    >
                      Resolver
                    </Button>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${log.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Toca una incidencia para ver el detalle completo</p>
        </div>
      )}
    </div>
  );
}
