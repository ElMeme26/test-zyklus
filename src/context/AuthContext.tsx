import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types'; 
import { toast } from 'sonner';

// URL de tu backend
const API_URL = 'http://localhost:3000/api';

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

  // Cargar usuario del almacenamiento local al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem('zf_user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      // Petición al Backend Local
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        toast.error("Usuario no encontrado. Intenta: user@zf.com");
        return;
      }

      const userData = await response.json();
      
      // Guardar sesión
      setUser(userData);
      localStorage.setItem('zf_user', JSON.stringify(userData));
      toast.success(`Bienvenido, ${userData.name}`);
      
    } catch (err) {
      console.error(err);
      toast.error("Error de conexión con el servidor");
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
  if (!context) throw new Error("useAuth error");
  return context;
};
