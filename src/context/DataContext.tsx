import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api/data';
import * as apiAssets from '../api/assets';
import * as apiBundles from '../api/bundles';
import * as apiInstitutions from '../api/institutions';
import * as apiRequests from '../api/requests';
import * as apiGuard from '../api/guard';
import * as apiNotifications from '../api/notifications';
import * as apiMaintenance from '../api/maintenance';
import { useAuth } from './AuthContext';
import type { Asset, Request, User, Institution, Notification, AuditLog, MaintenanceLog, Bundle } from '../types';
import { toast } from 'sonner';

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
  stats: { assetCounts: Record<string, number>; requestCounts: { overdue: number; active: number }; categoryCounts?: Record<string, number> } | null;
  isLoading: boolean;
  unreadCount: number;

  addAsset: (asset: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importAssets: (csvText: string) => Promise<void>;
  getNextTag: () => Promise<string>;
  validateMaintenanceAsset: (assetId: string) => Promise<void>;

  createBundle: (name: string, description: string, assetIds: string[]) => Promise<void>;
  createBatchRequest: (bundle: Bundle, user: User, days: number, motive: string, autoApprove?: boolean) => Promise<void>;

  addInstitution: (inst: Partial<Institution>) => Promise<void>;
  updateInstitution: (id: number, updates: Partial<Institution>) => Promise<void>;
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

export const requestPushPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

// ─── PROVIDER ─────────────────────────────────────────────────
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [stats, setStats] = useState<{ assetCounts: Record<string, number>; requestCounts: { overdue: number; active: number } } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => { requestPushPermission(); }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [data, statsData] = await Promise.all([api.getData(), api.getStats()]);
      setAssets(data.assets);
      setRequests(data.requests);
      setInstitutions(data.institutions);
      setNotifications(data.notifications);
      setMaintenanceLogs(data.maintenanceLogs);
      setAuditLogs(data.auditLogs);
      setBundles(data.bundles);
      setStats({ assetCounts: statsData.assetCounts, requestCounts: statsData.requestCounts, categoryCounts: statsData.categoryCounts });
      await apiNotifications.checkOverdue();
    } catch (err) {
      console.error('fetchData:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Solo cargar datos cuando hay usuario logueado (hay token). Así no hacemos 401 en login y al entrar sí se hace fetch.
  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchData]);

  // ─── ASSETS ──────────────────────────────────────────────────
  const getNextTag = useCallback(async () => {
    const res = await apiAssets.getNextTag();
    return res;
  }, []);

  const addAsset = async (asset: Partial<Asset>) => {
    try {
      const tag = asset.tag || (await getNextTag());
      const payload = { ...asset, tag, status: asset.status || 'Disponible' };
      await apiAssets.createAsset(payload);
      toast.success(`✅ ${payload.tag} creado`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear activo');
    }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    try {
      await apiAssets.updateAsset(id, updates);
      toast.success('Activo actualizado');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await apiAssets.deleteAsset(id);
      toast.success('Baja lógica procesada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const importAssets = async (csvText: string) => {
    const lines = csvText.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      return { name: obj.name || obj.nombre || 'Sin nombre', tag: obj.tag || null, category: obj.category || obj.categoria || 'General', serial: obj.serial || obj.serie };
    });
    try {
      const count = await apiAssets.importAssets(rows);
      toast.success(`${count} activos importados`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al importar');
    }
  };

  const validateMaintenanceAsset = async (assetId: string) => {
    let asset = assets.find(a => a.id === assetId);
    if (!asset) asset = await apiAssets.getAssetById(assetId);
    if (!asset) return;
    try {
      await apiAssets.validateMaintenance(assetId, asset.maintenance_period_days ?? 180);
      toast.success('✅ Mantenimiento validado.');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  // ─── BUNDLES ─────────────────────────────────────────────────
  const createBundle = async (name: string, description: string, assetIds: string[]) => {
    try {
      await apiBundles.createBundle(name, description, assetIds);
      toast.success(`Kit "${name}" creado`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear kit');
    }
  };

  const createBatchRequest = async (bundle: Bundle, user: User, days: number, motive: string, autoApprove = false) => {
    if (!bundle.assets?.length) { toast.error('Kit sin activos'); return; }
    const unavail = bundle.assets.filter(a => a.status !== 'Disponible');
    if (unavail.length) { toast.error(`No disponibles: ${unavail.map(a => `${a.name}(${a.status})`).join(', ')}`); return; }
    try {
      await apiRequests.createBundleRequest(
        bundle.id,
        bundle.assets.map(a => a.id),
        bundle.name,
        user,
        days,
        motive,
        autoApprove
      );
      toast.success(`Combo "${bundle.name}" solicitado`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  // ─── INSTITUCIONES ────────────────────────────────────────────
  const addInstitution = async (inst: Partial<Institution>) => {
    try {
      await apiInstitutions.addInstitution(inst);
      toast.success('Institución registrada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };
  const updateInstitution = async (id: number, updates: Partial<Institution>) => {
    try {
      await apiInstitutions.updateInstitution(id, updates);
      toast.success('Institución actualizada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };
  const deleteInstitution = async (id: number) => {
    try {
      await apiInstitutions.deleteInstitution(id);
      toast.success('Institución eliminada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
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
      let asset = assets.find(a => a.id === assetId || a.tag === assetId);
      if (!asset && assetId) asset = (await apiAssets.getAssetById(assetId)) ?? undefined;
      const request = requests.find(r => r.id === json.request_id || r.asset_id === assetId);
      return { asset: asset ?? undefined, request };
    } catch { toast.error('QR inválido'); return null; }
  };

  // ─── APROBACIONES ─────────────────────────────────────────────
  const approveRequest = async (reqId: number, approverId: string, approverName: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    try {
      await apiRequests.approveRequest(reqId, approverId, approverName, {
        bundleGroupId: req.bundle_group_id ?? undefined,
        userId: req.user_id,
        assetName: req.assets?.name,
      });
      toast.success(req.bundle_group_id ? '✅ Combo aprobado' : '✅ Aprobado');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const rejectRequest = async (reqId: number, reason: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    try {
      const assetIds = req.bundle_group_id
        ? requests.filter(r => r.bundle_group_id === req.bundle_group_id).map(r => r.asset_id)
        : undefined;
      await apiRequests.rejectRequest(reqId, reason, {
        bundleGroupId: req.bundle_group_id ?? undefined,
        assetIds,
        userId: req.user_id,
      });
      toast.error('Solicitud rechazada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const returnRequestWithFeedback = async (reqId: number, feedback: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    try {
      await apiRequests.returnRequestWithFeedback(reqId, feedback, {
        bundleGroupId: req.bundle_group_id ?? undefined,
        userId: req.user_id,
      });
      toast.warning('📋 Devuelta para corrección');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
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
    try {
      await apiRequests.createRequest(asset.id, user, days, motive, institutionId, autoApprove);
      toast.success(autoApprove ? '✅ Auto-Aprobado — Preséntate al guardia' : '📤 Solicitud enviada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const createMultipleRequests = async (assetList: Asset[], user: User, days: number, motive = '', institutionId?: number, autoApprove = false) => {
    if (!assetList.length) { toast.error('No hay activos en el carrito'); return; }
    const unavail = assetList.filter(a => a.status !== 'Disponible' || a.maintenance_alert);
    if (unavail.length) {
      const msgs: Record<string, string> = { 'Prestada': 'Ya prestado', 'En trámite': 'Ya tiene solicitud', 'En mantenimiento': 'En mantenimiento', 'Dada de baja': 'Dado de baja' };
      toast.error(`No disponibles: ${unavail.map(a => `${a.name} (${msgs[a.status] || a.status})`).join(', ')}`);
      return;
    }
    try {
      await apiRequests.createBatchRequest(assetList.map(a => a.id), user, days, motive, institutionId, autoApprove);
      toast.success(autoApprove ? `✅ ${assetList.length} activos auto-aprobados` : '📤 Solicitud enviada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const cancelRequest = async (reqId: number) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    try {
      const assetIdsToFree = ['PENDING', 'ACTION_REQUIRED'].includes(req.status)
        ? (req.bundle_group_id ? requests.filter(r => r.bundle_group_id === req.bundle_group_id).map(r => r.asset_id) : req.asset_id ? [req.asset_id] : []).filter(Boolean) as string[]
        : undefined;
      await apiRequests.cancelRequest(reqId, { bundleGroupId: req.bundle_group_id ?? undefined, assetIdsToFree });
      toast.success(req.bundle_group_id ? 'Solicitud (carrito/combo) cancelada' : 'Solicitud cancelada');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const renewRequest = async (reqId: number, days: number) => {
    const req = requests.find(r => r.id === reqId);
    if (!req?.expected_return_date) return;
    try {
      await apiRequests.renewRequest(reqId, days);
      toast.success(`Renovado ${days} días`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
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
      const result = await apiGuard.guardScan(qrData, type, { signature, isDamaged, damageNotes });
      if (!result.success) return result;
      if (result.message === '✅ Salida confirmada.' || result.message.startsWith('Devuelto')) {
        if (result.message.startsWith('Devuelto')) {
          if (result.message.includes('daño')) toast.warning('⚠️ Daño registrado. Activos a mantenimiento.');
          else toast.success('✅ Devolución registrada.');
        }
        fetchData();
      }
      return {
        success: result.success,
        message: result.message,
        data: result.data,
        comboState: result.comboState as ComboCheckinState | undefined,
      };
    } catch (err) {
      console.error('processGuardScan:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Error interno.' };
    }
  };

  const confirmComboCheckin = async (
    state: ComboCheckinState, isDamaged: boolean, damageNotes: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await apiGuard.confirmComboCheckin(state, isDamaged, damageNotes);
      if (result.success) {
        if (result.message.includes('daño')) toast.warning('⚠️ Daño registrado. Activos a mantenimiento.');
        else toast.success('✅ Devolución registrada.');
        fetchData();
      }
      return result;
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Error' };
    }
  };

  // ─── NOTIFICACIONES ───────────────────────────────────────────
  const markNotificationRead = async (notifId: string) => {
    try {
      await apiNotifications.markRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (_) {}
  };

  const markAllRead = async (userId: string) => {
    try {
      await apiNotifications.markAllRead(userId);
      setNotifications(prev => prev.map(n => n.user_id === userId ? { ...n, is_read: true } : n));
      toast.success('Todas leídas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  // ─── MANTENIMIENTO ────────────────────────────────────────────
  const reportMaintenance = async (assetId: string, userId: string, description: string) => {
    try {
      await apiMaintenance.reportMaintenance(assetId, userId, description);
      toast.warning('🔧 En mantenimiento');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const resolveMaintenance = async (logId: number, cost?: number) => {
    try {
      await apiMaintenance.resolveMaintenance(logId, cost);
      toast.success('✅ Resuelto');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const getAssetHistory = (assetId: string) =>
    auditLogs.filter(l => l.target_id === assetId || (l.metadata as Record<string, unknown>)?.asset_id === assetId);

  return (
    <DataContext.Provider value={{
      assets, requests, institutions, notifications, maintenanceLogs, bundles, auditLogs, stats, isLoading, unreadCount,
      addAsset, updateAsset, deleteAsset, importAssets, getNextTag, validateMaintenanceAsset,
      createBundle, createBatchRequest, addInstitution, updateInstitution, deleteInstitution,
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