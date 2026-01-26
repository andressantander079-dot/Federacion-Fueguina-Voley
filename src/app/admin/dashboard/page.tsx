// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import {
  Trophy,
  Users,
  MessageSquare,
  FileText,
  Settings,
  LayoutGrid,
  FileSignature,
  UserPlus
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  // Contadores para las notificaciones (Badges)
  const [counts, setCounts] = useState({
    mensajes: 0,
    tramites: 0,
    solicitudes: 0
  });

  useEffect(() => {
    fetchCounts();
  }, []);

  async function fetchCounts() {
    try {
      // 1. Mensajes sin leer / abiertos
      const { count: msgCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'abierto');

      // 2. Trámites en revisión
      const { count: procCount } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'en_revision');

      // 3. Solicitudes de Registro Pendientes
      const { count: reqCount } = await supabase
        .from('club_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setCounts({
        mensajes: msgCount || 0,
        tramites: procCount || 0,
        solicitudes: reqCount || 0
      });
      setLoading(false);

    } catch (error) {
      console.error("Error cargando contadores:", error);
      setLoading(false);
    }
  }

  // --- CONFIGURACIÓN DEL MENÚ (MOSAICOS) ---
  const menuOptions = [
    {
      // POSICIÓN 0: SOLICITUDES DE ACCESO (NUEVO) - Color NARANJA/ROJO
      title: "Solicitudes de Acceso",
      desc: "Nuevos Clubes Pendientes",
      icon: <UserPlus size={24} />,
      href: "/admin/solicitudes",
      bgClass: "bg-orange-600",
      textHover: "group-hover:text-orange-600",
      borderHover: "hover:border-orange-200",
      badge: counts.solicitudes, // Notificación
    },
    {
      // POSICIÓN 1: MESA DE ENTRADA (Reemplaza a Programar Partido) - Mantiene el AZUL
      title: "Mesa de Entrada",
      desc: "Comunicaciones oficiales",
      icon: <MessageSquare size={24} />,
      href: "/admin/mensajes",
      bgClass: "bg-blue-600",
      textHover: "group-hover:text-blue-600",
      borderHover: "hover:border-blue-200",
      badge: counts.mensajes, // Notificación
    },
    {
      // POSICIÓN 2: COMPETENCIAS (Sin cambios)
      title: "Competencias",
      desc: "Categorías y torneos",
      icon: <Trophy size={24} />,
      href: "/admin/competencias",
      bgClass: "bg-indigo-600",
      textHover: "group-hover:text-indigo-600",
      borderHover: "hover:border-indigo-200",
    },
    {
      // POSICIÓN 3: EQUIPOS (Sin cambios)
      title: "Equipos y Jugadores",
      desc: "Gestionar planteles",
      icon: <Users size={24} />,
      href: "/admin/equipos",
      bgClass: "bg-emerald-600",
      textHover: "group-hover:text-emerald-600",
      borderHover: "hover:border-emerald-200",
    },
    {
      // POSICIÓN 4: TRÁMITES (Reemplaza al antiguo Mensajes) - Color VIOLETA
      title: "Trámites Federativos",
      desc: "Pagos, Pases y Sanciones",
      icon: <FileSignature size={24} />,
      href: "/admin/tramites",
      bgClass: "bg-violet-600",
      textHover: "group-hover:text-violet-600",
      borderHover: "hover:border-violet-200",
      badge: counts.tramites, // Notificación
    },
    {
      // POSICIÓN 5: REGLAMENTO (Sin cambios)
      title: "Reglamento",
      desc: "Subir archivos PDF",
      icon: <FileText size={24} />,
      href: "/admin/reglamento-upload",
      bgClass: "bg-rose-600",
      textHover: "group-hover:text-rose-600",
      borderHover: "hover:border-rose-200",
    },
    {
      // POSICIÓN 6: CONFIGURACIÓN (Sin cambios)
      title: "Configuración",
      desc: "Sedes y sistema",
      icon: <Settings size={24} />,
      href: "/admin/configuracion",
      bgClass: "bg-slate-700",
      textHover: "group-hover:text-slate-700",
      borderHover: "hover:border-slate-300",
    },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* HEADER */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 leading-none">Panel de Control</h1>
              <p className="text-slate-500 text-sm mt-1">Selecciona una acción rápida</p>
            </div>
          </div>

          {/* GRID DE MOSAICOS (Estilo Original) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {menuOptions.map((opt, i) => (
              <Link
                key={i}
                href={opt.href}
                className={`
                      group relative overflow-hidden
                      bg-white p-5 rounded-2xl border border-slate-200 shadow-sm
                      hover:shadow-xl hover:-translate-y-1 transition-all duration-300
                      flex flex-col justify-between h-36 md:h-44
                      ${opt.borderHover}
                    `}
              >
                {/* Fondo decorativo circular */}
                <div className={`
                      absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10
                      group-hover:opacity-20 transition-opacity
                      ${opt.bgClass}
                    `}></div>

                {/* Encabezado: Icono y Badge */}
                <div className="flex justify-between items-start mb-3">
                  <div className={`
                          p-3 rounded-xl w-fit text-white shadow-md
                          ${opt.bgClass}
                          group-hover:scale-110 transition-transform duration-300
                        `}>
                    {opt.icon}
                  </div>

                  {/* BADGE DE NOTIFICACIÓN (Nuevo) */}
                  {opt.badge && opt.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-sm animate-pulse z-20">
                      {opt.badge}
                    </span>
                  )}
                </div>

                {/* Textos */}
                <div className="relative z-10">
                  <h3 className={`font-bold text-slate-800 text-sm md:text-lg leading-tight transition-colors ${opt.textHover}`}>
                    {opt.title}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-1">
                    {opt.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* SECCIÓN INFERIOR ELIMINADA (Agenda Reciente) COMO PEDISTE */}

      </div>
    </div>
  );
}