// src/components/LoginModal.tsx
'use client';

import { useState } from 'react';
import { X, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signIn } = useAuth(); // Solo traemos la función signIn
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue sola
    setLoading(true);
    setErrorMsg('');

    console.log("🟢 1. Botón presionado. Intentando entrar con:", email);

    try {
      // Intentamos loguear
      const { error } = await signIn(email, password);

      if (error) {
        console.error("🔴 2. Error devuelto por Supabase:", error);
        // MOSTRAR ALERTA EN PANTALLA
        alert("ERROR DE LOGIN: " + error.message);
        setErrorMsg(error.message); // Mostramos el mensaje técnico
        setLoading(false);
      } else {
        console.log("🟢 3. Login Exitoso. Redirigiendo...");
        // Si no hay error, cerramos y redirigimos
        onClose();
        router.push('/admin/dashboard');
      }
    } catch (err) {
      console.error("💥 4. Error catastrófico:", err);
      alert("Ocurrió un error inesperado. Mira la consola.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-lg">Acceso Oficial</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Mensaje de Error en Rojo */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center border border-red-100 break-words">
              ⚠️ {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Oficial</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                placeholder="admin@federacion.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-lg shadow-blue-700/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Ingresar al Panel <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400">Si el botón no funciona, revisa la consola con F12</p>
          </div>
        </div>
      </div>
    </div>
  );
}