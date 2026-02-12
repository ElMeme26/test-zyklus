import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User } from '../types';
import { toast } from 'sonner';

interface DataContextType {
  assets: Asset[];
  requests: Request[];
  isLoading: boolean;
  createRequest: (asset: Asset, user: User, days: number, motive?: string) => Promise<void>;
  createBatchRequest: (assets: Asset[], user: User, days: number, motive?: string) => Promise<void>;
  processRequest: (reqId: number, status: 'APPROVED' | 'REJECTED', assetId: string) => Promise<void>;
  returnAsset: (reqId: number, assetId: string) => Promise<void>;
  addAsset: (asset: Partial<Asset>) => Promise<void>;
  importAssets: (csvText: string) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  processQRScan: (qrString: string) => Promise<{ success: boolean; message: string }>;
  fetchData: () => Promise<void>;
  getNextTag: () => string;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: assetsData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      setAssets(assetsData || []);
      const { data: reqData } = await supabase.from('requests').select(`*, assets:asset_id (*), users:user_id (*)`).order('created_at', { ascending: false });
      setRequests(reqData || []);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const getNextTag = () => {
    if (assets.length === 0) return 'ZF-001';
    const tags = assets.map(a => a.tag).filter(t => t.startsWith('ZF-')).map(t => parseInt(t.split('-')[1])).filter(n => !isNaN(n)).sort((a, b) => b - a);
    const nextNum = (tags[0] || 0) + 1;
    return `ZF-${nextNum.toString().padStart(3, '0')}`;
  };

  const createRequest = async (asset: Asset, user: User, days: number, motive: string = '') => {
    try {
      const { error } = await supabase.from('requests').insert({
        asset_id: asset.id, user_id: user.id, requester_name: user.name, requester_dept: user.dept, days_requested: days, motive, status: 'PENDING'
      });
      if (error) throw error; toast.success("Solicitud enviada 🚀"); fetchData(); 
    } catch (e: any) { toast.error(e.message); }
  };

  const createBatchRequest = async (selectedAssets: Asset[], user: User, days: number, motive: string = '') => {
    try {
      const rows = selectedAssets.map(asset => ({
        asset_id: asset.id, user_id: user.id, requester_name: user.name, requester_dept: user.dept, days_requested: days, motive: `[COMBO] ${motive}`, status: 'PENDING'
      }));
      const { error } = await supabase.from('requests').insert(rows);
      if (error) throw error; toast.success(`Combo de ${selectedAssets.length} activos solicitado 📦`); fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const addAsset = async (asset: Partial<Asset>) => {
    try {
      const { id, ...rest } = asset;
      const payload = { ...rest, tag: rest.tag || getNextTag(), status: rest.status || 'Operativa', created_at: new Date().toISOString() };
      const { error } = await supabase.from('assets').insert([payload]);
      if (error) throw error; toast.success(`Activo ${payload.tag} creado ✨`); fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const importAssets = async (csvText: string) => {
    try {
      const lines = csvText.split('\n');
      const newAssets = [];
      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',');
        const rowObj: any = {
          tag: values[1] || `ZF-IMP-${Date.now() + i}`, name: values[2] || 'Sin Nombre', description: values[3] || '',
          category: values[4] || 'General', brand: values[5] || '', model: values[6] || '', serial: values[7] || 'SN-UNKNOWN',
          commercial_value: parseFloat(values[9]) || 0, status: 'Operativa', image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400'
        };
        newAssets.push(rowObj);
        importedCount++;
      }
      const { error } = await supabase.from('assets').insert(newAssets);
      if (error) throw error; toast.success(`${importedCount} Activos importados 📥`); fetchData();
    } catch (e: any) { toast.error("Error CSV: " + e.message); }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
      const { error } = await supabase.from('assets').update(updates).eq('id', id);
      if (error) throw error; toast.success("Actualizado"); fetchData();
  };
  
  const deleteAsset = async (id: string) => {
      const { error } = await supabase.from('assets').update({status:'Dada de baja'}).eq('id', id);
      if (error) throw error; toast.success("Baja procesada"); fetchData();
  };

  const processRequest = async (reqId: number, status: any, assetId: string) => {
      const {error} = await supabase.from('requests').update({status}).eq('id', reqId);
      if(!error && status==='APPROVED') await supabase.from('assets').update({status:'Prestada'}).eq('id',assetId);
      fetchData();
  };

  const returnAsset = async (reqId: number, assetId: string) => {
      await supabase.from('requests').update({status:'RETURNED'}).eq('id',reqId);
      await supabase.from('assets').update({status:'Operativa'}).eq('id',assetId);
      fetchData();
  };

  const processQRScan = async (qrString: string): Promise<{ success: boolean; message: string }> => {
    try {
      let loanId;
      try { const data = JSON.parse(qrString); loanId = data.id; } catch { return { success: false, message: "QR inválido" }; }
      const { data, error } = await supabase.rpc('process_qr_scan', { loan_uuid: loanId });
      if (error) throw error;
      if (data.success) { toast.success(data.message); fetchData(); return { success: true, message: data.message }; }
      else { toast.error(data.message); return { success: false, message: data.message }; }
    } catch (error: any) { return { success: false, message: "Error: " + error.message }; }
  };

  return (
    <DataContext.Provider value={{ assets, requests, isLoading, createRequest, createBatchRequest, processRequest, returnAsset, addAsset, importAssets, updateAsset, deleteAsset, processQRScan, fetchData, getNextTag }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData error");
  return context;
};
export default DataContext;