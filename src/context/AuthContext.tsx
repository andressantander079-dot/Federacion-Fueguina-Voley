// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

// Definimos los tipos
type UserRole = 'admin' | 'club' | 'planillero' | null;

interface AuthContextType {
  user: any;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user.id);
      }
      setLoading(false);
    };

    checkUser();

    // Escuchar cambios en la sesión
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        router.push('/');
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- FUNCIÓN CON MODO DETECTIVE (LOGS) ---
  const fetchUserRole = async (userId: string) => {
    console.log("🕵️‍♂️ Buscando rol para el usuario:", userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("❌ Error al buscar en la tabla profiles:", error);
        console.error("💡 Pista: ¿Existe la tabla 'profiles'? ¿El ID coincide?");
      }

      if (data) {
        console.log("✅ Rol encontrado en base de datos:", data.role);
        setRole(data.role);
      } else {
        console.warn("⚠️ No se encontró ninguna fila en 'profiles' para este ID.");
      }
    } catch (error) {
      console.error("💥 Error inesperado:", error);
    }
  };

  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
} // <--- ¡ESTA ERA LA LLAVE QUE FALTABA!

export const useAuth = () => useContext(AuthContext);