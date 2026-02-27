import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../api/auth';
import type { User } from '../types';
import { toast } from 'sonner';

/** Contexto de autenticación: usuario actual, login, logout y estado de carga. */
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('zf_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: userData, token } = await api.login(email, password);
      setUser(userData);
      localStorage.setItem('zf_user', JSON.stringify(userData));
      localStorage.setItem('zf_token', token);
      toast.success(`Bienvenido, ${userData.name}`);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zf_user');
    localStorage.removeItem('zf_token');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading,
      signIn: login,
      signOut: logout,
      loading: isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Use useAuth within AuthProvider");
  return context;
};