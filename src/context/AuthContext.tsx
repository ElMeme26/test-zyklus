import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: any | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      if (data) setUser(data as User);
    } catch (error) {
      console.error("Error perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Login Simulado (Bypass de Auth real para prototipo)
  const signIn = async (email: string) => {
    setLoading(true);
    try {
        // 1. Buscamos si el usuario existe en la tabla 'users' por email
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            alert("Usuario no encontrado en la base de datos.");
            setLoading(false);
            return;
        }

        // 2. Simulamos sesión exitosa estableciendo el usuario en el estado
        setUser(data as User);
        // Creamos una sesión falsa para pasar los checks
        setSession({ user: { id: data.id, email: data.email } });
        
    } catch (e) {
        console.error(e);
        alert("Error al iniciar sesión");
    } finally {
        setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};