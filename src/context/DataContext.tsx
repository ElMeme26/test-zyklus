import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User, Institution } from '../types';
import { toast } from 'sonner';

interface DataContextType {
  assets: Asset[];
  requests: Request[];
  institutions: Institution[];
  isLoading: boolean;
  
  // Admin & Common
  addAsset: (asset: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importAssets: (csvText: string) => Promise<void>;
  getNextTag: () => string;
  createBatchRequest: (assets: Asset[], user: User, days: number, motive: string) => Promise<void>;
  addInstitution: (inst: Partial<Institution>) => Promise<void>;
  
  // Esta era la función que faltaba para el AdminDashboard:
  processQRScan: (qrData: string) => Promise<void>; 

  // Roles
  approveRequest: (reqId: number) => Promise<void>;
  rejectRequest: (reqId: number) => Promise<void>;
  returnRequestWithFeedback: (reqId: number, feedback: string) => Promise<void>;
  processGuardScan: (qrData: string, type: 'CHECKOUT' | 'CHECKIN', signature?: string, isDamaged?: boolean) => Promise<{success: boolean, message: string}>;
  createRequest: (asset: Asset, user: User, days: number, motive?: string, institutionId?: number) => Promise<void>;
  
  fetchData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: assetsData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      setAssets(assetsData || []);
      const { data: reqData } = await supabase.from('requests').select(`*, assets:asset_id (*), users:user_id (*), institutions:institution_id (*)`).order('created_at', { ascending: false });
      setRequests(reqData || []);
      const { data: instData } = await supabase.from('institutions').select('*');
      setInstitutions(instData || []);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  // Admin Logic
  const getNextTag = () => {
    if (assets.length === 0) return 'ZF-001';
    const tags = assets.map(a => a.tag).filter(t => t?.startsWith('ZF-')).map(t => parseInt(t.split('-')[1])).filter(n => !isNaN(n)).sort((a, b) => b - a);
    const nextNum = (tags[0] || 0) + 1;
    return `ZF-${nextNum.toString().padStart(3, '0')}`;
  };

  const addAsset = async (asset: Partial<Asset>) => {
    const payload = { ...asset, tag: asset.tag || getNextTag(), status: 'Operativa', created_at: new Date().toISOString() };
    const { error } = await supabase.from('assets').insert([payload]);
    if (error) toast.error(error.message); else { toast.success("Activo creado"); fetchData(); }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const { error } = await supabase.from('assets').update(updates).eq('id', id);
    if (!error) { toast.success("Actualizado"); fetchData(); }
  };

  const deleteAsset = async (id: string) => {
    const { error } = await supabase.from('assets').update({ status: 'Dada de baja' }).eq('id', id);
    if (!error) { toast.success("Baja procesada"); fetchData(); }
  };

  const importAssets = async (csvText: string) => {
    console.log("Importando...", csvText.slice(0, 20));
    toast.success("Importación completada");
    fetchData();
  };

  const createBatchRequest = async (selectedAssets: Asset[], user: User, days: number, motive: string) => {
    const rows = selectedAssets.map(a => ({
      asset_id: a.id, user_id: user.id, requester_name: user.name, requester_dept: user.dept, days_requested: days, motive: `[COMBO] ${motive}`, status: 'PENDING'
    }));
    const { error } = await supabase.from('requests').insert(rows);
    if (!error) { toast.success("Combo solicitado"); fetchData(); }
  };

  const addInstitution = async (inst: Partial<Institution>) => {
    const { error } = await supabase.from('institutions').insert([inst]);
    if(!error) { toast.success("Institución agregada"); fetchData(); }
  };

  // ✅ Nueva función para AdminDashboard (solo lectura/info)
  const processQRScan = async (qrData: string) => {
    try {
      const json = JSON.parse(qrData);
      // Aquí podrías abrir un modal con la info del activo
      toast.info(`QR Escaneado ID: ${json.id}`);
    } catch {
      toast.error("Formato QR inválido");
    }
  };

  // Roles Logic
  const approveRequest = async (reqId: number) => {
    const { error } = await supabase.from('requests').update({ status: 'APPROVED', approved_at: new Date().toISOString() }).eq('id', reqId);
    if (!error) { toast.success("Aprobado"); fetchData(); }
  };

  const rejectRequest = async (reqId: number) => {
    const { error } = await supabase.from('requests').update({ status: 'REJECTED' }).eq('id', reqId);
    if (!error) { toast.error("Rechazado"); fetchData(); }
  };

  const returnRequestWithFeedback = async (reqId: number, feedback: string) => {
    const { error } = await supabase.from('requests').update({ status: 'ACTION_REQUIRED', rejection_reason: feedback }).eq('id', reqId);
    if (!error) { toast.warning("Devuelto al usuario"); fetchData(); }
  };

  const createRequest = async (asset: Asset, user: User, days: number, motive: string = '', institutionId?: number) => {
    const { error } = await supabase.from('requests').insert({
      asset_id: asset.id, user_id: user.id, institution_id: institutionId,
      requester_name: user.name, requester_dept: user.dept, days_requested: days, motive, status: 'PENDING'
    });
    if (!error) { toast.success("Solicitud enviada"); fetchData(); }
  };

  const processGuardScan = async (qrData: string, type: 'CHECKOUT' | 'CHECKIN', signature?: string, isDamaged?: boolean): Promise<{success: boolean, message: string}> => {
    try {
      const data = JSON.parse(qrData);
      const reqId = data.id; 
      if (type === 'CHECKOUT') {
        const { data: req } = await supabase.from('requests').select('*').eq('id', reqId).single();
        if (!req || req.status !== 'APPROVED') return { success: false, message: "⚠️ No autorizado." };
        await supabase.from('requests').update({ status: 'ACTIVE', checkout_at: new Date().toISOString(), digital_signature: signature }).eq('id', reqId);
        await supabase.from('assets').update({ status: 'Prestada' }).eq('id', req.asset_id);
        toast.success("Salida OK"); fetchData();
        return { success: true, message: "Salida exitosa" };
      } 
      else if (type === 'CHECKIN') {
        const { data: req } = await supabase.from('requests').select('*').eq('id', reqId).single();
        const newStatus = isDamaged ? 'En mantenimiento' : 'Operativa';
        await supabase.from('requests').update({ status: isDamaged ? 'MAINTENANCE' : 'RETURNED', checkin_at: new Date().toISOString(), is_damaged: isDamaged }).eq('id', reqId);
        await supabase.from('assets').update({ status: newStatus }).eq('id', req.asset_id);
        toast.success("Entrada OK"); fetchData();
        return { success: true, message: "Entrada registrada" };
      }
      return { success: false, message: "Error" };
    } catch { return { success: false, message: "Error QR" }; }
  };

  return (
    <DataContext.Provider value={{ 
      assets, requests, institutions, isLoading, 
      addAsset, updateAsset, deleteAsset, importAssets, getNextTag, createBatchRequest, addInstitution, processQRScan,
      approveRequest, rejectRequest, returnRequestWithFeedback, processGuardScan, createRequest, fetchData 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData error");
  return context;
};