import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '../types'; 
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar sesión persistente al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem('zf_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      // 1. Buscamos el usuario en la tabla 'users' de Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        toast.error("Usuario no encontrado. Verifica el correo.");
        console.error("Login error:", error);
        return;
      }

      // 2. Guardamos la sesión
      const userData = data as User;
      setUser(userData);
      localStorage.setItem('zf_user', JSON.stringify(userData));
      toast.success(`Bienvenido, ${userData.name}`);
      
    } catch (err: any) {
      console.error(err);
      toast.error("Error de conexión al intentar ingresar.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zf_user');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};