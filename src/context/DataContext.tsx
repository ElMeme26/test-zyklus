import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User, Institution, Notification, AuditLog, MaintenanceLog, Bundle } from '../types';
import { toast } from 'sonner';
import { differenceInDays, differenceInHours, addDays, format } from 'date-fns';

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

  // FIX: return type ahora es correcto — puede retornar null
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
  ) => Promise<{ success: boolean; message: string; data?: unknown }>;

  markNotificationRead: (notifId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;

  reportMaintenance: (assetId: string, userId: string, description: string) => Promise<void>;
  resolveMaintenance: (logId: number, cost?: number) => Promise<void>;

  auditLogs: AuditLog[];
  getAssetHistory: (assetId: string) => AuditLog[];

  fetchData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ─── HELPERS ─────────────────────────────────────────────────

// Valida que el string sea un UUID v4 válido para evitar crash en Postgres
const isValidUUID = (uuid: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

// FIX: next_maintenance_date es tipo DATE en BD, necesita formato 'yyyy-MM-dd'
const toDateString = (date: Date): string => format(date, 'yyyy-MM-dd');

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

  const { error } = await supabase.from('audit_logs').insert({
    action,
    actor_id: finalActorId,
    actor_name: actorName,
    target_id: targetId,
    target_type: targetType,
    details,
    metadata,
  });
  if (error) console.error('logAudit error:', error.message);
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
  if (!userId || !isValidUUID(userId)) return;

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    request_id: requestId ?? null,
    asset_id: assetId ?? null,
    title,
    message,
    type,
    is_read: false,
  });
  if (error) console.error('createNotification error:', error.message);

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
        supabase.from('maintenance_logs').select(`
          *,
          assets:asset_id(*),
          users:reported_by_user_id(*)
        `).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100),
        // FIX: bundles.select('*, assets(*)') — Supabase infiere relación inversa (assets.bundle_id → bundles.id)
        supabase.from('bundles').select('*, assets(*)').order('created_at', { ascending: false }),
      ]);

      if (assetsRes.error) console.error('assets error:', assetsRes.error.message);
      if (reqRes.error) console.error('requests error:', reqRes.error.message);

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

    const channel = supabase.channel('realtime-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => { if (isMounted) fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { if (isMounted) fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { if (isMounted) fetchData(); })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [fetchData]);

  // ─── MOTOR DE NOTIFICACIONES ───────────────────────────────
  const checkOverdueRequests = async (reqs: Request[]) => {
    const now = new Date();
    for (const req of reqs) {
      if (!req.expected_return_date || req.status !== 'ACTIVE') continue;
      const returnDate = new Date(req.expected_return_date);
      const daysLate = differenceInDays(now, returnDate);
      const hoursUntilReturn = differenceInHours(returnDate, now);

      if (hoursUntilReturn <= 48 && hoursUntilReturn > 24 && req.user_id) {
        const { data: notifExists } = await supabase
          .from('notifications').select('id')
          .eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '📅 Recordatorio — 48h')
          .maybeSingle();
        if (!notifExists) await createNotification(req.user_id, '📅 Recordatorio — 48h', 'Tu préstamo vence en 2 días. Prepara la devolución.', 'WARNING', req.id);
      }

      if (hoursUntilReturn <= 24 && hoursUntilReturn > 0 && req.user_id) {
        const { data: notifExists } = await supabase
          .from('notifications').select('id')
          .eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '⏰ Recordatorio — 24h')
          .maybeSingle();
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
    const nums = assets
      .map(a => a.tag)
      .filter(t => t?.startsWith('ZF-'))
      .map(t => parseInt(t.split('-')[1]))
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);
    return `ZF-${((nums[0] || 0) + 1).toString().padStart(3, '0')}`;
  };

  const addAsset = async (asset: Partial<Asset>) => {
    // FIX: next_maintenance_date es tipo DATE en BD → usar 'yyyy-MM-dd'
    const payload = {
      ...asset,
      tag: asset.tag || getNextTag(),
      status: asset.status || 'Disponible',
      usage_count: 0,
      maintenance_period_days: asset.maintenance_period_days || 180,
      next_maintenance_date: toDateString(addDays(new Date(), asset.maintenance_period_days || 180)),
    };
    const { data, error } = await supabase.from('assets').insert([payload]).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success(`✅ Activo ${payload.tag} creado`);
    await logAudit('CREATE', 'system', 'Admin', data.id, 'ASSET', `Nuevo activo: ${payload.name}`);
    fetchData();
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    // FIX: si se actualiza next_maintenance_date aseguramos formato DATE
    const sanitized = { ...updates };
    if (sanitized.next_maintenance_date && sanitized.next_maintenance_date.includes('T')) {
      sanitized.next_maintenance_date = sanitized.next_maintenance_date.split('T')[0];
    }
    const { error } = await supabase.from('assets').update(sanitized).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Activo actualizado');
    fetchData();
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
      return {
        name: obj.name || obj.nombre || 'Sin nombre',
        tag: obj.tag || getNextTag(),
        category: obj.category || obj.categoria || 'General',
        serial: obj.serial || obj.serie,
        status: 'Disponible' as const,
        next_maintenance_date: toDateString(addDays(new Date(), 180)),
      };
    });
    const { error } = await supabase.from('assets').insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} activos importados`);
    fetchData();
  };

  const validateMaintenanceAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    // FIX: next_maintenance_date es tipo DATE en BD
    const newMaintenanceDate = toDateString(addDays(new Date(), asset.maintenance_period_days || 180));
    const { error } = await supabase.from('assets').update({
      status: 'Disponible',
      maintenance_alert: false,
      usage_count: 0,
      next_maintenance_date: newMaintenanceDate,
    }).eq('id', assetId);
    if (error) { toast.error(error.message); return; }
    toast.success('✅ Mantenimiento validado. Activo liberado.');
    fetchData();
  };

  // ─── BUNDLES ───────────────────────────────────────────────
  const createBundle = async (name: string, description: string, assetIds: string[]) => {
    const { data: bundle, error } = await supabase.from('bundles').insert([{ name, description }]).select().single();
    if (error || !bundle) { toast.error('Error creando bundle: ' + (error?.message || '')); return; }
    const { error: updateError } = await supabase.from('assets').update({ bundle_id: bundle.id }).in('id', assetIds);
    if (updateError) { toast.error('Error asignando activos al kit: ' + updateError.message); return; }
    toast.success(`Kit "${name}" creado con ${assetIds.length} activos`);
    fetchData();
  };

  const createBatchRequest = async (bundle: Bundle, user: User, days: number, motive: string, autoApprove = false) => {
    if (!bundle.assets || bundle.assets.length === 0) { toast.error('El kit no tiene activos'); return; }
    const returnDate = days === 0
      ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString()
      : addDays(new Date(), days).toISOString();
    const finalStatus = autoApprove ? 'APPROVED' : 'PENDING';
    const finalApproveDate = autoApprove ? new Date().toISOString() : null;
    const bundleGroupId = `BNDL-${Date.now()}`;

    // Verificar que todos los activos del bundle estén disponibles
    const unavailable = bundle.assets.filter(a => a.status !== 'Disponible');
    if (unavailable.length > 0) {
      toast.error(`${unavailable.length} activo(s) del kit no están disponibles`);
      return;
    }

    const rows = bundle.assets.map(a => ({
      asset_id: a.id,
      user_id: user.id,
      requester_name: user.name,
      requester_disciplina: user.disciplina,
      days_requested: days,
      motive: `[COMBO: ${bundle.name}] ${motive}`,
      status: finalStatus,
      approved_at: finalApproveDate,
      expected_return_date: returnDate,
      bundle_group_id: bundleGroupId,
    }));

    const { error } = await supabase.from('requests').insert(rows);
    if (error) { toast.error('Error al crear solicitud: ' + error.message); return; }

    // FIX: si autoApprove, marcar los assets como 'Prestada'
    if (autoApprove) {
      await supabase.from('assets')
        .update({ status: 'Prestada' })
        .in('id', bundle.assets.map(a => a.id));
      await logAudit('APPROVE', user.id, user.name, bundleGroupId, 'REQUEST', `Auto-Aprobación Combo: ${bundle.name}`);
    }

    toast.success(`Combo "${bundle.name}" solicitado`);
    fetchData();
  };

  // ─── INSTITUCIONES ─────────────────────────────────────────
  const addInstitution = async (inst: Partial<Institution>) => {
    const { error } = await supabase.from('institutions').insert([inst]);
    if (!error) { toast.success('Institución registrada'); fetchData(); }
    else toast.error(error.message);
  };

  const deleteInstitution = async (id: number) => {
    const { error } = await supabase.from('institutions').delete().eq('id', id);
    if (!error) { toast.success('Institución eliminada'); fetchData(); }
    else toast.error(error.message);
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

  const getQRPayload = (_requestId: number): object | null => null;

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

    const approvedAt = new Date().toISOString();

    if (req.bundle_group_id) {
      // Obtener todos los request_ids del bundle para luego actualizar sus assets
      const bundleReqs = requests.filter(r => r.bundle_group_id === req.bundle_group_id);
      const assetIds = bundleReqs.map(r => r.asset_id).filter(Boolean);

      await supabase.from('requests')
        .update({ status: 'APPROVED', approved_at: approvedAt })
        .eq('bundle_group_id', req.bundle_group_id);

      // FIX: NO marcamos como 'Prestada' aún — el asset se presta en CHECKOUT por el guardia
      // Pero sí validamos que no estén ya prestados (protección)
      await logAudit('APPROVE', approverId, approverName, req.bundle_group_id, 'REQUEST', `Combo completo aprobado (${assetIds.length} activos)`);
      toast.success('✅ Combo completo aprobado');
    } else {
      await supabase.from('requests')
        .update({ status: 'APPROVED', approved_at: approvedAt })
        .eq('id', reqId);

      await logAudit('APPROVE', approverId, approverName, String(reqId), 'REQUEST', `Solicitud aprobada: ${req.assets?.name}`);
      toast.success('✅ Solicitud aprobada');
    }

    if (req.user_id) {
      await createNotification(req.user_id, '✅ Solicitud Aprobada', `Tu solicitud fue aprobada. Preséntate con el guardia para retirar el equipo.`, 'INFO', reqId);
    }
    fetchData();
  };

  const rejectRequest = async (reqId: number, reason: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    if (req.bundle_group_id) {
      const { error } = await supabase.from('requests')
        .update({ status: 'REJECTED', rejection_feedback: reason })
        .eq('bundle_group_id', req.bundle_group_id);
      if (error) { toast.error(`Error BD: ${error.message}`); return; }
      await logAudit('REJECT', 'system', 'Líder/Admin', req.bundle_group_id, 'REQUEST', `Combo rechazado. Motivo: ${reason}`);
    } else {
      const { error } = await supabase.from('requests')
        .update({ status: 'REJECTED', rejection_feedback: reason })
        .eq('id', reqId);
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
      const { error } = await supabase.from('requests')
        .update({ status: 'ACTION_REQUIRED', feedback_log: feedback })
        .eq('bundle_group_id', req.bundle_group_id);
      if (error) { toast.error(`Error BD: ${error.message}`); return; }
    } else {
      const { error } = await supabase.from('requests')
        .update({ status: 'ACTION_REQUIRED', feedback_log: feedback })
        .eq('id', reqId);
      if (error) { toast.error(`Error BD: ${error.message}`); return; }
    }

    toast.warning('📋 Devuelta al usuario para corrección');
    if (req.user_id) await createNotification(req.user_id, '📋 Acción Requerida', `Tu solicitud necesita más información: ${feedback}`, 'WARNING', reqId);
    fetchData();
  };

  const getTeamRequests = (managerId: string): Request[] => {
    const teamReqs = requests.filter(r => r.users?.manager_id === managerId);
    const grouped = new Map<string | number, Request>();
    teamReqs.forEach(r => {
      if (r.bundle_group_id) {
        if (!grouped.has(r.bundle_group_id)) {
          grouped.set(r.bundle_group_id, { ...r, is_bundle: true, bundle_items: 1 });
        } else {
          const existing = grouped.get(r.bundle_group_id)!;
          existing.bundle_items = (existing.bundle_items || 1) + 1;
        }
      } else {
        grouped.set(r.id, r);
      }
    });
    return Array.from(grouped.values());
  };

  const createRequest = async (asset: Asset, user: User, days: number, motive = '', institutionId?: number, autoApprove = false) => {
    if (asset.status === 'Requiere Mantenimiento' || asset.maintenance_alert) {
      toast.error('🔧 Este activo requiere mantenimiento.');
      return;
    }
    if (asset.status !== 'Disponible') {
      toast.error(`El activo no está disponible (estado: ${asset.status})`);
      return;
    }

    const returnDate = days === 0
      ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString()
      : addDays(new Date(), days).toISOString();
    const finalStatus = autoApprove ? 'APPROVED' : 'PENDING';

    const { data, error } = await supabase.from('requests').insert({
      asset_id: asset.id,
      user_id: user.id,
      institution_id: institutionId || null,
      requester_name: user.name,
      requester_disciplina: user.disciplina,
      days_requested: days,
      motive,
      status: finalStatus,
      approved_at: autoApprove ? new Date().toISOString() : null,
      expected_return_date: returnDate,
    }).select().single();

    if (error) { toast.error('Error al crear solicitud: ' + error.message); return; }

    // FIX: si autoApprove (líder auto-solicita), NO marcamos como prestada todavía.
    // El asset se marca 'Prestada' solo en el CHECKOUT del guardia.
    if (autoApprove && data) {
      await logAudit('APPROVE', user.id, user.name, String(data.id), 'REQUEST', `Auto-Aprobación Directa: ${asset.name}`);
    }

    toast.success(autoApprove ? '✅ Auto-Aprobado — Preséntate al guardia' : '📤 Solicitud enviada');
    fetchData();
  };

  const cancelRequest = async (reqId: number) => {
    const { error } = await supabase.from('requests').update({ status: 'CANCELLED' }).eq('id', reqId);
    if (error) toast.error(error.message);
    else fetchData();
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
    if (error) { toast.error(error.message); return; }
    toast.success(`Renovado por ${additionalDays} días`);
    fetchData();
  };

  const getUserRequests = (userId: string): Request[] => {
    const userReqs = requests.filter(r => r.user_id === userId);
    const grouped = new Map<string | number, Request>();
    userReqs.forEach(r => {
      if (r.bundle_group_id) {
        if (!grouped.has(r.bundle_group_id)) {
          grouped.set(r.bundle_group_id, { ...r, is_bundle: true, bundle_items: 1 });
        } else {
          const existing = grouped.get(r.bundle_group_id)!;
          existing.bundle_items = (existing.bundle_items || 1) + 1;
        }
      } else {
        grouped.set(r.id, r);
      }
    });
    return Array.from(grouped.values());
  };

  // ─── GUARD SCAN ────────────────────────────────────────────
  const processGuardScan = async (
    qrData: string,
    type: 'CHECKOUT' | 'CHECKIN',
    signature = '',
    isDamaged = false,
    damageNotes = ''
  ): Promise<{ success: boolean; message: string; data?: unknown }> => {
    try {
      let parsedData: Record<string, unknown>;
      try {
        parsedData = JSON.parse(qrData);
      } catch {
        return { success: false, message: '⚠️ QR inválido o malformado.' };
      }

      const reqId = parsedData.request_id || parsedData.id;
      const bundleId = parsedData.bundle_group_id as string | undefined;

      if (type === 'CHECKOUT') {
        let reqsToProcess: Record<string, unknown>[] = [];

        if (bundleId) {
          const { data, error } = await supabase
            .from('requests')
            .select(`*, assets:asset_id(*)`)
            .eq('bundle_group_id', bundleId)
            .eq('status', 'APPROVED');
          if (error) return { success: false, message: `Error BD: ${error.message}` };
          reqsToProcess = data || [];
          if (reqsToProcess.length === 0) return { success: false, message: '⚠️ Combo no tiene solicitudes aprobadas.' };
        } else {
          const { data, error } = await supabase
            .from('requests')
            .select(`*, assets:asset_id(*)`)
            .eq('id', reqId)
            .eq('status', 'APPROVED')
            .maybeSingle();
          if (error) return { success: false, message: `Error BD: ${error.message}` };
          if (data) reqsToProcess = [data];
          else return { success: false, message: '⚠️ Solicitud no encontrada o no aprobada.' };
        }

        // Si hay firma: confirmar checkout
        if (signature) {
          for (const req of reqsToProcess) {
            const r = req as { id: number; asset_id: string; assets?: { usage_count?: number; name?: string } };
            await supabase.from('requests').update({
              status: 'ACTIVE',
              checkout_at: new Date().toISOString(),
              digital_signature: signature,
            }).eq('id', r.id);

            // FIX: Marcar asset como 'Prestada' y sumar usage_count
            await supabase.from('assets').update({
              status: 'Prestada',
              usage_count: (r.assets?.usage_count || 0) + 1,
            }).eq('id', r.asset_id);

            await logAudit('CHECKOUT', 'guard', 'Guardia', String(r.id), 'REQUEST', `Salida confirmada: ${r.assets?.name || 'Activo'}`);
          }

          // FIX: Verificar si algún asset supera el umbral de mantenimiento
          for (const req of reqsToProcess) {
            const r = req as { asset_id: string; assets?: { usage_count?: number; maintenance_usage_threshold?: number; name?: string } };
            const newUsage = (r.assets?.usage_count || 0) + 1;
            const threshold = r.assets?.maintenance_usage_threshold || 10;
            if (newUsage >= threshold) {
              await supabase.from('assets').update({ maintenance_alert: true }).eq('id', r.asset_id);
            }
          }

          fetchData();
          return { success: true, message: 'Salida registrada exitosamente.' };
        }

        // Sin firma: retornar lista para verificación física
        return { success: true, message: 'Verificado', data: reqsToProcess };

      } else {
        // CHECKIN
        const assetId = (parsedData.id || parsedData.asset_id) as string;
        if (!assetId) return { success: false, message: '⚠️ QR no contiene ID de activo.' };

        const { data: reqs, error } = await supabase
          .from('requests')
          .select(`*, assets:asset_id(*)`)
          .eq('asset_id', assetId)
          .in('status', ['ACTIVE', 'OVERDUE'])
          .order('checkout_at', { ascending: false })
          .limit(1);

        if (error) return { success: false, message: `Error BD: ${error.message}` };
        const req = reqs?.[0] as { id: number; asset_id: string; user_id: string; assets?: { name?: string } } | undefined;

        if (!req) return { success: false, message: `⚠️ No se encontró préstamo activo para este activo.` };

        const newAssetStatus = isDamaged ? 'En mantenimiento' : 'Disponible';
        const newReqStatus = isDamaged ? 'MAINTENANCE' : 'RETURNED';

        await supabase.from('requests').update({
          status: newReqStatus,
          checkin_at: new Date().toISOString(),
          is_damaged: isDamaged,
          damage_notes: damageNotes || null,
          return_condition: isDamaged ? 'DAÑADO' : 'BUENO',
        }).eq('id', req.id);

        await supabase.from('assets').update({ status: newAssetStatus }).eq('id', req.asset_id);
        await logAudit('CHECKIN', 'guard', 'Guardia', String(req.id), 'REQUEST', `Devolución: ${req.assets?.name || 'Activo'}. Estado: ${newAssetStatus}`);

        if (isDamaged) {
          await supabase.from('maintenance_logs').insert({
            asset_id: req.asset_id,
            reported_by_user_id: req.user_id || null,
            issue_description: damageNotes || 'Daños reportados en devolución',
            status: 'OPEN',
          });
          await supabase.from('assets').update({ maintenance_alert: true }).eq('id', req.asset_id);

          // Notificar al admin
          const { data: admins } = await supabase.from('users').select('id').eq('role', 'ADMIN_PATRIMONIAL').limit(1);
          if (admins && admins[0]) {
            await createNotification(
              (admins[0] as { id: string }).id,
              '🔧 Daño Reportado en Retorno',
              `Equipo "${req.assets?.name || 'desconocido'}" fue devuelto con daños. ${damageNotes}`,
              'ALERT'
            );
          }
          await logAudit('MAINTENANCE', 'guard', 'Guardia', req.asset_id, 'ASSET', `Enviado a mantenimiento: ${damageNotes}`);
          toast.warning('⚠️ Daño registrado. Activo enviado a mantenimiento.');
        } else {
          toast.success('✅ Devolución registrada correctamente.');
        }

        fetchData();
        return { success: true, message: isDamaged ? 'Devolución con daño registrada' : 'Devolución limpia registrada' };
      }
    } catch (err) {
      console.error('processGuardScan error:', err);
      return { success: false, message: 'Error interno procesando QR' };
    }
  };

  // ─── NOTIFICACIONES ────────────────────────────────────────
  const markNotificationRead = async (notifId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    if (!error) setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllRead = async (userId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(n => n.user_id === userId ? { ...n, is_read: true } : n));
      toast.success('Todas las notificaciones marcadas como leídas');
    }
  };

  // ─── MANTENIMIENTO ─────────────────────────────────────────
  const reportMaintenance = async (assetId: string, userId: string, description: string) => {
    const [maintError] = await Promise.all([
      supabase.from('maintenance_logs').insert({
        asset_id: assetId,
        reported_by_user_id: isValidUUID(userId) ? userId : null,
        issue_description: description,
        status: 'OPEN',
      }),
    ]);

    await supabase.from('assets').update({ status: 'En mantenimiento', maintenance_alert: true }).eq('id', assetId);
    await logAudit('MAINTENANCE', userId, 'Sistema', assetId, 'ASSET', `Marcado para mantenimiento: ${description}`);

    toast.warning('🔧 Activo marcado para mantenimiento');
    fetchData();
  };

  const resolveMaintenance = async (logId: number, cost?: number) => {
    const log = maintenanceLogs.find(l => l.id === logId);

    const { error } = await supabase.from('maintenance_logs').update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      cost: cost ?? null,
    }).eq('id', logId);

    if (error) { toast.error(error.message); return; }

    if (log?.asset_id) {
      await supabase.from('assets').update({
        status: 'Disponible',
        maintenance_alert: false,
        usage_count: 0,
        next_maintenance_date: toDateString(addDays(new Date(), 180)),
      }).eq('id', log.asset_id);

      await logAudit('UPDATE', 'admin', 'Admin', log.asset_id, 'ASSET', `Mantenimiento resuelto (Log #${logId})`);
    }

    toast.success('✅ Mantenimiento resuelto');
    fetchData();
  };

  const getAssetHistory = (assetId: string): AuditLog[] =>
    auditLogs.filter(l =>
      l.target_id === assetId ||
      (l.metadata && (l.metadata as Record<string, unknown>)?.asset_id === assetId)
    );

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