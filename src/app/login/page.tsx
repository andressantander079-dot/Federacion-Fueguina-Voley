// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Limpieza inicial forzosa
  useEffect(() => {
    localStorage.clear();
    supabase.auth.signOut();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Autenticación (Email/Pass)
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error("Credenciales incorrectas. Verifica tu email y contraseña.");
      }

      if (!user) {
        throw new Error("No se pudo autenticar el usuario.");
      }

      console.log("✅ Auth correcta. Usuario ID:", user.id);

      // 2. Obtener perfil completo
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("❌ Error DB:", profileError);
        throw new Error("Error al cargar el perfil. Contacta soporte.");
      }

      if (!profile) {
        throw new Error("Perfil de usuario no encontrado.");
      }

      console.log("🔍 Perfil detectado:", profile);

      // 3. Redirección según rol
      if (profile.role === 'club') {
        // Redirigir a dashboard de club
        router.push('/club/dashboard');
        // O si tu ruta es literalmente /club/dashboard:
        // router.push('/club/dashboard');
        
      } else if (profile.role === 'admin') {
        // Redirigir a dashboard de admin
        router.push('/admin/dashboard');
        
      } else {
        // Rol no reconocido
        throw new Error(`Rol '${profile.role}' no autorizado para el sistema.`);
      }

      // IMPORTANTE: No cambies el loading aquí, déjalo que la redirección lo maneje

    } catch (err: any) {
      console.error("Login Fallido:", err);
      setErrorMsg(err.message || "Error desconocido al iniciar sesión.");
      setLoading(false);
      await supabase.auth.signOut(); // Cerramos sesión por seguridad
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Shield className="text-white" size={32}/>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Federación de Voley</h1>
          <p className="text-slate-400">Sistema de Gestión Oficial</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-3">
              <AlertTriangle className="shrink-0" size={18}/>
              <div>
                <p className="font-bold">Acceso Denegado</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 border rounded-xl outline-none focus:border-blue-600 transition bg-slate-50 focus:bg-white"
              placeholder="usuario@voley.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-300" size={18}/>
              <input 
                type="password" 
                required
                className="w-full p-3 pl-10 border rounded-xl outline-none focus:border-blue-600 transition bg-slate-50 focus:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          >
            {loading ? <Loader2 className="animate-spin"/> : <>Ingresar <ArrowRight size={18}/></>}
          </button>
        </form>
      </div>
    </div>
  );
}