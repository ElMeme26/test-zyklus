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
      setIsLoading(true);
      
      // 1. Traer Activos desde Supabase
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('name', { ascending: true });

      if (assetsError) throw assetsError;
      setAssets(assetsData || []);

      // 2. Traer Solicitudes desde Supabase (con Relaciones)
      // OJO: La sintaxis assets:asset_id(...) es para hacer JOIN en Supabase
      const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .select(`
          *,
          assets:asset_id (*),
          users:user_id (*)
        `)
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setRequests(reqData || []);

    } catch (error: any) {
      console.error('Error:', error.message);
      toast.error("Error cargando datos de la nube");
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
      const { error } = await supabase
        .from('requests')
        .insert({
          asset_id: asset.id,
          user_id: user.id,
          requester_name: user.name,
          requester_dept: user.dept,
          days_requested: days,
          motive: motive,
          status: 'PENDING'
        });

      if (error) throw error;

      toast.success("Solicitud enviada exitosamente 🚀");
      fetchData(); // Recargar datos

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