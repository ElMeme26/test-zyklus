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
    // 1. Verificar sesión inicial al cargar la página
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
           console.warn("No se pudo obtener sesión inicial:", error.message);
        }
        
        setSession(session);

        if (session && session.user) {
          await fetchUserProfile(session.user.id);
        } else {
          // Si no hay sesión, terminamos de cargar
          setLoading(false);
        }
      } catch (err) {
        console.error("Error inesperado en auth:", err);
        setLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios de estado (Login/Logout externos)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Buscamos el perfil completo en la tabla 'users'
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error cargando perfil de usuario:", error);
      } else if (data) {
        setUser(data as User);
      }
    } catch (error) {
      console.error("Error crítico fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función de Login Personalizada (Simulación Segura)
  const signIn = async (email: string) => {
    setLoading(true);
    try {
        // 1. Verificar si el email existe en nuestra tabla de usuarios
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            alert("❌ Usuario no encontrado en el sistema. Contacta a RRHH.");
            setLoading(false);
            return;
        }

        // 2. Iniciar sesión real o simulada
        // Opción A: Si usas Supabase Auth real (Magic Link / Password)
        // const { error: authError } = await supabase.auth.signInWithOtp({ email });
        
        // Opción B (Prototipo Rápido): Simular sesión exitosa
        console.log("Inicio de sesión exitoso para:", data.name);
        setUser(data as User);
        setSession({ user: { id: data.id, email: data.email } });
        
    } catch (e) {
        console.error("Error en signIn:", e);
        alert("Hubo un problema al intentar ingresar.");
    } finally {
        setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Error al salir:", error);
    } finally {
      setLoading(false);
    }
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