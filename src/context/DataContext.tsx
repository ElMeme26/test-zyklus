import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Asset, Request, User } from '../types';
import { toast } from 'sonner';

// Definimos la URL de tu backend local
const API_URL = 'http://localhost:3000/api';

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
      console.log("🔄 Conectando al Backend Local...");
      
      // 1. Traer Activos desde Express (MySQL)
      const resAssets = await fetch(`${API_URL}/assets`);
      if (!resAssets.ok) throw new Error('Error cargando activos');
      const assetsData = await resAssets.json();
      
      console.log(`✅ Activos cargados: ${assetsData.length}`);
      setAssets(assetsData);

      // 2. Traer Solicitudes desde Express (MySQL)
      const resReq = await fetch(`${API_URL}/requests`);
      if (!resReq.ok) throw new Error('Error cargando solicitudes');
      const reqData = await resReq.json();
      
      console.log(`✅ Solicitudes cargadas: ${reqData.length}`);
      setRequests(reqData);

    } catch (error: any) {
      console.error('❌ Error DataContext:', error.message);
      toast.error("Error conectando con el servidor local (Revisa que 'node server.js' esté corriendo)");
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: asset.id,
          user_id: user.id,
          days: days,
          motive: motive
        })
      });

      if (!response.ok) throw new Error('Error al guardar en BD');

      toast.success("Solicitud enviada exitosamente 🚀");
      fetchData(); // Recargar datos

    } catch (error: any) {
      console.error("Error al crear solicitud:", error);
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