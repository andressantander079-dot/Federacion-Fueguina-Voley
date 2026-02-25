'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, Loader2, X, LogIn } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Autenticación
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw new Error("Credenciales incorrectas.");
      if (!authData.user) throw new Error("No se pudo iniciar sesión.");

      // 2. Verificar ROL
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Usuario sin perfil asignado.");
      }

      // 3. Redirección
      onClose();
      switch (profile.role) {
        case 'admin': router.push('/admin/dashboard'); break;
        case 'club': router.push('/club'); break;
        default: router.push('/');
      }

    } catch (error: any) {
      setErrorMsg(error.message || "Error al ingresar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button>

        <div className="bg-slate-900 p-6 text-center text-white">
          <h2 className="text-xl font-bold uppercase">Acceso Oficial</h2>
          <p className="text-xs text-slate-400">Sistema de Gestión FVU</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded">{errorMsg}</div>}

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
              <input type="email" required className="w-full pl-10 p-2 border rounded-lg font-bold text-slate-700"
                onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
              <input type="password" required className="w-full pl-10 p-2 border rounded-lg font-bold text-slate-700"
                onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}