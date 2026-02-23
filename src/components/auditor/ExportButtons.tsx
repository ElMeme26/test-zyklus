// src/components/auditor/ExportButtons.tsx
import React, { useState } from 'react';
import { Button } from '../ui/core';
import { Download, FileText, FileSpreadsheet, Loader2, ChevronDown, Users, Wrench } from 'lucide-react';
import { getAssetsPaginated } from '../../api/assets';
import { 
  exportRequestsToCSV, 
  exportRequestsToPDF, 
  exportRequestsToExcel,
  exportInventoryToPDF,
  exportAuditLogsToExcel,
  exportRequestsByUser,
  exportMaintenanceReport,
} from '../../lib/exportUtils';
import type { Request, Asset, AuditLog, MaintenanceLog } from '../../types';
import { toast } from 'sonner';

interface ExportButtonsProps {
  requests: Request[];
  assets: Asset[];
  auditLogs: AuditLog[];
  maintenanceLogs?: MaintenanceLog[];
}

export function ExportButtons({ requests, assets, auditLogs, maintenanceLogs = [] }: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  type ExportType =
    | 'requests_csv'
    | 'requests_pdf'
    | 'requests_excel'
    | 'inventory_pdf'
    | 'audit_excel'
    | 'by_user_excel'
    | 'maintenance_excel';

  const fetchAllAssets = async (): Promise<Asset[]> => {
    if (assets.length > 0) return assets;
    const all: Asset[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await getAssetsPaginated(page, 2000, { export: true });
      all.push(...res.assets);
      hasMore = res.assets.length === 2000 && all.length < res.total;
      page++;
    }
    return all;
  };

  const handleExport = async (type: ExportType) => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'requests_csv':
          exportRequestsToCSV(requests);
          toast.success('CSV generado correctamente');
          break;
        case 'requests_pdf':
          exportRequestsToPDF(requests);
          toast.success('PDF generado correctamente');
          break;
        case 'requests_excel':
          exportRequestsToExcel(requests);
          toast.success('Excel generado correctamente');
          break;
        case 'inventory_pdf': {
          const assetsToExport = await fetchAllAssets();
          exportInventoryToPDF(assetsToExport);
          toast.success('Inventario PDF generado');
          break;
        }
        case 'audit_excel':
          exportAuditLogsToExcel(auditLogs);
          toast.success('Audit Trail exportado');
          break;
        case 'by_user_excel':
          exportRequestsByUser(requests);
          toast.success('Reporte por usuario generado');
          break;
        case 'maintenance_excel': {
          const assetsToExport = await fetchAllAssets();
          exportMaintenanceReport(maintenanceLogs, assetsToExport);
          toast.success('Reporte de mantenimiento generado');
          break;
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al generar el archivo');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 border-slate-700 shadow-sm"
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} className="text-emerald-400" />
        )}
        Exportar
        <ChevronDown size={12} className={`transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Reportes Disponibles
                </p>
              </div>
              
              <div className="p-2 space-y-1">

                {/* Solicitudes */}
                <div className="px-2 py-1">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Solicitudes</p>
                </div>
                <button
                  onClick={() => handleExport('requests_csv')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <FileText size={16} className="text-emerald-400" />
                  <div>
                    <p className="font-medium text-white">CSV</p>
                    <p className="text-[10px] text-slate-500">{requests.length} registros</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handleExport('requests_pdf')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <FileText size={16} className="text-rose-400" />
                  <div>
                    <p className="font-medium text-white">PDF</p>
                    <p className="text-[10px] text-slate-500">Formato imprimible</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handleExport('requests_excel')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <FileSpreadsheet size={16} className="text-emerald-500" />
                  <div>
                    <p className="font-medium text-white">Excel</p>
                    <p className="text-[10px] text-slate-500">Análisis avanzado</p>
                  </div>
                </button>

                {/* Por Usuario / Centro de Costo */}
                <div className="px-2 py-1 mt-2 border-t border-slate-800/50 pt-2">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Por Usuario / Centro de Costo</p>
                </div>
                <button
                  onClick={() => handleExport('by_user_excel')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <Users size={16} className="text-blue-400" />
                  <div>
                    <p className="font-medium text-white">Préstamos por Usuario</p>
                    <p className="text-[10px] text-slate-500">Resumen + detalle + disciplinas</p>
                  </div>
                </button>

                {/* Mantenimiento */}
                <div className="px-2 py-1 mt-2 border-t border-slate-800/50 pt-2">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Incidencias y Mantenimiento</p>
                </div>
                <button
                  onClick={() => handleExport('maintenance_excel')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <Wrench size={16} className="text-amber-400" />
                  <div>
                    <p className="font-medium text-white">Reporte de Mantenimiento</p>
                    <p className="text-[10px] text-slate-500">Incidencias + ranking + alertas</p>
                  </div>
                </button>

                {/* Inventario */}
                <div className="px-2 py-1 mt-2 border-t border-slate-800/50 pt-2">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Inventario</p>
                </div>
                <button
                  onClick={() => handleExport('inventory_pdf')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <FileText size={16} className="text-cyan-400" />
                  <div>
                    <p className="font-medium text-white">Inventario PDF</p>
                    <p className="text-[10px] text-slate-500">{assets.length > 0 ? `${assets.length} activos` : 'Cargará al exportar'}</p>
                  </div>
                </button>

                {/* Audit Trail */}
                <div className="px-2 py-1 mt-2 border-t border-slate-800/50 pt-2">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">Trazabilidad</p>
                </div>
                <button
                  onClick={() => handleExport('audit_excel')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm text-slate-300"
                  disabled={isExporting}
                >
                  <FileSpreadsheet size={16} className="text-purple-400" />
                  <div>
                    <p className="font-medium text-white">Audit Trail Excel</p>
                    <p className="text-[10px] text-slate-500">{auditLogs.length} registros</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}