import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User } from '../types';
import { toast } from 'sonner';

interface DataContextType {
  assets: Asset[];
  requests: Request[];
  isLoading: boolean;
  createRequest: (asset: Asset, user: User, days: number, motive?: string) => Promise<void>;
  processRequest: (reqId: number, status: 'APPROVED' | 'REJECTED', assetId: string) => Promise<void>;
  returnAsset: (reqId: number, assetId: string) => Promise<void>;
  addAsset: (asset: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  fetchData: () => Promise<void>;
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
      
      const { data: assetsData } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      setAssets(assetsData || []);

      const { data: reqData } = await supabase
        .from('requests')
        .select(`*, assets:asset_id (*), users:user_id (*)`)
        .order('created_at', { ascending: false });
      setRequests(reqData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createRequest = async (asset: Asset, user: User, days: number, motive: string = '') => {
    if (asset.status !== 'Operativa') {
      toast.error("Este activo no está disponible");
      return;
    }
    try {
      const { error } = await supabase.from('requests').insert({
        asset_id: asset.id,
        user_id: user.id,
        requester_name: user.name,
        requester_dept: user.dept,
        days_requested: days,
        motive: motive,
        status: 'PENDING'
      });
      if (error) throw error;
      toast.success("Solicitud enviada 🚀");
      fetchData(); 
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  const processRequest = async (reqId: number, status: 'APPROVED' | 'REJECTED', assetId: string) => {
    try {
      await supabase.from('requests').update({ status }).eq('id', reqId);
      if (status === 'APPROVED') {
        await supabase.from('assets').update({ status: 'Prestada' }).eq('id', assetId);
      }
      toast.success(status === 'APPROVED' ? "Aprobado" : "Rechazado");
      fetchData();
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  const returnAsset = async (reqId: number, assetId: string) => {
    try {
      await supabase.from('requests').update({ status: 'RETURNED', returned_at: new Date().toISOString() }).eq('id', reqId);
      await supabase.from('assets').update({ status: 'Operativa' }).eq('id', assetId);
      toast.success("Activo devuelto 🔄");
      fetchData();
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  const addAsset = async (asset: Partial<Asset>) => {
    try {
      const { id, ...newAsset } = asset; // Excluir ID para que DB lo genere
      const { error } = await supabase.from('assets').insert([newAsset]);
      if (error) throw error;
      toast.success("Activo creado ✨");
      fetchData();
    } catch (e: any) { toast.error("Error al crear: " + e.message); }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    try {
      const { error } = await supabase.from('assets').update(updates).eq('id', id);
      if (error) throw error;
      toast.success("Actualizado 💾");
      fetchData();
    } catch (e: any) { toast.error("Error al actualizar: " + e.message); }
  };

  const deleteAsset = async (id: string) => {
    try {
      const { error } = await supabase.from('assets').update({ status: 'Dada de baja' }).eq('id', id);
      if (error) throw error;
      toast.success("Dado de baja 🗑️");
      fetchData();
    } catch (e: any) { toast.error("Error al borrar: " + e.message); }
  };

  return (
    <DataContext.Provider value={{ assets, requests, isLoading, createRequest, processRequest, returnAsset, addAsset, updateAsset, deleteAsset, fetchData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData error");
  return context;
};