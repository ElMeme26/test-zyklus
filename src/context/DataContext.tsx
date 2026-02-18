import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User, Institution, Notification, AuditLog, MaintenanceLog, Bundle } from '../types';
import { toast } from 'sonner';
import { differenceInDays, differenceInHours, addDays, isBefore } from 'date-fns';

// ─── CONTEXT INTERFACE ───────────────────────────────────────
interface DataContextType {
  assets: Asset[];
  requests: Request[];
  institutions: Institution[];
  notifications: Notification[];
  maintenanceLogs: MaintenanceLog[];
  bundles: Bundle[];
  isLoading: boolean;
  unreadCount: number;

  // Inventario (Admin)
  addAsset: (asset: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importAssets: (csvText: string) => Promise<void>;
  getNextTag: () => string;
  validateMaintenanceAsset: (assetId: string) => Promise<void>;

  // Bundles / Combos
  createBundle: (name: string, description: string, assetIds: string[]) => Promise<void>;
  createBatchRequest: (assets: Asset[], user: User, days: number, motive: string) => Promise<void>;

  // Instituciones Externas
  addInstitution: (inst: Partial<Institution>) => Promise<void>;
  deleteInstitution: (id: number) => Promise<void>;

  // Admin QR Scan (informativo)
  processQRScan: (qrData: string) => Promise<{ asset?: Asset; request?: Request } | null>;

  // Aprobaciones (Líder)
  approveRequest: (reqId: number, approverId: string, approverName: string) => Promise<void>;
  rejectRequest: (reqId: number, reason: string) => Promise<void>;
  returnRequestWithFeedback: (reqId: number, feedback: string) => Promise<void>;
  getTeamRequests: (managerId: string) => Request[];

  // Solicitudes (Usuario)
  createRequest: (asset: Asset, user: User, days: number, motive?: string, institutionId?: number) => Promise<void>;
  cancelRequest: (reqId: number) => Promise<void>;
  renewRequest: (reqId: number, additionalDays: number) => Promise<void>;
  getUserRequests: (userId: string) => Request[];

  // QR de Salida
  generateQRCode: (requestId: number) => string;
  getQRPayload: (requestId: number) => object | null;

  // Guardia
  processGuardScan: (
    qrData: string,
    type: 'CHECKOUT' | 'CHECKIN',
    signature?: string,
    isDamaged?: boolean,
    damageNotes?: string
  ) => Promise<{ success: boolean; message: string; data?: Request }>;

  // Notificaciones
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;

  // Mantenimiento
  reportMaintenance: (assetId: string, userId: string, description: string) => Promise<void>;
  resolveMaintenance: (logId: number, cost?: number) => Promise<void>;

  // Auditoría
  auditLogs: AuditLog[];
  getAssetHistory: (assetId: string) => AuditLog[];

  // Data refresh
  fetchData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ─── HELPERS ─────────────────────────────────────────────────
const logAudit = async (
  action: AuditLog['action'],
  actorId: string,
  actorName: string,
  targetId: string,
  targetType: AuditLog['target_type'],
  details?: string,
  metadata?: Record<string, unknown>
) => {
  await supabase.from('audit_logs').insert({
    action,
    actor_id: actorId,
    actor_name: actorName,
    target_id: targetId,
    target_type: targetType,
    details,
    metadata,
  });
};

const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'INFO',
  requestId?: number,
  assetId?: string
) => {
  await supabase.from('notifications').insert({
    user_id: userId,
    request_id: requestId,
    asset_id: assetId,
    title,
    message,
    type,
    is_read: false,
  });
};

// ─── PROVIDER ────────────────────────────────────────────────
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ─── FETCH ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [assetsRes, reqRes, instRes, notifRes, maintRes, auditRes, bundlesRes] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('requests').select(`
          *,
          assets:asset_id (*),
          users:user_id (*),
          institutions:institution_id (*)
        `).order('created_at', { ascending: false }),
        supabase.from('institutions').select('*').order('id', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('maintenance_logs').select(`*, assets:asset_id(*), users:reported_by_user_id(*)`).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('bundles').select('*, assets(*)').order('created_at', { ascending: false }),
      ]);

      setAssets((assetsRes.data || []) as Asset[]);
      setRequests((reqRes.data || []) as Request[]);
      setInstitutions((instRes.data || []) as Institution[]);
      setNotifications((notifRes.data || []) as Notification[]);
      setMaintenanceLogs((maintRes.data || []) as MaintenanceLog[]);
      setAuditLogs((auditRes.data || []) as AuditLog[]);
      setBundles((bundlesRes.data || []) as Bundle[]);

      // Correr verificación de vencimientos automática
      await checkOverdueRequests(reqRes.data || []);

    } catch (error) {
      console.error('fetchData error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── MOTOR DE NOTIFICACIONES (Cron simulado) ───────────────
  const checkOverdueRequests = async (reqs: Request[]) => {
  const now = new Date();
  for (const req of reqs) {
    if (!req.expected_return_date || req.status !== 'ACTIVE') continue;
    const returnDate = new Date(req.expected_return_date);
    const daysLate = differenceInDays(now, returnDate);
    const hoursUntilReturn = differenceInHours(returnDate, now);

    // ✅ RECORDATORIOS PREVENTIVOS
    if (hoursUntilReturn <= 48 && hoursUntilReturn > 24 && req.user_id) {
      // 48 horas antes
      const notifExists = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', req.user_id)
        .eq('request_id', req.id)
        .eq('title', '📅 Recordatorio — 48h')
        .single();
      
      if (!notifExists.data) {
        await createNotification(
          req.user_id,
          '📅 Recordatorio — 48h',
          'Tu préstamo vence en 2 días. Prepara la devolución.',
          'WARNING',
          req.id
        );
      }
    }

    if (hoursUntilReturn <= 24 && hoursUntilReturn > 0 && req.user_id) {
      // 24 HORAS ANTES (NUEVO)
      const notifExists = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', req.user_id)
        .eq('request_id', req.id)
        .eq('title', '⏰ Recordatorio — 24h')
        .single();
      
      if (!notifExists.data) {
        await createNotification(
          req.user_id,
          '⏰ Recordatorio — 24h',
          'Tu préstamo vence mañana. Prepara la devolución.',
          'WARNING',
          req.id
        );
      }
    }

    // ⚠️ SISTEMA DE ESCALACIÓN (VENCIDOS)
    if (daysLate >= 1) {
      // Marcar como OVERDUE en BD
      await supabase.from('requests').update({ status: 'OVERDUE' }).eq('id', req.id).eq('status', 'ACTIVE');

      if (daysLate === 1 && req.user_id) {
        await createNotification(req.user_id, '⚠️ Préstamo Vencido', 'Tu préstamo ha vencido. Por favor devuelve el activo hoy.', 'ALERT', req.id);
      }
      if (daysLate >= 3 && req.user_id) {
        await createNotification(req.user_id, '🚨 Incumplimiento (3 días)', 'Incumplimiento de devolución detectado. Se requiere acción inmediata.', 'CRITICAL', req.id);
        // Notificar al líder si existe
        if (req.users?.manager_id) {
          await createNotification(req.users.manager_id, '🚨 Alerta de Equipo', `${req.requester_name} lleva 3 días de retraso.`, 'CRITICAL', req.id);
        }
      }
      if (daysLate >= 7 && req.user_id) {
        await createNotification(req.user_id, '🔴 ALERTA CRÍTICA — 1 Semana', 'Activo con 1 semana de retraso. Marcado como incidencia grave.', 'CRITICAL', req.id);
      }
    }
  }
};

  

  // ─── ASSETS ────────────────────────────────────────────────
  const getNextTag = () => {
    if (assets.length === 0) return 'ZF-001';
    const nums = assets.map(a => a.tag).filter(t => t?.startsWith('ZF-')).map(t => parseInt(t.split('-')[1])).filter(n => !isNaN(n)).sort((a, b) => b - a);
    return `ZF-${((nums[0] || 0) + 1).toString().padStart(3, '0')}`;
  };

  const addAsset = async (asset: Partial<Asset>) => {
    const payload = {
      ...asset,
      tag: asset.tag || getNextTag(),
      status: asset.status || 'Operativa',
      usage_count: 0,
      maintenance_usage_threshold: asset.maintenance_usage_threshold || 10,
      maintenance_period_days: asset.maintenance_period_days || 180,
      next_maintenance_date: asset.maintenance_period_days
        ? addDays(new Date(), asset.maintenance_period_days).toISOString()
        : addDays(new Date(), 180).toISOString(),
    };
    const { data, error } = await supabase.from('assets').insert([payload]).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success(`✅ Activo ${payload.tag} creado`);
    await logAudit('CREATE', 'system', 'Admin', data.id, 'ASSET', `Nuevo activo: ${payload.name}`);
    fetchData();
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const { error } = await supabase.from('assets').update(updates).eq('id', id);
    if (!error) { toast.success('Activo actualizado'); fetchData(); }
    else toast.error(error.message);
  };

  const deleteAsset = async (id: string) => {
    const { error } = await supabase.from('assets').update({ status: 'Dada de baja' }).eq('id', id);
    if (!error) { toast.success('Baja lógica procesada'); fetchData(); }
  };

  const importAssets = async (csvText: string) => {
    const lines = csvText.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      return { name: obj.name || obj.nombre || 'Sin nombre', tag: obj.tag || getNextTag(), category: obj.category || obj.categoria || 'General', serial: obj.serial || obj.serie, status: 'Operativa' as const };
    });
    const { error } = await supabase.from('assets').insert(rows);
    if (!error) { toast.success(`${rows.length} activos importados`); fetchData(); }
    else toast.error(error.message);
  };

  // ─── MANTENIMIENTO PREVENTIVO ──────────────────────────────
  const validateMaintenanceAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const newMaintenanceDate = addDays(new Date(), asset.maintenance_period_days || 180);
    await supabase.from('assets').update({
      status: 'Operativa',
      maintenance_alert: false,
      usage_count: 0,
      next_maintenance_date: newMaintenanceDate.toISOString(),
    }).eq('id', assetId);
    toast.success('✅ Mantenimiento validado. Activo liberado.');
    fetchData();
  };

  // ─── BUNDLES ───────────────────────────────────────────────
  const createBundle = async (name: string, description: string, assetIds: string[]) => {
    const { data: bundle, error } = await supabase.from('bundles').insert([{ name, description }]).select().single();
    if (error || !bundle) { toast.error('Error creando bundle'); return; }
    await supabase.from('assets').update({ bundle_id: bundle.id }).in('id', assetIds);
    toast.success(`Kit "${name}" creado con ${assetIds.length} activos`);
    fetchData();
  };

  const createBatchRequest = async (selectedAssets: Asset[], user: User, days: number, motive: string) => {
    const rows = selectedAssets.map(a => ({
      asset_id: a.id, user_id: user.id, requester_name: user.name,
      requester_dept: user.dept, days_requested: days,
      motive: `[COMBO] ${motive}`, status: 'PENDING',
      expected_return_date: addDays(new Date(), days).toISOString(),
    }));
    const { error } = await supabase.from('requests').insert(rows);
    if (!error) { toast.success(`Combo de ${rows.length} activos solicitado`); fetchData(); }
  };

  // ─── INSTITUCIONES ─────────────────────────────────────────
  const addInstitution = async (inst: Partial<Institution>) => {
    const { error } = await supabase.from('institutions').insert([inst]);
    if (!error) { toast.success('Institución registrada'); fetchData(); }
  };

  const deleteInstitution = async (id: number) => {
    const { error } = await supabase.from('institutions').delete().eq('id', id);
    if (!error) { toast.success('Institución eliminada'); fetchData(); }
  };

  // ─── QR LOGIC ──────────────────────────────────────────────
  const generateQRCode = (requestId: number): string => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return '';
    
    // Usamos la interfaz definida para asegurar consistencia
    const payload = {
      type: 'REQUEST', // <--- CLAVE PARA EL FLUJO
      request_id: requestId,
      asset_id: req.asset_id,
      asset_name: req.assets?.name || '',
      requester_name: req.requester_name,
      checkout_date: new Date().toISOString(),
      expected_return: req.expected_return_date || '',
      generated_at: new Date().toISOString(),
    };
    
    return JSON.stringify(payload);
  };

  const getQRPayload = (requestId: number): object | null => {
    const req = requests.find(r => r.id === requestId);
    if (!req || req.status !== 'APPROVED') return null;
    return {
      request_id: requestId,
      requester: req.requester_name,
      asset: req.assets?.name,
      tag: req.assets?.tag,
      days: req.days_requested,
      expected_return: req.expected_return_date,
      approver: req.users?.manager_id || 'Auto',
    };
  };

  // ─── ADMIN QR SCAN (Ficha Técnica) ─────────────────────────
  const processQRScan = async (qrData: string): Promise<{ asset?: Asset; request?: Request } | null> => {
    try {
      const json = JSON.parse(qrData);
      const assetId = json.asset_id || json.id;
      const asset = assets.find(a => a.id === assetId || a.tag === assetId);
      const relatedRequest = requests.find(r => r.id === json.request_id || r.asset_id === assetId);
      return { asset: asset || undefined, request: relatedRequest };
    } catch {
      toast.error('Formato QR inválido');
      return null;
    }
  };

  // ─── APROBACIONES ──────────────────────────────────────────
  const approveRequest = async (reqId: number, approverId: string, approverName: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const expectedReturn = addDays(new Date(), req.days_requested).toISOString();
    const { error } = await supabase.from('requests').update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      expected_return_date: expectedReturn,
    }).eq('id', reqId);
    if (!error) {
      toast.success('✅ Solicitud aprobada');
      await createNotification(req.user_id, '✅ Solicitud Aprobada', `Tu solicitud para "${req.assets?.name}" fue aprobada. Ya puedes generar tu QR.`, 'INFO', reqId);
      await logAudit('APPROVE', approverId, approverName, String(reqId), 'REQUEST', `Aprobado para ${req.requester_name}`);
      fetchData();
    }
  };

  const rejectRequest = async (reqId: number, reason: string) => {
    const req = requests.find(r => r.id === reqId);
    const { error } = await supabase.from('requests').update({
      status: 'REJECTED',
      rejection_reason: reason,
    }).eq('id', reqId);
    if (!error) {
      toast.error('Solicitud rechazada');
      if (req?.user_id) await createNotification(req.user_id, '❌ Solicitud Rechazada', `Tu solicitud fue rechazada. Razón: ${reason}`, 'ALERT', reqId);
      fetchData();
    }
  };

  const returnRequestWithFeedback = async (reqId: number, feedback: string) => {
    const req = requests.find(r => r.id === reqId);
    const { error } = await supabase.from('requests').update({
      status: 'ACTION_REQUIRED',
      feedback_log: feedback,
    }).eq('id', reqId);
    if (!error) {
      toast.warning('📋 Devuelta al usuario');
      if (req?.user_id) await createNotification(req.user_id, '📋 Acción Requerida', `Tu solicitud necesita más información: "${feedback}"`, 'WARNING', reqId);
      fetchData();
    }
  };

  const getTeamRequests = (managerId: string) =>
    requests.filter(r => r.users?.manager_id === managerId);

  // ─── SOLICITUDES USUARIO ───────────────────────────────────
  const createRequest = async (asset: Asset, user: User, days: number, motive = '', institutionId?: number) => {
    // Verificar si el activo requiere mantenimiento (bloqueo automático)
    if (asset.status === 'Requiere Mantenimiento' || asset.maintenance_alert) {
      toast.error('🔧 Este activo requiere mantenimiento. No disponible temporalmente.');
      return;
    }
    if (asset.status !== 'Operativa') {
      toast.error(`El activo no está disponible (${asset.status})`);
      return;
    }
    const { error } = await supabase.from('requests').insert({
      asset_id: asset.id,
      user_id: user.id,
      institution_id: institutionId || null,
      requester_name: user.name,
      requester_dept: user.dept,
      days_requested: days,
      motive,
      status: 'PENDING',
      expected_return_date: addDays(new Date(), days).toISOString(),
    });
    if (!error) { toast.success('📤 Solicitud enviada al Líder'); fetchData(); }
    else toast.error(error.message);
  };

  const cancelRequest = async (reqId: number) => {
    const { error } = await supabase.from('requests').update({ status: 'CANCELLED' }).eq('id', reqId);
    if (!error) { toast.success('Solicitud cancelada'); fetchData(); }
  };

  const renewRequest = async (reqId: number, additionalDays: number) => {
    const req = requests.find(r => r.id === reqId);
    if (!req?.expected_return_date) return;
    const newDate = addDays(new Date(req.expected_return_date), additionalDays).toISOString();
    const { error } = await supabase.from('requests').update({
      expected_return_date: newDate,
      days_requested: req.days_requested + additionalDays,
      status: 'ACTIVE',
    }).eq('id', reqId);
    if (!error) { toast.success(`Renovado por ${additionalDays} días más`); fetchData(); }
  };

  const getUserRequests = (userId: string) =>
    requests.filter(r => r.user_id === userId);

  // ─── GUARDIA ───────────────────────────────────────────────
  const processGuardScan = async (
    qrData: string,
    type: 'CHECKOUT' | 'CHECKIN',
    signature = '',
    isDamaged = false,
    damageNotes = ''
  ): Promise<{ success: boolean; message: string; data?: Request }> => {
    try {
      let parsedData: { request_id?: number; id?: number };
      try {
        parsedData = JSON.parse(qrData);
      } catch {
        return { success: false, message: '⚠️ QR inválido. Formato no reconocido.' };
      }

      const reqId = parsedData.request_id || parsedData.id;
      if (!reqId) return { success: false, message: '⚠️ QR inválido. No contiene ID de solicitud.' };

      const { data: req } = await supabase.from('requests').select(`*, assets:asset_id(*), users:user_id(*)`).eq('id', reqId).single();
      if (!req) return { success: false, message: '⚠️ Solicitud no encontrada en el sistema.' };

      if (type === 'CHECKOUT') {
        if (req.status !== 'APPROVED') {
          return { success: false, message: `⛔ Salida no autorizada. Estado actual: ${req.status}` };
        }
        
        // Verificar mantenimiento preventivo (bloqueo)
        const { data: assetData, error: assetFetchError } = await supabase
          .from('assets')
          .select('*')
          .eq('id', req.asset_id)
          .single();
          
        if (assetFetchError) {
          console.error('Error fetching asset:', assetFetchError);
          return { success: false, message: 'Error al verificar el activo' };
        }
          
        if (assetData?.status === 'Requiere Mantenimiento') {
          return { success: false, message: '🔧 Activo bloqueado por mantenimiento pendiente.' };
        }

        // **IMPORTANTE**: Actualizar PRIMERO el activo, LUEGO la solicitud
        // Esto asegura que si la solicitud falla, el activo no queda en estado inconsistente
        
        // 1. Actualizar el estado del activo a "Prestada"
        const { error: assetError } = await supabase
          .from('assets')
          .update({ 
            status: 'Prestada',
            usage_count: (assetData?.usage_count || 0) + 1
          })
          .eq('id', req.asset_id);

        if (assetError) {
          console.error('❌ ERROR ACTUALIZANDO ACTIVO:', assetError);
          console.error('Asset ID:', req.asset_id);
          console.error('Intended status:', 'Prestada');
          return { success: false, message: `Error al actualizar el activo: ${assetError.message}` };
        }

        console.log('✅ Activo actualizado correctamente a Prestada. Asset ID:', req.asset_id);

        // 2. Actualizar la solicitud a ACTIVE
        const { error: reqError } = await supabase
          .from('requests')
          .update({
            status: 'ACTIVE',
            checkout_at: new Date().toISOString(),
            digital_signature: signature,
            security_check_step: 1,
          })
          .eq('id', reqId);

        if (reqError) {
          console.error('❌ ERROR ACTUALIZANDO REQUEST:', reqError);
          // Intentar revertir el activo a Operativa si falla la solicitud
          await supabase.from('assets').update({ status: 'Operativa' }).eq('id', req.asset_id);
          return { success: false, message: `Error al procesar la solicitud: ${reqError.message}` };
        }

        console.log('✅ Request actualizado correctamente a ACTIVE. Request ID:', reqId);

        // 3. Registrar en audit log
        await logAudit(
          'CHECKOUT', 
          'guard', 
          'Guardia', 
          String(reqId), 
          'REQUEST',
          `Salida autorizada: ${req.requester_name} — ${req.assets?.name}`,
          { signature, asset_id: req.asset_id }
        );

        // 4. Refrescar datos del sistema
        console.log('🔄 Refrescando datos del sistema...');
        await fetchData();
        console.log('✅ Datos del sistema refrescados');

        // 5. Volver a consultar el request CON el activo actualizado
        const { data: updatedReq, error: refetchError } = await supabase
          .from('requests')
          .select(`*, assets:asset_id(*), users:user_id(*)`)
          .eq('id', reqId)
          .single();

        if (refetchError) {
          console.error('⚠️ Error al re-fetch del request:', refetchError);
        }

        console.log('📊 Request actualizado:', updatedReq);
        console.log('📊 Activo en request actualizado:', updatedReq?.assets);
        console.log('📊 Estado del activo:', updatedReq?.assets?.status);

        toast.success(`✅ Salida registrada: ${req.assets?.name}`);
        
        return { 
          success: true, 
          message: 'Salida exitosa', 
          data: updatedReq || req
        };
      } else {
        // CHECK-IN
        if (!['ACTIVE', 'OVERDUE'].includes(req.status)) {
          return { success: false, message: `⚠️ Este activo no está marcado como salido. Estado: ${req.status}` };
        }

        const newAssetStatus = isDamaged ? 'En mantenimiento' : 'Operativa';
        const newReqStatus = isDamaged ? 'MAINTENANCE' : 'RETURNED';

        await supabase.from('requests').update({
          status: newReqStatus,
          checkin_at: new Date().toISOString(),
          returned_at: new Date().toISOString(),
          is_damaged: isDamaged,
          damage_notes: damageNotes,
          security_check_step: 2,
          qr_expires_at: new Date().toISOString(), // QR caduca
        }).eq('id', reqId);

        await supabase.from('assets').update({ status: newAssetStatus }).eq('id', req.asset_id);

        if (isDamaged) {
          // Crear log de mantenimiento automático
          await supabase.from('maintenance_logs').insert({
            asset_id: req.asset_id,
            reported_by_user_id: req.user_id,
            issue_description: damageNotes || 'Daños reportados en devolución',
            status: 'OPEN',
          });
          toast.warning(`🔧 Activo enviado a mantenimiento: ${req.assets?.name}`);
        } else {
          toast.success(`✅ Retorno registrado: ${req.assets?.name}`);
        }

        await logAudit('CHECKIN', 'guard', 'Guardia', String(reqId), 'REQUEST',
          `Retorno: ${req.requester_name} — Daños: ${isDamaged}`,
          { isDamaged, damageNotes, asset_id: req.asset_id }
        );

        fetchData();
        return { success: true, message: isDamaged ? 'Activo enviado a mantenimiento' : 'Retorno exitoso', data: req };
      }
    } catch (err) {
      console.error('processGuardScan error:', err);
      return { success: false, message: 'Error procesando QR' };
    }
  };

  // ─── NOTIFICACIONES ────────────────────────────────────────
  const markNotificationRead = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllRead = async (userId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Todas leídas');
  };

  // ─── MANTENIMIENTO ─────────────────────────────────────────
  const reportMaintenance = async (assetId: string, userId: string, description: string) => {
    await supabase.from('maintenance_logs').insert({
      asset_id: assetId, reported_by_user_id: userId,
      issue_description: description, status: 'OPEN',
    });
    await supabase.from('assets').update({ status: 'En mantenimiento', maintenance_alert: true }).eq('id', assetId);
    toast.warning('🔧 Activo marcado para mantenimiento');
    fetchData();
  };

  const resolveMaintenance = async (logId: number, cost?: number) => {
    const log = maintenanceLogs.find(l => l.id === logId);
    await supabase.from('maintenance_logs').update({ status: 'RESOLVED', resolved_at: new Date().toISOString(), cost }).eq('id', logId);
    if (log?.asset_id) {
      await supabase.from('assets').update({ status: 'Operativa', maintenance_alert: false }).eq('id', log.asset_id);
    }
    toast.success('✅ Mantenimiento resuelto');
    fetchData();
  };

  // ─── AUDIT ─────────────────────────────────────────────────
  const getAssetHistory = (assetId: string) =>
    auditLogs.filter(l => l.target_id === assetId || (l.metadata as Record<string, unknown>)?.asset_id === assetId);

  return (
    <DataContext.Provider value={{
      assets, requests, institutions, notifications, maintenanceLogs, bundles, auditLogs,
      isLoading, unreadCount,
      addAsset, updateAsset, deleteAsset, importAssets, getNextTag, validateMaintenanceAsset,
      createBundle, createBatchRequest,
      addInstitution, deleteInstitution,
      processQRScan,
      approveRequest, rejectRequest, returnRequestWithFeedback, getTeamRequests,
      createRequest, cancelRequest, renewRequest, getUserRequests,
      generateQRCode, getQRPayload,
      processGuardScan,
      markNotificationRead, markAllRead,
      reportMaintenance, resolveMaintenance,
      getAssetHistory,
      fetchData,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};