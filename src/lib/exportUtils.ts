// src/lib/exportUtils.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Request, Asset, AuditLog } from '../types';

// Helper para formatear fechas de forma segura
const safeDate = (d?: string) =>
  d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '—';

// ═══════════════════════════════════════════════════════════════
// 📊 EXPORTAR REQUESTS A CSV
// ═══════════════════════════════════════════════════════════════
export const exportRequestsToCSV = (requests: Request[]) => {
  const headers = ['ID', 'Activo', 'Tag', 'Solicitante', 'Disciplina', 'Estado', 'Días', 'Fecha Solicitud', 'Fecha Retorno'];
  const rows = requests.map(r => [
    r.id,
    r.assets?.name || r.asset_id,
    r.assets?.tag || '—',
    r.requester_name,
    // FIX: BD usa requester_disciplina, no requester_dept
    r.requester_disciplina || '—',
    r.status,
    r.days_requested,
    safeDate(r.created_at),
    safeDate(r.expected_return_date),
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadFile(csv, `zyklus_solicitudes_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8;');
};

// ═══════════════════════════════════════════════════════════════
// 📄 EXPORTAR REQUESTS A PDF
// ═══════════════════════════════════════════════════════════════
export const exportRequestsToPDF = (requests: Request[]) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(6, 182, 212);
  doc.text('ZYKLUS HALO', 14, 15);

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('Reporte de Solicitudes', 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy HH:mm", { locale: es })}`, 14, 28);
  doc.text(`Total: ${requests.length} registros`, 14, 33);

  const tableData = requests.map(r => [
    String(r.id),
    r.assets?.name || r.asset_id,
    r.requester_name,
    // FIX: requester_disciplina en lugar de requester_dept
    r.requester_disciplina || '—',
    r.status,
    String(r.days_requested),
    safeDate(r.created_at),
    safeDate(r.expected_return_date),
  ]);

  autoTable(doc, {
    head: [['ID', 'Activo', 'Solicitante', 'Disciplina', 'Estado', 'Días', 'Fecha', 'Retorno']],
    body: tableData,
    startY: 38,
    theme: 'grid',
    headStyles: { fillColor: [6, 182, 212], textColor: [2, 6, 23], fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 38, left: 10, right: 10 },
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
    // FIX: usar requester_disciplina (campo real en BD)
    'Disciplina': r.requester_disciplina || '—',
    'Estado': r.status,
    'Días Solicitados': r.days_requested,
    'Fecha Solicitud': safeDate(r.created_at),
    'Fecha Retorno': safeDate(r.expected_return_date),
    'Motivo': r.motive || '—',
    'Institución': r.institutions?.name || '—',
    'Es Combo': r.bundle_group_id ? 'Sí' : 'No',
    'Daños': r.is_damaged ? `Sí: ${r.damage_notes || ''}` : 'No',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');

  const wscols = [
    { wch: 6 },
    { wch: 25 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 20 },
    { wch: 8 },
    { wch: 20 },
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
    a.brand || '—',
    a.serial || '—',
    a.next_maintenance_date ? safeDate(a.next_maintenance_date) : '—',
  ]);

  autoTable(doc, {
    head: [['Tag', 'Nombre', 'Categoría', 'Estado', 'Ubicación', 'Marca', 'Serie', 'Prox. Mant.']],
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
    'Actor': log.actor_name || log.actor_id || 'Sistema',
    'Target ID': log.target_id,
    'Tipo de Target': log.target_type,
    'Detalles': log.details || '—',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
    { wch: 38 },
    { wch: 12 },
    { wch: 50 },
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}