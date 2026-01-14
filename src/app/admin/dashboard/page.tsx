// src/app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
// CORRECCIÓN 1: Ruta correcta para Supabase en Next.js
import { supabase } from '../../../lib/supabase'; 
// CORRECCIÓN 2: Usamos el Link de Next.js, no de react-router-dom
import Link from 'next/link'; 
import { 
  CalendarPlus, 
  Trophy, 
  Users, 
  MessageSquare, 
  FileText, 
  Settings, 
  Clock, 
  MapPin, 
  Edit3, 
  ChevronRight,
  LayoutGrid
} from 'lucide-react';

// CORRECCIÓN 3: Definimos la interfaz aquí mismo para evitar el error de importación
interface Match {
  id: any;
  scheduled_time: string;
  home_score: number;
  away_score: number;
  set_scores: string[] | null;
  status: string;
  court_name: string;
  category?: { name: string; gender: string };
  home_team?: { name: string };
  away_team?: { name: string };
}

export default function DashboardPage() {
  // --- ESTADOS ---
  const [partidos, setPartidos] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 1. CARGA DE PARTIDOS ---
  useEffect(() => {
    async function cargarPartidos() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('matches')
          .select(`
            *,
            category:categories(name, gender),
            home_team:teams!home_team_id(name),
            away_team:teams!away_team_id(name)
          `)
          .order('scheduled_time', { ascending: false });

        if (error) {
          console.error('Error cargando partidos:', error);
        } else {
          setPartidos(data || []);
        }
      } catch (err) {
        console.error('Error inesperado:', err);
      } finally {
        setLoading(false);
      }
    }

    cargarPartidos();
  }, []);

  // --- 2. HELPERS ---
  const obtenerResultadoReal = (partido: Match) => {
    if (!partido.set_scores || partido.set_scores.length === 0) {
      return { home: partido.home_score || 0, away: partido.away_score || 0 };
    }
    let setsLocal = 0;
    let setsVisita = 0;
    partido.set_scores.forEach((score: string) => {
      const [puntosLocal, puntosVisita] = score.split('-').map(Number);
      if (puntosLocal > puntosVisita) setsLocal++;
      if (puntosVisita > puntosLocal) setsVisita++;
    });
    return { home: setsLocal, away: setsVisita };
  };

  const getEstadoBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    const baseClasses = "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border";

    if (s === 'finalizado') {
      return <span className={`${baseClasses} bg-green-100 text-green-700 border-green-200`}>Finalizado</span>;
    }
    if (s === 'programado') {
      return <span className={`${baseClasses} bg-blue-50 text-blue-600 border-blue-200`}>Programado</span>;
    }
    if (s === 'suspendido') {
      return <span className={`${baseClasses} bg-red-50 text-red-600 border-red-200`}>Suspendido</span>;
    }
    return <span className={`${baseClasses} bg-slate-100 text-slate-500 border-slate-200`}>{status}</span>;
  };

  // --- 3. CONFIGURACIÓN DEL MENÚ ---
  const menuOptions = [
    {
      title: "Programar Partido",
      desc: "Crear nuevos cruces",
      icon: <CalendarPlus size={24} />,
      href: "/admin/programar",
      bgClass: "bg-blue-600",
      textHover: "group-hover:text-blue-600",
      borderHover: "hover:border-blue-200",
    },
    {
      title: "Competencias",
      desc: "Categorías y torneos",
      icon: <Trophy size={24} />,
      href: "/admin/competencias",
      bgClass: "bg-indigo-600", 
      textHover: "group-hover:text-indigo-600",
      borderHover: "hover:border-indigo-200",
    },
    {
      title: "Equipos y Jugadores",
      desc: "Gestionar planteles",
      icon: <Users size={24} />,
      href: "/admin/equipos",
      bgClass: "bg-emerald-600", 
      textHover: "group-hover:text-emerald-600",
      borderHover: "hover:border-emerald-200",
    },
    {
      title: "Mensajes",
      desc: "Avisos importantes",
      icon: <MessageSquare size={24} />,
      href: "/admin/mensajes",
      bgClass: "bg-orange-500", 
      textHover: "group-hover:text-orange-500",
      borderHover: "hover:border-orange-200",
    },
    {
      title: "Reglamento",
      desc: "Subir archivos PDF",
      icon: <FileText size={24} />,
      href: "/admin/reglamento-upload",
      bgClass: "bg-rose-600", 
      textHover: "group-hover:text-rose-600",
      borderHover: "hover:border-rose-200",
    },
    {
      title: "Configuración",
      desc: "Sedes y sistema",
      icon: <Settings size={24} />,
      href: "/admin/configuracion",
      bgClass: "bg-slate-700", 
      textHover: "group-hover:text-slate-700",
      borderHover: "hover:border-slate-300",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-10">
            
            {/* SECCIÓN 1: HEADER & MOSAICO */}
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

              {/* GRID DE OPCIONES */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {menuOptions.map((opt, i) => (
                  <Link
                    key={i}
                    href={opt.href} // CORRECCIÓN 2: 'href' en lugar de 'to'
                    className={`
                      group relative overflow-hidden
                      bg-white p-5 rounded-2xl border border-slate-200 shadow-sm
                      hover:shadow-xl hover:-translate-y-1 transition-all duration-300
                      flex flex-col justify-between h-36 md:h-44
                      ${opt.borderHover}
                    `}
                  >
                    {/* Fondo decorativo */}
                    <div className={`
                      absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10
                      group-hover:opacity-20 transition-opacity
                      ${opt.bgClass}
                    `}></div>

                    {/* Icono */}
                    <div className={`
                      p-3 rounded-xl w-fit text-white shadow-md mb-3
                      ${opt.bgClass}
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      {opt.icon}
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

            {/* SECCIÓN 2: AGENDA DE PARTIDOS */}
            <section>
              <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                  <Clock size={20} className="text-slate-400" />
                  Agenda Reciente
                </h2>
                <Link href="/fixture" className="text-xs font-bold text-blue-600 cursor-pointer hover:underline">
                  Ver todo el fixture
                </Link>
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : partidos.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                  No hay partidos programados.
                </div>
              ) : (
                <div className="grid gap-3">
                  {partidos.map((partido) => {
                    const esFinalizado = partido.status === 'finalizado';
                    const resultado = obtenerResultadoReal(partido);
                    const fecha = new Date(partido.scheduled_time);
                    
                    let mesNombre = "MES";
                    try {
                        mesNombre = fecha.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase().replace('.', '');
                    } catch (e) {
                        mesNombre = "MES";
                    }

                    return (
                      <div
                        key={partido.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all duration-200 relative overflow-visible group"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${esFinalizado ? 'bg-slate-700' : 'bg-blue-500'}`}></div>

                        <div className="p-3 pl-5 flex flex-col sm:flex-row items-center gap-4 relative">
                          
                          {/* Columna Fecha */}
                          <div className="flex sm:flex-col items-center justify-center gap-1 min-w-[80px] text-center sm:border-r border-slate-100 sm:pr-4">
                             <div className="leading-none mb-1">
                               <span className="block text-2xl font-black text-slate-800">{fecha.getDate()}</span>
                               <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{mesNombre}</span>
                             </div>
                             <div className="flex flex-col gap-0.5 w-full items-center">
                                <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                  {fecha.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 truncate max-w-[70px] flex items-center gap-1" title={partido.court_name}>
                                  <MapPin size={8} /> {partido.court_name}
                                </span>
                             </div>
                          </div>

                          {/* Columna Partido */}
                          <div className="flex-1 w-full text-center sm:text-left">
                             <div className="flex justify-center sm:justify-start items-center gap-2 mb-2">
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100 tracking-wider">
                                  {partido.category?.name}
                                </span>
                                {getEstadoBadge(partido.status)}
                             </div>
                             <div className="flex items-center justify-center sm:justify-start gap-3">
                                <div className={`flex-1 text-right font-bold text-sm leading-tight ${resultado.home > resultado.away && esFinalizado ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {partido.home_team?.name}
                                </div>
                                {esFinalizado ? (
                                  <div className="bg-slate-900 text-white px-2 py-0.5 rounded font-black text-base tracking-widest min-w-[60px] text-center shadow-sm z-10">
                                    {resultado.home} - {resultado.away}
                                  </div>
                                ) : (
                                  <div className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200">VS</div>
                                )}
                                <div className={`flex-1 text-left font-bold text-sm leading-tight ${resultado.away > resultado.home && esFinalizado ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {partido.away_team?.name}
                                </div>
                             </div>
                          </div>

                          {/* Columna Botón */}
                          <div className="sm:pl-4 sm:border-l border-slate-100 flex items-center justify-center">
                            <Link
                              href={`/admin/partido/${partido.id}`}
                              className={`
                                relative z-50 flex items-center justify-center w-9 h-9 rounded-full shadow-sm transition-transform hover:scale-105
                                ${esFinalizado ? 'bg-white text-slate-400 border border-slate-200 hover:text-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}
                              `}
                              title={esFinalizado ? "Editar Resultado" : "Cargar Resultado"}
                            >
                               {esFinalizado ? <Edit3 size={16} /> : <ChevronRight size={18} />}
                            </Link>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
        </div>
    </div>
  );
}