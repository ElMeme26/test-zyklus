// src/lib/exportUtils.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Request, Asset, AuditLog, MaintenanceLog } from '../types';

// ═══════════════════════════════════════════════════════════════
// 📊 EXPORTAR REQUESTS A CSV
// ═══════════════════════════════════════════════════════════════
export const exportRequestsToCSV = (requests: Request[]) => {
  const headers = ['ID', 'Activo', 'Solicitante', 'Departamento', 'Estado', 'Días', 'Fecha', 'Retorno'];
  const rows = requests.map(r => [
    r.id,
    r.assets?.name || r.asset_id,
    r.requester_name,
    r.requester_dept || '—',
    r.status,
    r.days_requested,
    format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es }),
    r.expected_return_date ? format(new Date(r.expected_return_date), 'dd/MM/yyyy', { locale: es }) : '—'
  ]);
  
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadFile(csv, `zyklus_solicitudes_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
};

// ═══════════════════════════════════════════════════════════════
// 📄 EXPORTAR REQUESTS A PDF
// ═══════════════════════════════════════════════════════════════
export const exportRequestsToPDF = (requests: Request[]) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(6, 182, 212); // Primary color
  doc.text('ZYKLUS HALO', 14, 15);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('Reporte de Solicitudes', 14, 22);
  
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy HH:mm", { locale: es })}`, 14, 28);
  
  // Table
  const tableData = requests.map(r => [
    String(r.id),
    r.assets?.name || r.asset_id,
    r.requester_name,
    r.requester_dept || '—',
    r.status,
    String(r.days_requested),
    format(new Date(r.created_at), 'dd/MM/yy', { locale: es }),
    r.expected_return_date ? format(new Date(r.expected_return_date), 'dd/MM/yy', { locale: es }) : '—'
  ]);
  
  autoTable(doc, {
    head: [['ID', 'Activo', 'Solicitante', 'Depto', 'Estado', 'Días', 'Fecha', 'Retorno']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [6, 182, 212], textColor: [2, 6, 23], fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 35, left: 10, right: 10 },
  });
  
  doc.save(`zyklus_solicitudes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ═══════════════════════════════════════════════════════════════
// 📊 EXPORTAR REQUESTS A EXCEL
// ═══════════════════════════════════════════════════════════════
export const exportRequestsToExcel = (requests: Request[]) => {
  const data = requests.map(r => ({
    'ID': r.id,
    'Activo': r.assets?.name || r.asset_id,
    'Tag': r.assets?.tag || '—',
    'Solicitante': r.requester_name,
    'Departamento': r.requester_dept || '—',
    'Estado': r.status,
    'Días Solicitados': r.days_requested,
    'Fecha Solicitud': format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es }),
    'Fecha Retorno': r.expected_return_date ? format(new Date(r.expected_return_date), 'dd/MM/yyyy', { locale: es }) : '—',
    'Motivo': r.motive || '—',
    'Institución': r.institutions?.name || '—'
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');
  
  // Ajustar ancho de columnas
  const wscols = [
    { wch: 6 },  // ID
    { wch: 25 }, // Activo
    { wch: 12 }, // Tag
    { wch: 20 }, // Solicitante
    { wch: 15 }, // Departamento
    { wch: 12 }, // Estado
    { wch: 8 },  // Días
    { wch: 12 }, // Fecha Solicitud
    { wch: 12 }, // Fecha Retorno
    { wch: 30 }, // Motivo
    { wch: 20 }  // Institución
  ];
  worksheet['!cols'] = wscols;
  
  XLSX.writeFile(workbook, `zyklus_solicitudes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// 📄 EXPORTAR INVENTARIO A PDF
// ═══════════════════════════════════════════════════════════════
export const exportInventoryToPDF = (assets: Asset[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(6, 182, 212);
  doc.text('INVENTARIO COMPLETO', 14, 15);
  
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Total de Activos: ${assets.length}`, 14, 22);
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy HH:mm", { locale: es })}`, 14, 27);
  
  const tableData = assets.map(a => [
    a.tag,
    a.name,
    a.category || '—',
    a.status,
    a.location || '—',
    a.brand || '—'
  ]);
  
  autoTable(doc, {
    head: [['Tag', 'Nombre', 'Categoría', 'Estado', 'Ubicación', 'Marca']],
    body: tableData,
    startY: 33,
    theme: 'grid',
    headStyles: { fillColor: [6, 182, 212], textColor: [2, 6, 23], fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 33, left: 10, right: 10 },
  });
  
  doc.save(`zyklus_inventario_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ═══════════════════════════════════════════════════════════════
// 📊 EXPORTAR AUDIT LOGS A EXCEL
// ═══════════════════════════════════════════════════════════════
export const exportAuditLogsToExcel = (logs: AuditLog[]) => {
  const data = logs.map(log => ({
    'Timestamp': format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
    'Acción': log.action,
    'Actor': log.actor_name || log.actor_id,
    'Target ID': log.target_id,
    'Tipo': log.target_type,
    'Detalles': log.details || '—',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');
  
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 40 }
  ];
  
  XLSX.writeFile(workbook, `zyklus_audit_trail_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER: Download File
// ═══════════════════════════════════════════════════════════════
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
