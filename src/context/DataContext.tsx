import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Asset, User, DataContextType } from '../types';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar Activos
  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setAssets(data as Asset[]);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // 2. Funciones CRUD
  const addAsset = async (asset: Asset) => {
    const { error } = await supabase.from('assets').insert([asset]);
    if (!error) fetchAssets();
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const { error } = await supabase.from('assets').update(updates).eq('id', id);
    if (!error) fetchAssets();
  };

  const deleteAsset = async (id: string) => {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) fetchAssets();
  };

  // 3. Utilidades
  const getNextTag = () => {
    return `ZF-${Math.floor(Math.random() * 10000)}`;
  };

  const importAssets = async (csvContent: string) => {
    console.log("Simulando importación CSV:", csvContent.substring(0, 50) + "...");
    alert("Función de importación simulada. Ver consola.");
    // Aquí iría tu lógica real de parseo CSV
  };

  const processQRScan = async (qrData: string) => {
    console.log("Procesando QR desde Admin:", qrData);
    alert(`Escaneo procesado: ${qrData}`);
    // Aquí podrías buscar el activo y abrir un modal
  };

  const createBatchRequest = async (selectedAssets: Asset[], user: User, days: number, motive: string) => {
    console.log("Creando solicitud masiva para:", selectedAssets.length, "activos");
    // Lógica para crear múltiples registros en 'requests'
    alert(`Solicitud Combo creada para ${selectedAssets.length} activos.`);
  };

  return (
    <DataContext.Provider value={{
      assets,
      loading,
      addAsset,
      updateAsset,
      deleteAsset,
      importAssets,
      getNextTag,
      processQRScan,
      createBatchRequest
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData debe usarse dentro de un DataProvider');
  }
  return context;
};