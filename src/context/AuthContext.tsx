import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Al cargar, revisar si hay sesión guardada
  useEffect(() => {
    const storedUser = localStorage.getItem('zf_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string) => {
    try {
      // Petición a TU backend local
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }) // Enviamos solo el email
      });

      if (!res.ok) throw new Error('Usuario no encontrado en MySQL');

      const userData = await res.json();
      
      // Guardamos el usuario REAL de MySQL
      setUser(userData);
      localStorage.setItem('zf_user', JSON.stringify(userData));
      toast.success(`Bienvenido, ${userData.name}`);

    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zf_user');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth error");
  return context;
};