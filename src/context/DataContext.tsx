import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, Request, User } from '../types';
import { toast } from 'sonner';

interface DataContextType {
  assets: Asset[];
  requests: Request[];
  isLoading: boolean;
  createRequest: (asset: Asset, user: User, days: number, motive?: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Traer Activos
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('name');
      
      if (assetsError) throw assetsError;
      setAssets(assetsData as Asset[]);

      // 2. Traer Solicitudes (Con el nombre del activo)
      const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .select('*, assets(name, tag, image)')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setRequests(reqData as any);

    } catch (error: any) {
      console.error('Error:', error.message);
      toast.error("Error sincronizando datos");
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
      const { error } = await supabase.from('requests').insert([
        {
          asset_id: asset.id,
          user_email: user.email,
          user_name: user.name,
          user_dept: user.dept,
          days: days,
          motive: motive,
          status: 'PENDING'
        }
      ]);

      if (error) throw error;

      toast.success("Solicitud enviada exitosamente 🚀");
      fetchData(); // Recargar para ver el cambio

    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    }
  };

  return (
    <DataContext.Provider value={{ assets, requests, isLoading, createRequest, fetchData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData error");
  return context;
};