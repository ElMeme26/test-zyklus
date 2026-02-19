import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User, Institution, Notification, AuditLog, MaintenanceLog, Bundle } from '../types';
import { toast } from 'sonner';
import { differenceInDays, differenceInHours, addDays } from 'date-fns';

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

  addAsset: (asset: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importAssets: (csvText: string) => Promise<void>;
  getNextTag: () => string;
  validateMaintenanceAsset: (assetId: string) => Promise<void>;

  createBundle: (name: string, description: string, assetIds: string[]) => Promise<void>;
  createBatchRequest: (bundle: Bundle, user: User, days: number, motive: string, autoApprove?: boolean) => Promise<void>;

  addInstitution: (inst: Partial<Institution>) => Promise<void>;
  deleteInstitution: (id: number) => Promise<void>;

  processQRScan: (qrData: string) => Promise<{ asset?: Asset; request?: Request } | null>;

  approveRequest: (reqId: number, approverId: string, approverName: string) => Promise<void>;
  rejectRequest: (reqId: number, reason: string) => Promise<void>;
  returnRequestWithFeedback: (reqId: number, feedback: string) => Promise<void>;
  getTeamRequests: (managerId: string) => Request[];

  createRequest: (asset: Asset, user: User, days: number, motive?: string, institutionId?: number, autoApprove?: boolean) => Promise<void>;
  cancelRequest: (reqId: number) => Promise<void>;
  renewRequest: (reqId: number, additionalDays: number) => Promise<void>;
  getUserRequests: (userId: string) => Request[];

  generateQRCode: (requestId: number) => string;
  getQRPayload: (requestId: number) => object | null;

  processGuardScan: (
    qrData: string,
    type: 'CHECKOUT' | 'CHECKIN',
    signature?: string,
    isDamaged?: boolean,
    damageNotes?: string
  ) => Promise<{ success: boolean; message: string; data?: any }>;

  markNotificationRead: (notifId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;

  reportMaintenance: (assetId: string, userId: string, description: string) => Promise<void>;
  resolveMaintenance: (logId: number, cost?: number) => Promise<void>;

  auditLogs: AuditLog[];
  getAssetHistory: (assetId: string) => AuditLog[];

  fetchData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ✨ CORRECCIÓN CRÍTICA: Validador de UUID para evitar Crash en Postgres
const isValidUUID = (uuid: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

// ─── HELPERS ─────────────────────────────────────────────────
const logAudit = async (
  action: AuditLog['action'],
  actorId: string,
  actorName: string,
  targetId: string,
  targetType: string,
  details?: string,
  metadata?: Record<string, unknown>
) => {
  const finalActorId = isValidUUID(actorId) ? actorId : null;

  await supabase.from('audit_logs').insert({
    action,
    actor_id: finalActorId,
    actor_name: actorName,
    target_id: targetId,
    target_type: targetType,
    details,
    metadata,
  });
};

const requestNativeNotificationPermission = async () => {
  if ('Notification' in window && navigator.serviceWorker) {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      await Notification.requestPermission();
    }
  }
};

const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'INFO',
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

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message, icon: '/logo.png' });
  }
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

  useEffect(() => { requestNativeNotificationPermission(); }, []);

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

      await checkOverdueRequests((reqRes.data || []) as Request[]);

    } catch (error) {
      console.error('fetchData error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    let isMounted = true;

    if (isMounted) fetchData(); 

    // Sincronización en Tiempo Real
    const channel = supabase.channel('realtime-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => { if(isMounted) fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { if(isMounted) fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { if(isMounted) fetchData(); })
      .subscribe();

    return () => { 
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    }
  }, [fetchData]);

  // ─── MOTOR DE NOTIFICACIONES (Cron simulado) ───────────────
  const checkOverdueRequests = async (reqs: Request[]) => {
    const now = new Date();
    for (const req of reqs) {
      if (!req.expected_return_date || req.status !== 'ACTIVE') continue;
      const returnDate = new Date(req.expected_return_date);
      const daysLate = differenceInDays(now, returnDate);
      const hoursUntilReturn = differenceInHours(returnDate, now);

      if (hoursUntilReturn <= 48 && hoursUntilReturn > 24 && req.user_id) {
        const { data: notifExists } = await supabase.from('notifications').select('id').eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '📅 Recordatorio — 48h').single();
        if (!notifExists) await createNotification(req.user_id, '📅 Recordatorio — 48h', 'Tu préstamo vence en 2 días. Prepara la devolución.', 'WARNING', req.id);
      }

      if (hoursUntilReturn <= 24 && hoursUntilReturn > 0 && req.user_id) {
        const { data: notifExists } = await supabase.from('notifications').select('id').eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '⏰ Recordatorio — 24h').single();
        if (!notifExists) await createNotification(req.user_id, '⏰ Recordatorio — 24h', 'Tu préstamo vence mañana. Prepara la devolución.', 'WARNING', req.id);
      }

      if (daysLate >= 1) {
        await supabase.from('requests').update({ status: 'OVERDUE' }).eq('id', req.id).eq('status', 'ACTIVE');
        if (daysLate === 1 && req.user_id) await createNotification(req.user_id, '⚠️ Préstamo Vencido', 'Tu préstamo ha vencido. Por favor devuelve el activo hoy.', 'ALERT', req.id);
        if (daysLate >= 3 && req.user_id) {
          await createNotification(req.user_id, '🚨 Incumplimiento (3 días)', 'Incumplimiento de devolución detectado. Se requiere acción inmediata.', 'CRITICAL', req.id);
          if (req.users?.manager_id) await createNotification(req.users.manager_id, '🚨 Alerta de Equipo', `${req.requester_name} lleva 3 días de retraso.`, 'CRITICAL', req.id);
        }
        if (daysLate >= 7 && req.user_id) await createNotification(req.user_id, '🔴 ALERTA CRÍTICA — 1 Semana', 'Activo con 1 semana de retraso. Marcado como incidencia grave.', 'CRITICAL', req.id);
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
      status: asset.status || 'Disponible',
      usage_count: 0,
      maintenance_period_days: 180,
      next_maintenance_date: addDays(new Date(), 180).toISOString(),
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
      return { name: obj.name || obj.nombre || 'Sin nombre', tag: obj.tag || getNextTag(), category: obj.category || obj.categoria || 'General', serial: obj.serial || obj.serie, status: 'Disponible' as const };
    });
    const { error } = await supabase.from('assets').insert(rows);
    if (!error) { toast.success(`${rows.length} activos importados`); fetchData(); }
  };

  const validateMaintenanceAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const newMaintenanceDate = addDays(new Date(), 180);
    await supabase.from('assets').update({
      status: 'Disponible',
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

  const createBatchRequest = async (bundle: Bundle, user: User, days: number, motive: string, autoApprove = false) => {
    if (!bundle.assets || bundle.assets.length === 0) return;
    let returnDate = days === 0 ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString() : addDays(new Date(), days).toISOString();
    const finalStatus = autoApprove ? 'APPROVED' : 'PENDING';
    const finalApproveDate = autoApprove ? new Date().toISOString() : null;
    const bundleGroupId = `BNDL-${Date.now()}`;

    const rows = bundle.assets.map(a => ({
      asset_id: a.id, user_id: user.id, requester_name: user.name, requester_disciplina: user.disciplina,
      days_requested: days, motive: `[COMBO: ${bundle.name}] ${motive}`, status: finalStatus,
      approved_at: finalApproveDate, expected_return_date: returnDate, bundle_group_id: bundleGroupId
    }));

    const { error } = await supabase.from('requests').insert(rows);
    if (!error) { 
      toast.success(`Combo "${bundle.name}" solicitado`);
      if (autoApprove) await logAudit('APPROVE', user.id, user.name, bundleGroupId, 'REQUEST', `Auto-Aprobación Combo: ${bundle.name}`);
      fetchData(); 
    }
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
    const payload = {
      type: 'REQUEST', 
      request_id: requestId,
      bundle_group_id: req.bundle_group_id,
      asset_id: req.asset_id,
      asset_name: req.assets?.name || '',
      requester_name: req.requester_name,
      checkout_date: new Date().toISOString(),
    };
    return JSON.stringify(payload);
  };

  const getQRPayload = (requestId: number): object | null => {
    return null;
  };

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

  // ─── APROBACIONES Y RECHAZOS ───────────────────────────────
  const approveRequest = async (reqId: number, approverId: string, approverName: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    if (req.bundle_group_id) {
      await supabase.from('requests').update({ status: 'APPROVED', approved_at: new Date().toISOString() }).eq('bundle_group_id', req.bundle_group_id);
      await logAudit('APPROVE', approverId, approverName, req.bundle_group_id, 'REQUEST', `Combo completo aprobado`);
      toast.success('✅ Combo completo aprobado');
    } else {
      await supabase.from('requests').update({ status: 'APPROVED', approved_at: new Date().toISOString() }).eq('id', reqId);
      await logAudit('APPROVE', approverId, approverName, String(reqId), 'REQUEST', `Solicitud aprobada: ${req.assets?.name}`);
      toast.success('✅ Solicitud aprobada');
    }
    await createNotification(req.user_id, '✅ Solicitud Aprobada', `Tu solicitud fue aprobada.`, 'INFO', reqId);
    fetchData();
  };

  const rejectRequest = async (reqId: number, reason: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    if (req.bundle_group_id) {
       const { error } = await supabase.from('requests').update({ status: 'REJECTED', rejection_feedback: reason }).eq('bundle_group_id', req.bundle_group_id);
       if (error) { toast.error(`Error BD: ${error.message}`); return; }
       await logAudit('REJECT', 'system', 'Líder/Admin', req.bundle_group_id, 'REQUEST', `Combo rechazado. Motivo: ${reason}`);
    } else {
       const { error } = await supabase.from('requests').update({ status: 'REJECTED', rejection_feedback: reason }).eq('id', reqId);
       if (error) { toast.error(`Error BD: ${error.message}`); return; }
       await logAudit('REJECT', 'system', 'Líder/Admin', String(reqId), 'REQUEST', `Solicitud rechazada. Motivo: ${reason}`);
    }
    
    toast.error('Solicitud rechazada');
    if (req.user_id) await createNotification(req.user_id, '❌ Solicitud Rechazada', `Motivo: ${reason}`, 'ALERT', reqId);
    fetchData();
  };

  const returnRequestWithFeedback = async (reqId: number, feedback: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    if (req.bundle_group_id) {
      const { error } = await supabase.from('requests').update({ status: 'ACTION_REQUIRED', feedback_log: feedback }).eq('bundle_group_id', req.bundle_group_id);
      if (error) { toast.error(`Error BD: ${error.message}`); return; }
    } else {
      const { error } = await supabase.from('requests').update({ status: 'ACTION_REQUIRED', feedback_log: feedback }).eq('id', reqId);
      if (error) { toast.error(`Error BD: ${error.message}`); return; }
    }
    
    toast.warning('📋 Devuelta al usuario para corrección');
    if (req.user_id) await createNotification(req.user_id, '📋 Acción Requerida', `Tu solicitud necesita más información.`, 'WARNING', reqId);
    fetchData();
  };

  const getTeamRequests = (managerId: string) => {
    const teamReqs = requests.filter(r => r.users?.manager_id === managerId);
    const grouped = new Map();
    teamReqs.forEach(r => {
      if(r.bundle_group_id) {
        if(!grouped.has(r.bundle_group_id)) grouped.set(r.bundle_group_id, {...r, is_bundle: true, bundle_items: 1});
        else grouped.get(r.bundle_group_id).bundle_items++;
      } else { grouped.set(r.id, r); }
    });
    return Array.from(grouped.values());
  };

  const createRequest = async (asset: Asset, user: User, days: number, motive = '', institutionId?: number, autoApprove = false) => {
    if (asset.status === 'Requiere Mantenimiento' || asset.maintenance_alert) { toast.error('🔧 Este activo requiere mantenimiento.'); return; }
    if (asset.status !== 'Disponible') { toast.error(`El activo no está disponible`); return; }
    let returnDate = days === 0 ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString() : addDays(new Date(), days).toISOString();
    const finalStatus = autoApprove ? 'APPROVED' : 'PENDING';
    
    const { data, error } = await supabase.from('requests').insert({
      asset_id: asset.id, user_id: user.id, institution_id: institutionId || null, requester_name: user.name, requester_disciplina: user.disciplina, days_requested: days, motive, status: finalStatus, approved_at: autoApprove ? new Date().toISOString() : null, expected_return_date: returnDate,
    }).select().single();

    if (!error) { 
      toast.success(autoApprove ? '✅ Auto-Aprobado' : '📤 Solicitud enviada'); 
      if (autoApprove && data) await logAudit('APPROVE', user.id, user.name, String(data.id), 'REQUEST', `Auto-Aprobación Directa: ${asset.name}`);
      fetchData(); 
    }
  };

  const cancelRequest = async (reqId: number) => { await supabase.from('requests').update({ status: 'CANCELLED' }).eq('id', reqId); fetchData(); };

  const renewRequest = async (reqId: number, additionalDays: number) => {
    const req = requests.find(r => r.id === reqId); if (!req?.expected_return_date) return;
    const newDate = addDays(new Date(req.expected_return_date), additionalDays).toISOString();
    await supabase.from('requests').update({ expected_return_date: newDate, days_requested: req.days_requested + additionalDays, status: 'ACTIVE' }).eq('id', reqId);
    toast.success(`Renovado por ${additionalDays} días`); fetchData();
  };

  const getUserRequests = (userId: string) => {
    const userReqs = requests.filter(r => r.user_id === userId);
    const grouped = new Map();
    userReqs.forEach(r => {
      if(r.bundle_group_id) {
        if(!grouped.has(r.bundle_group_id)) grouped.set(r.bundle_group_id, {...r, is_bundle: true, bundle_items: 1});
        else grouped.get(r.bundle_group_id).bundle_items++;
      } else { grouped.set(r.id, r); }
    });
    return Array.from(grouped.values());
  };

  const processGuardScan = async (qrData: string, type: 'CHECKOUT' | 'CHECKIN', signature = '', isDamaged = false, damageNotes = ''): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      let parsedData: any;
      try { parsedData = JSON.parse(qrData); } catch { return { success: false, message: '⚠️ QR inválido.' }; }

      const reqId = parsedData.request_id || parsedData.id;
      const bundleId = parsedData.bundle_group_id;

      if (type === 'CHECKOUT') {
        let reqsToProcess = [];
        if (bundleId) {
          const { data } = await supabase.from('requests').select(`*, assets:asset_id(*)`).eq('bundle_group_id', bundleId).eq('status', 'APPROVED');
          reqsToProcess = data || [];
          if (reqsToProcess.length === 0) return { success: false, message: '⚠️ Combo no aprobado.' };
        } else {
          const { data } = await supabase.from('requests').select(`*, assets:asset_id(*)`).eq('id', reqId).eq('status', 'APPROVED').single();
          if (data) reqsToProcess = [data]; else return { success: false, message: '⚠️ Solicitud no aprobada.' };
        }

        if (signature) {
           for (const req of reqsToProcess) {
             await supabase.from('requests').update({ status: 'ACTIVE', checkout_at: new Date().toISOString(), digital_signature: signature }).eq('id', req.id);
             await supabase.from('assets').update({ status: 'Prestada', usage_count: (req.assets?.usage_count || 0) + 1 }).eq('id', req.asset_id);
             await logAudit('CHECKOUT', 'guard', 'Guardia', String(req.id), 'REQUEST', `Salida confirmada: ${req.assets?.name || 'Activo'}`);
           }
           fetchData();
           return { success: true, message: 'Salida exitosa.' };
        }

        return { success: true, message: 'Verificado', data: reqsToProcess };

      } else {
        const assetId = parsedData.id || parsedData.asset_id; 
        const { data: reqs } = await supabase.from('requests').select(`*, assets:asset_id(*)`).eq('asset_id', assetId).in('status', ['ACTIVE', 'OVERDUE']).order('checkout_at', {ascending: false}).limit(1);
        const req = reqs?.[0];

        if (!req) return { success: false, message: `⚠️ Activo no está prestado.` };

        const newAssetStatus = isDamaged ? 'En mantenimiento' : 'Disponible';
        const newReqStatus = isDamaged ? 'MAINTENANCE' : 'RETURNED';

        await supabase.from('requests').update({ status: newReqStatus, checkin_at: new Date().toISOString(), is_damaged: isDamaged, damage_notes: damageNotes }).eq('id', req.id);
        await supabase.from('assets').update({ status: newAssetStatus }).eq('id', req.asset_id);

        await logAudit('CHECKIN', 'guard', 'Guardia', String(req.id), 'REQUEST', `Devolución registrada: ${req.assets?.name || 'Activo'}`);

        if (isDamaged) {
          await supabase.from('maintenance_logs').insert({ asset_id: req.asset_id, reported_by_user_id: req.user_id, issue_description: damageNotes || 'Daños en devolución', status: 'OPEN' });
          const { data: admins } = await supabase.from('users').select('id').eq('role', 'ADMIN_PATRIMONIAL').limit(1);
          if (admins && admins[0]) await createNotification(admins[0].id, '🔧 Daño Reportado', `Equipo reportado con daños en retorno.`, 'ALERT');
          await logAudit('MAINTENANCE', 'guard', 'Guardia', req.asset_id, 'ASSET', `Enviado a mantenimiento por daños en devolución`);
        }
        
        fetchData();
        return { success: true, message: isDamaged ? 'A mantenimiento' : 'Devuelto' };
      }
    } catch (err) { return { success: false, message: 'Error procesando QR' }; }
  };

  const markNotificationRead = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllRead = async (userId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Todas leídas');
  };

  const reportMaintenance = async (assetId: string, userId: string, description: string) => {
    await supabase.from('maintenance_logs').insert({
      asset_id: assetId, reported_by_user_id: userId,
      issue_description: description, status: 'OPEN',
    });
    await supabase.from('assets').update({ status: 'En mantenimiento', maintenance_alert: true }).eq('id', assetId);
    
    await logAudit('MAINTENANCE', userId, 'Sistema', assetId, 'ASSET', `Marcado para mantenimiento: ${description}`);
    
    toast.warning('🔧 Activo marcado para mantenimiento');
    fetchData();
  };

  const resolveMaintenance = async (logId: number, cost?: number) => {
    const log = maintenanceLogs.find(l => l.id === logId);
    await supabase.from('maintenance_logs').update({ status: 'RESOLVED', resolved_at: new Date().toISOString(), cost }).eq('id', logId);
    if (log?.asset_id) await supabase.from('assets').update({ status: 'Disponible', maintenance_alert: false }).eq('id', log.asset_id);
    
    await logAudit('UPDATE', 'admin', 'Admin', log?.asset_id || '', 'ASSET', `Mantenimiento resuelto exitosamente`);
    
    toast.success('✅ Mantenimiento resuelto');
    fetchData();
  };

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