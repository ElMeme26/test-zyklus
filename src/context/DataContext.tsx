import React, { createContext, useContext, useState, useEffect } from 'react';
// ELIMINAMOS SUPABASE
// import { supabase } from '../supabaseClient'; 
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

// URL de tu backend local
const API_URL = 'http://localhost:3000/api';

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
      
      // 1. Traer Activos desde MySQL
      const resAssets = await fetch(`${API_URL}/assets`);
      if (!resAssets.ok) throw new Error('Error cargando activos');
      const assetsData = await resAssets.json();
      setAssets(assetsData);

      // 2. Traer Solicitudes desde MySQL
      const resReq = await fetch(`${API_URL}/requests`);
      if (!resReq.ok) throw new Error('Error cargando solicitudes');
      const reqData = await resReq.json();

      // TRANSFORMACIÓN DE DATOS (IMPORTANTE)
      // Tu backend devuelve los datos "planos" (ej. asset_name), 
      // pero tu UI espera un objeto anidado 'assets: { name: ... }'
      // Aquí hacemos esa conversión manual para que no se rompa nada visual.
      const formattedRequests = reqData.map((r: any) => ({
        ...r,
        assets: {
          name: r.asset_name,
          image: r.asset_image,
          tag: r.asset_tag || 'N/A' // Por si el backend no lo trajo aún
        }
      }));

      setRequests(formattedRequests);

    } catch (error: any) {
      console.error('Error:', error.message);
      toast.error("Error conectando con el servidor");
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
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset_id: asset.id,
          user_id: user.id, // Enviamos el ID del usuario
          days: days,
          motive: motive
        }),
      });

      if (!response.ok) throw new Error('Error al crear solicitud');

      toast.success("Solicitud enviada exitosamente 🚀");
      fetchData(); // Recargar datos para ver el cambio

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