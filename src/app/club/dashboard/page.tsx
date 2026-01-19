// src/app/club/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importamos los nuevos íconos necesarios
import { LogOut, Shield, Users, Calendar, FileText, MessageSquare, Briefcase } from 'lucide-react';

export default function ClubDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [datosEquipo, setDatosEquipo] = useState<any>(null);
  const [nombreEntrenador, setNombreEntrenador] = useState('');

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        // PASO A: ID del equipo
        const { data: perfil, error: errorPerfil } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', user.id)
          .single();

        if (errorPerfil) throw errorPerfil;

        if (perfil?.team_id) {
          // PASO B: Datos del equipo
          const { data: equipo, error: errorEquipo } = await supabase
            .from('teams')
            .select('*')
            .eq('id', perfil.team_id)
            .single();

          if (!errorEquipo) {
            setDatosEquipo(equipo);
            setNombreEntrenador(equipo.coach || '');
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  // Componente de Tarjeta Reutilizable para mantener el estilo consistente
  const DashboardCard = ({ title, desc, icon: Icon, color, href }: any) => {
    // Mapeo de colores para clases de Tailwind
    const colorClasses: any = {
      blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600",
      orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-600",
      green: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600",
      purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-600",
      rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-600",
    };

    return (
      <Link href={href}>
        <div className="bg-white p-6 h-full rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group hover:border-blue-200">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition group-hover:text-white ${colorClasses[color]}`}>
            <Icon size={24}/>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{desc}</p>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border">
             {datosEquipo?.logo_url ? (
               <img src={datosEquipo.logo_url} className="w-full h-full object-contain" alt="Logo" />
             ) : (
               <Shield className="text-slate-300" size={20}/>
             )}
           </div>
           <div>
             <h1 className="font-bold text-slate-800 leading-tight text-lg">
               {datosEquipo?.name || 'Mi Club'}
             </h1>
             <p className="text-xs text-slate-500 font-medium">Panel de Gestión</p>
           </div>
        </div>
        
        <button onClick={cerrarSesion} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-red-600 transition bg-slate-50 hover:bg-red-50 px-4 py-2 rounded-lg">
           <LogOut size={16}/> <span className="hidden md:inline">Salir</span>
        </button>
      </nav>

      {/* CONTENIDO */}
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        
        <div className="mb-8">
           <h2 className="text-3xl font-black text-slate-800">Hola, {nombreEntrenador || 'Entrenador'} 👋</h2>
           <p className="text-slate-500 mt-1">Selecciona una opción para gestionar tu club.</p>
        </div>

        {/* GRILLA DE OPCIONES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Mi Plantel */}
            <DashboardCard 
              title="Mi Plantel" 
              desc="Gestiona tu lista de buena fe, altas y bajas." 
              icon={Users} 
              color="blue"
              href="/club/plantel"
            />

            {/* 2. Mi Agenda */}
            <DashboardCard 
              title="Mi Agenda" 
              desc="Próximos partidos, horarios y resultados." 
              icon={Calendar} 
              color="orange"
              href="/club/agenda" 
            />

            {/* 3. Mensajería (NUEVO) */}
            <DashboardCard 
              title="Mensajería" 
              desc="Comunicaciones oficiales con la Federación." 
              icon={MessageSquare} 
              color="green" 
              href="/club/mensajes"
            />

            {/* 4. Planillas */}
            <DashboardCard 
              title="Planillas" 
              desc="Historial de actas de partidos jugados." 
              icon={FileText} 
              color="purple" 
              href="/club/planillas"
            />

            {/* 5. Trámites Federativos (NUEVO) */}
            <DashboardCard 
              title="Trámites Federativos" 
              desc="Pagos, inscripciones y documentación legal." 
              icon={Briefcase} 
              color="rose" 
              href="/club/tramites"
            />

        </div>
      </div>
    </div>
  );
}