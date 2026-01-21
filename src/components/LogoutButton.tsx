// src/components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase'; // Asegúrate que la ruta sea correcta
import { LogOut } from 'lucide-react';

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    // 1. Cerrar sesión en Supabase
    await supabase.auth.signOut();
    // 2. Redirigir al Login
    router.push('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className={`flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition ${className}`}
      title="Cerrar Sesión"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}