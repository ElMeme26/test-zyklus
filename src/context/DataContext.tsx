import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User, Institution, Notification, AuditLog, MaintenanceLog, Bundle } from '../types';
import { toast } from 'sonner';
import { differenceInDays, differenceInHours, addDays, format } from 'date-fns';

// ─── COMBO CHECKIN STATE ─────────────────────────────────────
export interface ComboCheckinState {
  bundleGroupId: string;
  totalAssets: number;
  scannedAssetIds: string[];
  pendingAssets: Array<{ id: string; name: string; tag: string }>;
  allRequests: Array<{ id: number; asset_id: string; user_id: string; assets?: { name?: string; tag?: string } }>;
}

// ─── CONTEXT INTERFACE ────────────────────────────────────────
interface DataContextType {
  assets: Asset[];
  requests: Request[];
  institutions: Institution[];
  notifications: Notification[];
  maintenanceLogs: MaintenanceLog[];
  bundles: Bundle[];
  auditLogs: AuditLog[];
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
  createMultipleRequests: (assets: Asset[], user: User, days: number, motive?: string, institutionId?: number, autoApprove?: boolean) => Promise<void>;
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
  ) => Promise<{ success: boolean; message: string; data?: unknown; comboState?: ComboCheckinState }>;

  confirmComboCheckin: (
    state: ComboCheckinState,
    isDamaged: boolean,
    damageNotes: string
  ) => Promise<{ success: boolean; message: string }>;

  markNotificationRead: (notifId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;

  reportMaintenance: (assetId: string, userId: string, description: string) => Promise<void>;
  resolveMaintenance: (logId: number, cost?: number) => Promise<void>;

  getAssetHistory: (assetId: string) => AuditLog[];
  fetchData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ─── HELPERS ─────────────────────────────────────────────────
const isValidUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || '');

const toDateString = (d: Date) => format(d, 'yyyy-MM-dd');

const logAudit = async (
  action: AuditLog['action'], actorId: string, actorName: string,
  targetId: string, targetType: string, details?: string
) => {
  const { error } = await supabase.from('audit_logs').insert({
    action, actor_id: isValidUUID(actorId) ? actorId : null,
    actor_name: actorName, target_id: targetId, target_type: targetType, details,
  });
  if (error) console.error('logAudit:', error.message);
};

// ─── PUSH NATIVE ─────────────────────────────────────────────
export const requestPushPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

const firePush = (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => {
          // Cast the options to any or specifically to NotificationOptions extended with vibrate
          const options = { 
            body, 
            icon: '/logo192.png', 
            badge: '/badge72.png', 
            vibrate: [150, 100, 150], 
            tag: `zyklus-${Date.now()}` 
          } as any; 
          
          reg.showNotification(title, options);
        })
        .catch(() => { try { new Notification(title, { body, icon: '/logo192.png' }); } catch {} });
    } else {
      new Notification(title, { body, icon: '/logo192.png' });
    }
  } catch (e) { console.warn('firePush:', e); }
};

// ─── CREAR NOTIFICACIÓN EN BD ─────────────────────────────────
const createNotif = async (
  userId: string, title: string, message: string,
  type = 'INFO', requestId?: number, assetId?: string
) => {
  if (!userId || !isValidUUID(userId)) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: userId, request_id: requestId ?? null, asset_id: assetId ?? null,
    title, message, type, is_read: false,
  });
  if (error) console.error('createNotif:', error.message);
  firePush(title, message);
};

// Notificar a TODOS los usuarios de un rol
const notifyByRole = async (role: string, title: string, message: string, type = 'INFO', requestId?: number, assetId?: string) => {
  const { data } = await supabase.from('users').select('id').eq('role', role);
  if (!data) return;
  for (const u of data as { id: string }[]) {
    await createNotif(u.id, title, message, type, requestId, assetId);
  }
};

// ─── PROVIDER ─────────────────────────────────────────────────
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

  useEffect(() => { requestPushPermission(); }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [aR, rR, iR, nR, mR, auR, bR] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('requests').select(`*, assets:asset_id(*), users:user_id(*), institutions:institution_id(*)`).order('created_at', { ascending: false }),
        supabase.from('institutions').select('*').order('id', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('maintenance_logs').select(`*, assets:asset_id(*), users:reported_by_user_id(*)`).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase.from('bundles').select('*, assets(*)').order('created_at', { ascending: false }),
      ]);
      if (aR.error) console.error('assets:', aR.error.message);
      if (rR.error) console.error('requests:', rR.error.message);
      setAssets((aR.data || []) as Asset[]);
      setRequests((rR.data || []) as Request[]);
      setInstitutions((iR.data || []) as Institution[]);
      setNotifications((nR.data || []) as Notification[]);
      setMaintenanceLogs((mR.data || []) as MaintenanceLog[]);
      setAuditLogs((auR.data || []) as AuditLog[]);
      setBundles((bR.data || []) as Bundle[]);
      await checkOverdue((rR.data || []) as Request[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchData();
    const ch = supabase.channel('zyklus-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => { if (mounted) fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { if (mounted) fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { if (mounted) fetchData(); })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch).catch(() => {}); };
  }, [fetchData]);

  const checkOverdue = async (reqs: Request[]) => {
    const now = new Date();
    for (const req of reqs) {
      if (!req.expected_return_date || req.status !== 'ACTIVE') continue;
      const ret = new Date(req.expected_return_date);
      const daysLate = differenceInDays(now, ret);
      const hoursLeft = differenceInHours(ret, now);

      if (hoursLeft <= 48 && hoursLeft > 24 && req.user_id) {
        const { data: e } = await supabase.from('notifications').select('id').eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '📅 Recordatorio — 48h').maybeSingle();
        if (!e) await createNotif(req.user_id, '📅 Recordatorio — 48h', 'Tu préstamo vence en 2 días.', 'WARNING', req.id);
      }
      if (hoursLeft <= 24 && hoursLeft > 0 && req.user_id) {
        const { data: e } = await supabase.from('notifications').select('id').eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '⏰ Recordatorio — 24h').maybeSingle();
        if (!e) await createNotif(req.user_id, '⏰ Recordatorio — 24h', 'Tu préstamo vence mañana.', 'WARNING', req.id);
      }
      if (daysLate >= 1) {
        await supabase.from('requests').update({ status: 'OVERDUE' }).eq('id', req.id).eq('status', 'ACTIVE');
        if (daysLate === 1 && req.user_id) {
          await createNotif(req.user_id, '⚠️ Préstamo Vencido', `"${req.assets?.name}" venció. Devuélvelo hoy.`, 'ALERT', req.id);
          if (req.users?.manager_id) await createNotif(req.users.manager_id, '⚠️ Equipo — Vencido', `${req.requester_name}: "${req.assets?.name}" vencido.`, 'WARNING', req.id);
          await notifyByRole('ADMIN_PATRIMONIAL', '⚠️ Préstamo Vencido', `${req.requester_name}: "${req.assets?.name}".`, 'WARNING', req.id);
        }
        if (daysLate >= 3 && req.user_id) {
          const { data: e3 } = await supabase.from('notifications').select('id').eq('user_id', req.user_id).eq('request_id', req.id).eq('title', '🚨 Incumplimiento — 3 días').maybeSingle();
          if (!e3) {
            await createNotif(req.user_id, '🚨 Incumplimiento — 3 días', 'Acción inmediata requerida.', 'CRITICAL', req.id);
            if (req.users?.manager_id) await createNotif(req.users.manager_id, '🚨 Incumplimiento en Equipo', `${req.requester_name}: 3 días de retraso.`, 'CRITICAL', req.id);
            await notifyByRole('ADMIN_PATRIMONIAL', '🚨 Incumplimiento 3d', `${req.requester_name}: "${req.assets?.name}".`, 'CRITICAL', req.id);
          }
        }
      }
    }
  };

  // ─── ASSETS ──────────────────────────────────────────────────
  const getNextTag = () => {
    if (!assets.length) return 'ZF-001';
    const nums = assets.map(a => a.tag).filter(t => t?.startsWith('ZF-')).map(t => parseInt(t.split('-')[1])).filter(n => !isNaN(n)).sort((a, b) => b - a);
    return `ZF-${((nums[0] || 0) + 1).toString().padStart(3, '0')}`;
  };

  const addAsset = async (asset: Partial<Asset>) => {
    const payload = { ...asset, tag: asset.tag || getNextTag(), status: asset.status || 'Disponible', usage_count: 0, maintenance_period_days: asset.maintenance_period_days || 180, next_maintenance_date: toDateString(addDays(new Date(), asset.maintenance_period_days || 180)) };
    const { data, error } = await supabase.from('assets').insert([payload]).select().single();
    if (error) { toast.error(error.message); return; }
    await logAudit('CREATE', 'system', 'Admin', data.id, 'ASSET', `Nuevo: ${payload.name}`);
    await notifyByRole('ADMIN_PATRIMONIAL', '📦 Nuevo Activo Registrado', `${payload.name} (${payload.tag}).`, 'INFO');
    toast.success(`✅ ${payload.tag} creado`);
    fetchData();
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const s = { ...updates };
    if (s.next_maintenance_date?.includes('T')) s.next_maintenance_date = s.next_maintenance_date.split('T')[0];
    const { error } = await supabase.from('assets').update(s).eq('id', id);
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
      return { name: obj.name || obj.nombre || 'Sin nombre', tag: obj.tag || getNextTag(), category: obj.category || obj.categoria || 'General', serial: obj.serial || obj.serie, status: 'Disponible' as const, next_maintenance_date: toDateString(addDays(new Date(), 180)) };
    });
    const { error } = await supabase.from('assets').insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} activos importados`);
    fetchData();
  };

  const validateMaintenanceAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const { error } = await supabase.from('assets').update({ status: 'Disponible', maintenance_alert: false, usage_count: 0, next_maintenance_date: toDateString(addDays(new Date(), asset.maintenance_period_days || 180)) }).eq('id', assetId);
    if (error) { toast.error(error.message); return; }
    toast.success('✅ Mantenimiento validado.');
    fetchData();
  };

  // ─── BUNDLES ─────────────────────────────────────────────────
  const createBundle = async (name: string, description: string, assetIds: string[]) => {
    const { data: bundle, error } = await supabase.from('bundles').insert([{ name, description }]).select().single();
    if (error || !bundle) { toast.error('Error: ' + error?.message); return; }
    await supabase.from('assets').update({ bundle_id: bundle.id }).in('id', assetIds);
    toast.success(`Kit "${name}" creado`);
    fetchData();
  };

  const createBatchRequest = async (bundle: Bundle, user: User, days: number, motive: string, autoApprove = false) => {
    if (!bundle.assets?.length) { toast.error('Kit sin activos'); return; }
    const unavail = bundle.assets.filter(a => a.status !== 'Disponible');
    if (unavail.length) { toast.error(`No disponibles: ${unavail.map(a => `${a.name}(${a.status})`).join(', ')}`); return; }
    const returnDate = days === 0 ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString() : addDays(new Date(), days).toISOString();
    const bundleGroupId = `BNDL-${Date.now()}`;
    const rows = bundle.assets.map(a => ({ asset_id: a.id, user_id: user.id, requester_name: user.name, requester_disciplina: user.disciplina, days_requested: days, motive: `[COMBO: ${bundle.name}] ${motive}`, status: autoApprove ? 'APPROVED' : 'PENDING', approved_at: autoApprove ? new Date().toISOString() : null, expected_return_date: returnDate, bundle_group_id: bundleGroupId }));
    const { error } = await supabase.from('requests').insert(rows);
    if (error) { toast.error(error.message); return; }
    if (autoApprove) {
      await supabase.from('assets').update({ status: 'Prestada' }).in('id', bundle.assets.map(a => a.id));
      await logAudit('APPROVE', user.id, user.name, bundleGroupId, 'REQUEST', `Auto-combo: ${bundle.name}`);
    } else {
      await supabase.from('assets').update({ status: 'En trámite' }).in('id', bundle.assets.map(a => a.id));
      if (user.manager_id) await createNotif(user.manager_id, '📋 Nueva Solicitud — Kit', `${user.name} solicita kit "${bundle.name}".`, 'INFO');
      await notifyByRole('ADMIN_PATRIMONIAL', '📋 Nueva Solicitud — Kit', `${user.name} solicita kit "${bundle.name}".`, 'INFO');
    }
    toast.success(`Combo "${bundle.name}" solicitado`);
    fetchData();
  };

  // ─── INSTITUCIONES ────────────────────────────────────────────
  const addInstitution = async (inst: Partial<Institution>) => {
    const { error } = await supabase.from('institutions').insert([inst]);
    if (!error) { toast.success('Institución registrada'); fetchData(); } else toast.error(error.message);
  };
  const deleteInstitution = async (id: number) => {
    const { error } = await supabase.from('institutions').delete().eq('id', id);
    if (!error) { toast.success('Institución eliminada'); fetchData(); } else toast.error(error.message);
  };

  // ─── QR ──────────────────────────────────────────────────────
  const generateQRCode = (requestId: number): string => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return '';
    return JSON.stringify({ type: 'REQUEST', request_id: requestId, bundle_group_id: req.bundle_group_id, asset_id: req.asset_id, requester_name: req.requester_name });
  };
  const getQRPayload = (_: number) => null;
  const processQRScan = async (qrData: string) => {
    try {
      const json = JSON.parse(qrData);
      const assetId = json.asset_id || json.id;
      return { asset: assets.find(a => a.id === assetId || a.tag === assetId), request: requests.find(r => r.id === json.request_id || r.asset_id === assetId) };
    } catch { toast.error('QR inválido'); return null; }
  };

  // ─── APROBACIONES ─────────────────────────────────────────────
  const approveRequest = async (reqId: number, approverId: string, approverName: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const now = new Date().toISOString();
    if (req.bundle_group_id) {
      await supabase.from('requests').update({ status: 'APPROVED', approved_at: now }).eq('bundle_group_id', req.bundle_group_id);
      await logAudit('APPROVE', approverId, approverName, req.bundle_group_id, 'REQUEST', 'Combo aprobado');
      toast.success('✅ Combo aprobado');
    } else {
      await supabase.from('requests').update({ status: 'APPROVED', approved_at: now }).eq('id', reqId);
      await logAudit('APPROVE', approverId, approverName, String(reqId), 'REQUEST', `Aprobado: ${req.assets?.name}`);
      toast.success('✅ Aprobado');
    }
    if (req.user_id) await createNotif(req.user_id, '✅ Solicitud Aprobada', `"${req.assets?.name || 'equipo'}" aprobado por ${approverName}. Preséntate al guardia.`, 'INFO', reqId);
    fetchData();
  };

  const rejectRequest = async (reqId: number, reason: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    if (req.bundle_group_id) {
      const { error } = await supabase.from('requests').update({ status: 'REJECTED', rejection_feedback: reason }).eq('bundle_group_id', req.bundle_group_id);
      if (error) { toast.error(error.message); return; }
      const bundleReqs = requests.filter(r => r.bundle_group_id === req.bundle_group_id);
      for (const br of bundleReqs) {
        const a = assets.find(x => x.id === br.asset_id);
        if (a?.status === 'En trámite') await supabase.from('assets').update({ status: 'Disponible' }).eq('id', br.asset_id);
      }
      await logAudit('REJECT', 'system', 'Líder/Admin', req.bundle_group_id, 'REQUEST', reason);
    } else {
      const { error } = await supabase.from('requests').update({ status: 'REJECTED', rejection_feedback: reason }).eq('id', reqId);
      if (error) { toast.error(error.message); return; }
      const a = assets.find(x => x.id === req.asset_id);
      if (a?.status === 'En trámite') await supabase.from('assets').update({ status: 'Disponible' }).eq('id', req.asset_id);
      await logAudit('REJECT', 'system', 'Líder/Admin', String(reqId), 'REQUEST', reason);
    }
    toast.error('Solicitud rechazada');
    if (req.user_id) await createNotif(req.user_id, '❌ Solicitud Rechazada', `Motivo: ${reason}`, 'ALERT', reqId);
    fetchData();
  };

  const returnRequestWithFeedback = async (reqId: number, feedback: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const q = req.bundle_group_id
      ? supabase.from('requests').update({ status: 'ACTION_REQUIRED', feedback_log: feedback }).eq('bundle_group_id', req.bundle_group_id)
      : supabase.from('requests').update({ status: 'ACTION_REQUIRED', feedback_log: feedback }).eq('id', reqId);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.warning('📋 Devuelta para corrección');
    if (req.user_id) await createNotif(req.user_id, '📋 Acción Requerida', `Tu solicitud necesita más info: ${feedback}`, 'WARNING', reqId);
    fetchData();
  };

  const getTeamRequests = (managerId: string): Request[] => {
    const grouped = new Map<string | number, Request>();
    requests.filter(r => r.users?.manager_id === managerId).forEach(r => {
      if (r.bundle_group_id) {
        if (!grouped.has(r.bundle_group_id)) grouped.set(r.bundle_group_id, { ...r, is_bundle: true, bundle_items: 1 });
        else grouped.get(r.bundle_group_id)!.bundle_items = (grouped.get(r.bundle_group_id)!.bundle_items || 1) + 1;
      } else grouped.set(r.id, r);
    });
    return Array.from(grouped.values());
  };

  const createRequest = async (asset: Asset, user: User, days: number, motive = '', institutionId?: number, autoApprove = false) => {
    if (asset.status === 'Requiere Mantenimiento' || asset.maintenance_alert) { toast.error('🔧 Requiere mantenimiento.'); return; }
    if (asset.status !== 'Disponible') {
      const msgs: Record<string, string> = { 'Prestada': '⚠️ Ya prestado.', 'En trámite': '⚠️ Ya tiene solicitud en trámite.', 'En mantenimiento': '🔧 En mantenimiento.', 'Dada de baja': '🚫 Dado de baja.' };
      toast.error(msgs[asset.status] || `No disponible (${asset.status})`);
      return;
    }
    const returnDate = days === 0 ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString() : addDays(new Date(), days).toISOString();
    const { data, error } = await supabase.from('requests').insert({ asset_id: asset.id, user_id: user.id, institution_id: institutionId || null, requester_name: user.name, requester_disciplina: user.disciplina, days_requested: days, motive, status: autoApprove ? 'APPROVED' : 'PENDING', approved_at: autoApprove ? new Date().toISOString() : null, expected_return_date: returnDate }).select().single();
    if (error) { toast.error(error.message); return; }
    if (!autoApprove) {
      await supabase.from('assets').update({ status: 'En trámite' }).eq('id', asset.id);
      if (user.manager_id) {
        await createNotif(user.manager_id, '📋 Nueva Solicitud',
          `${user.name} solicita "${asset.name}"${institutionId ? ' — institución externa' : ''}. ${motive || ''}`, 'INFO', data?.id);
      }
      await notifyByRole('ADMIN_PATRIMONIAL', '📋 Nueva Solicitud',
        `${user.name} solicita "${asset.name}"${institutionId ? ' — institución externa' : ''}.`, 'INFO', data?.id, asset.id);
    } else if (data) {
      await logAudit('APPROVE', user.id, user.name, String(data.id), 'REQUEST', `Auto-aprobado: ${asset.name}`);
    }
    toast.success(autoApprove ? '✅ Auto-Aprobado — Preséntate al guardia' : '📤 Solicitud enviada');
    fetchData();
  };

  const createMultipleRequests = async (assetList: Asset[], user: User, days: number, motive = '', institutionId?: number, autoApprove = false) => {
    if (!assetList.length) { toast.error('No hay activos en el carrito'); return; }
    const unavail = assetList.filter(a => a.status !== 'Disponible' || a.maintenance_alert);
    if (unavail.length) {
      const msgs: Record<string, string> = { 'Prestada': 'Ya prestado', 'En trámite': 'Ya tiene solicitud', 'En mantenimiento': 'En mantenimiento', 'Dada de baja': 'Dado de baja' };
      toast.error(`No disponibles: ${unavail.map(a => `${a.name} (${msgs[a.status] || a.status})`).join(', ')}`);
      return;
    }
    const returnDate = days === 0 ? new Date(new Date().setHours(21, 0, 0, 0)).toISOString() : addDays(new Date(), days).toISOString();
    const cartGroupId = `CART-${Date.now()}`;
    const groupedMotive = motive.trim() ? `[CARRITO] ${motive}` : '[CARRITO] Solicitud desde carrito';
    const rows = assetList.map(a => ({
      asset_id: a.id, user_id: user.id, institution_id: institutionId || null,
      requester_name: user.name, requester_disciplina: user.disciplina,
      days_requested: days, motive: groupedMotive, status: autoApprove ? 'APPROVED' : 'PENDING',
      approved_at: autoApprove ? new Date().toISOString() : null, expected_return_date: returnDate,
      bundle_group_id: cartGroupId,
    }));
    const { data: createdRequests, error } = await supabase
      .from('requests')
      .insert(rows)
      .select('id, asset_id');
    if (error) { toast.error(error.message); return; }
    await supabase.from('assets').update({ status: autoApprove ? 'Prestada' : 'En trámite' }).in('id', assetList.map(a => a.id));
    if (!autoApprove) {
      const names = assetList.map(a => a.name).join(', ');
      if (user.manager_id) await createNotif(user.manager_id, '📋 Nueva Solicitud — Carrito', `${user.name} solicita ${assetList.length} activo(s) en una solicitud: ${names}${institutionId ? ' — institución externa' : ''}.`, 'INFO');
      await notifyByRole('ADMIN_PATRIMONIAL', '📋 Nueva Solicitud — Carrito', `${user.name} solicita ${assetList.length} activo(s) en una solicitud: ${names}.`, 'INFO', undefined, undefined);
    } else {
      await logAudit('APPROVE', user.id, user.name, cartGroupId, 'REQUEST', `Auto-aprobado carrito: ${assetList.length} activos`);
    }
    toast.success(autoApprove ? `✅ ${assetList.length} activos auto-aprobados` : '📤 Solicitud enviada');
    fetchData();
  };

  const cancelRequest = async (reqId: number) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const isGroup = !!req.bundle_group_id;
    const { error } = isGroup
      ? await supabase.from('requests').update({ status: 'CANCELLED' }).eq('bundle_group_id', req.bundle_group_id)
      : await supabase.from('requests').update({ status: 'CANCELLED' }).eq('id', reqId);
    if (error) { toast.error(error.message); return; }
    if (['PENDING', 'ACTION_REQUIRED'].includes(req.status)) {
      const idsToFree = isGroup ? requests.filter(r => r.bundle_group_id === req.bundle_group_id).map(r => r.asset_id) : (req.asset_id ? [req.asset_id] : []);
      const inTramite = idsToFree.filter(id => assets.find(x => x.id === id)?.status === 'En trámite');
      if (inTramite.length) await supabase.from('assets').update({ status: 'Disponible' }).in('id', inTramite);
    }
    toast.success(isGroup ? 'Solicitud (carrito/combo) cancelada' : 'Solicitud cancelada');
    fetchData();
  };

  const renewRequest = async (reqId: number, days: number) => {
    const req = requests.find(r => r.id === reqId);
    if (!req?.expected_return_date) return;
    const { error } = await supabase.from('requests').update({ expected_return_date: addDays(new Date(req.expected_return_date), days).toISOString(), days_requested: req.days_requested + days, status: 'ACTIVE' }).eq('id', reqId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Renovado ${days} días`);
    fetchData();
  };

  const getUserRequests = (userId: string): Request[] => {
    const grouped = new Map<string | number, Request>();
    requests.filter(r => r.user_id === userId).forEach(r => {
      if (r.bundle_group_id) {
        if (!grouped.has(r.bundle_group_id)) grouped.set(r.bundle_group_id, { ...r, is_bundle: true, bundle_items: 1 });
        else grouped.get(r.bundle_group_id)!.bundle_items = (grouped.get(r.bundle_group_id)!.bundle_items || 1) + 1;
      } else grouped.set(r.id, r);
    });
    return Array.from(grouped.values());
  };

  // ─── GUARD SCAN ───────────────────────────────────────────────
  const processGuardScan = async (
    qrData: string, type: 'CHECKOUT' | 'CHECKIN',
    signature = '', isDamaged = false, damageNotes = ''
  ): Promise<{ success: boolean; message: string; data?: unknown; comboState?: ComboCheckinState }> => {
    try {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(qrData); }
      catch { return { success: false, message: '⚠️ QR inválido.' }; }

      const reqId = parsed.request_id || parsed.id;
      const bundleId = parsed.bundle_group_id as string | undefined;

      if (type === 'CHECKOUT') {
        let reqsToProcess: Record<string, unknown>[] = [];
        if (bundleId) {
          const { data, error } = await supabase.from('requests').select(`*, assets:asset_id(*)`).eq('bundle_group_id', bundleId).eq('status', 'APPROVED');
          if (error) return { success: false, message: error.message };
          reqsToProcess = data || [];
          if (!reqsToProcess.length) return { success: false, message: '⚠️ Combo sin solicitudes aprobadas.' };
        } else {
          const { data, error } = await supabase.from('requests').select(`*, assets:asset_id(*)`).eq('id', reqId).eq('status', 'APPROVED').maybeSingle();
          if (error) return { success: false, message: error.message };
          if (data) reqsToProcess = [data]; else return { success: false, message: '⚠️ Solicitud no aprobada.' };
        }
        if (signature) {
          for (const raw of reqsToProcess) {
            const r = raw as { id: number; asset_id: string; assets?: { usage_count?: number; maintenance_usage_threshold?: number; name?: string } };
            const newUsage = (r.assets?.usage_count || 0) + 1;
            const threshold = r.assets?.maintenance_usage_threshold || 10;
            await supabase.from('requests').update({ status: 'ACTIVE', checkout_at: new Date().toISOString(), digital_signature: signature }).eq('id', r.id);
            await supabase.from('assets').update({ status: 'Prestada', usage_count: newUsage, ...(newUsage >= threshold ? { maintenance_alert: true } : {}) }).eq('id', r.asset_id);
            await logAudit('CHECKOUT', 'guard', 'Guardia', String(r.id), 'REQUEST', `Salida: ${r.assets?.name}`);
          }
          const first = reqsToProcess[0] as { requester_name?: string; user_id?: string; assets?: { name?: string } };
          await notifyByRole('ADMIN_PATRIMONIAL', '📤 Activo Retirado', `${first.requester_name} retiró "${bundleId ? 'combo' : (first.assets?.name || 'equipo')}".`, 'INFO');
          if (first.user_id) {
            const userReq = requests.find(r => r.user_id === first.user_id);
            if (userReq?.users?.manager_id) await createNotif(userReq.users.manager_id, '📤 Equipo Retirado', `${first.requester_name} retiró "${bundleId ? 'combo' : (first.assets?.name || 'equipo')}".`, 'INFO');
          }
          fetchData();
          return { success: true, message: '✅ Salida confirmada.' };
        }
        return { success: true, message: 'Verificado', data: reqsToProcess };
      }

      // ─── CHECKIN ──────────────────────────────────────────────
      const assetId = (parsed.id || parsed.asset_id) as string;
      if (!assetId) return { success: false, message: '⚠️ QR sin ID de activo.' };

      const { data: reqs, error } = await supabase.from('requests')
        .select(`*, assets:asset_id(id, name, tag)`)
        .eq('asset_id', assetId)
        .in('status', ['ACTIVE', 'OVERDUE'])
        .order('checkout_at', { ascending: false })
        .limit(1);
      if (error) return { success: false, message: error.message };

      const req = reqs?.[0] as {
        id: number; asset_id: string; user_id: string;
        bundle_group_id?: string;
        assets?: { name?: string; tag?: string };
      } | undefined;
      if (!req) return { success: false, message: '⚠️ No hay préstamo activo para este activo.' };

      // ── Si es parte de COMBO — iniciar flujo de escaneo múltiple ──
      if (req.bundle_group_id) {
        const { data: allComboReqs } = await supabase.from('requests')
          .select(`*, assets:asset_id(id, name, tag)`)
          .eq('bundle_group_id', req.bundle_group_id)
          .in('status', ['ACTIVE', 'OVERDUE']);

        const allReqs = (allComboReqs || []) as Array<{ id: number; asset_id: string; user_id: string; assets?: { name?: string; tag?: string } }>;

        // Si solo hay 1 activo en el combo (caso edge) — checkin directo
        if (allReqs.length === 1) {
          return { ...(await _doCheckin(allReqs, isDamaged, damageNotes)) };
        }

        const comboState: ComboCheckinState = {
          bundleGroupId: req.bundle_group_id,
          totalAssets: allReqs.length,
          scannedAssetIds: [assetId],
          pendingAssets: allReqs.filter(r => r.asset_id !== assetId).map(r => ({
            id: r.asset_id, name: r.assets?.name || 'Activo', tag: r.assets?.tag || '—',
          })),
          allRequests: allReqs,
        };

        return {
          success: true,
          message: `📦 Combo detectado (${allReqs.length} activos). Escanea los ${allReqs.length - 1} restantes.`,
          comboState,
        };
      }

      // ── Activo individual ──
      return { ...(await _doCheckin([req], isDamaged, damageNotes)) };
    } catch (err) {
      console.error('processGuardScan:', err);
      return { success: false, message: 'Error interno.' };
    }
  };

  // Agrega más activos al combo checkin y devuelve estado actualizado (o confirma si ya están todos)
  const confirmComboCheckin = async (
    state: ComboCheckinState, isDamaged: boolean, damageNotes: string
  ): Promise<{ success: boolean; message: string }> => {
    return await _doCheckin(state.allRequests, isDamaged, damageNotes);
  };

  const _doCheckin = async (
    reqs: Array<{ id: number; asset_id: string; user_id: string; assets?: { name?: string } }>,
    isDamaged: boolean, damageNotes: string
  ): Promise<{ success: boolean; message: string }> => {
    const newAssetStatus = isDamaged ? 'En mantenimiento' : 'Disponible';
    const newReqStatus = isDamaged ? 'MAINTENANCE' : 'RETURNED';

    for (const r of reqs) {
      await supabase.from('requests').update({ status: newReqStatus, checkin_at: new Date().toISOString(), is_damaged: isDamaged, damage_notes: damageNotes || null, return_condition: isDamaged ? 'DAÑADO' : 'BUENO' }).eq('id', r.id);
      await supabase.from('assets').update({ status: newAssetStatus }).eq('id', r.asset_id);
      await logAudit('CHECKIN', 'guard', 'Guardia', String(r.id), 'REQUEST', `Devolución: ${r.assets?.name}`);
    }

    if (isDamaged) {
      for (const r of reqs) {
        await supabase.from('maintenance_logs').insert({ asset_id: r.asset_id, reported_by_user_id: isValidUUID(r.user_id) ? r.user_id : null, issue_description: damageNotes || 'Daños en devolución', status: 'OPEN' });
        await supabase.from('assets').update({ maintenance_alert: true }).eq('id', r.asset_id);
      }
      await notifyByRole('ADMIN_PATRIMONIAL', '🔧 Daños en Devolución', `${reqs.length} equipo(s) devueltos con daños. ${damageNotes}`, 'ALERT');
      if (reqs[0]?.user_id && isValidUUID(reqs[0].user_id)) {
        const userReq = requests.find(r => r.user_id === reqs[0].user_id);
        if (userReq?.users?.manager_id) await createNotif(userReq.users.manager_id, '🔧 Equipo Devuelto con Daños', `Daños en ${reqs.length} equipo(s). ${damageNotes}`, 'ALERT');
      }
      toast.warning('⚠️ Daño registrado. Activos a mantenimiento.');
    } else {
      const names = reqs.map(r => r.assets?.name).filter(Boolean).join(', ');
      await notifyByRole('ADMIN_PATRIMONIAL', '📥 Devolución Registrada', `Devueltos: ${names}.`, 'INFO');
      toast.success('✅ Devolución registrada.');
    }

    fetchData();
    return { success: true, message: isDamaged ? 'Devuelto con daño' : 'Devuelto correctamente' };
  };

  // ─── NOTIFICACIONES ───────────────────────────────────────────
  const markNotificationRead = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllRead = async (userId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => n.user_id === userId ? { ...n, is_read: true } : n));
    toast.success('Todas leídas');
  };

  // ─── MANTENIMIENTO ────────────────────────────────────────────
  const reportMaintenance = async (assetId: string, userId: string, description: string) => {
    await supabase.from('maintenance_logs').insert({ asset_id: assetId, reported_by_user_id: isValidUUID(userId) ? userId : null, issue_description: description, status: 'OPEN' });
    await supabase.from('assets').update({ status: 'En mantenimiento', maintenance_alert: true }).eq('id', assetId);
    await logAudit('MAINTENANCE', userId, 'Sistema', assetId, 'ASSET', description);
    await notifyByRole('ADMIN_PATRIMONIAL', '🔧 Mantenimiento', description, 'WARNING', undefined, assetId);
    toast.warning('🔧 En mantenimiento');
    fetchData();
  };

  const resolveMaintenance = async (logId: number, cost?: number) => {
    const log = maintenanceLogs.find(l => l.id === logId);
    const { error } = await supabase.from('maintenance_logs').update({ status: 'RESOLVED', resolved_at: new Date().toISOString(), cost: cost ?? null }).eq('id', logId);
    if (error) { toast.error(error.message); return; }
    if (log?.asset_id) {
      await supabase.from('assets').update({ status: 'Disponible', maintenance_alert: false, usage_count: 0, next_maintenance_date: toDateString(addDays(new Date(), 180)) }).eq('id', log.asset_id);
      await logAudit('UPDATE', 'admin', 'Admin', log.asset_id, 'ASSET', 'Mantenimiento resuelto');
    }
    toast.success('✅ Resuelto');
    fetchData();
  };

  const getAssetHistory = (assetId: string) =>
    auditLogs.filter(l => l.target_id === assetId || (l.metadata as Record<string, unknown>)?.asset_id === assetId);

  return (
    <DataContext.Provider value={{
      assets, requests, institutions, notifications, maintenanceLogs, bundles, auditLogs, isLoading, unreadCount,
      addAsset, updateAsset, deleteAsset, importAssets, getNextTag, validateMaintenanceAsset,
      createBundle, createBatchRequest, addInstitution, deleteInstitution,
      processQRScan, approveRequest, rejectRequest, returnRequestWithFeedback, getTeamRequests,
      createRequest, createMultipleRequests, cancelRequest, renewRequest, getUserRequests,
      generateQRCode, getQRPayload, processGuardScan, confirmComboCheckin,
      markNotificationRead, markAllRead, reportMaintenance, resolveMaintenance,
      getAssetHistory, fetchData,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};