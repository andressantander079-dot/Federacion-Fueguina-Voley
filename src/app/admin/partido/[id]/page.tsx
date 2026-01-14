// src/app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase'; 
import { Plus, Clock, MapPin, Edit3, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        if (error) console.error('Error:', error);
        else setPartidos(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    cargarPartidos();
  }, []);

  const obtenerResultadoReal = (partido: any) => {
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
    // Mismas clases base para todos los badges para asegurar mismo tamaño
    const base = "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border";
    
    if (s === 'finalizado') return <span className={`${base} bg-green-100 text-green-700 border-green-200`}>Finalizado</span>;
    if (s === 'programado') return <span className={`${base} bg-blue-50 text-blue-600 border-blue-200`}>Programado</span>;
    if (s === 'suspendido') return <span className={`${base} bg-red-50 text-red-600 border-red-200`}>Suspendido</span>;
    return <span className={`${base} bg-slate-100 text-slate-500 border-slate-200`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800">Panel de Control</h1>
          {/* Botón Nuevo Partido usando navegación nativa */}
          <button 
            onClick={() => window.location.href = '/admin/programar'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm transition"
          >
            <Plus size={16} /> Nuevo Partido
          </button>
        </div>

        {/* Lista de Partidos */}
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : partidos.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">No hay partidos.</div>
        ) : (
          <div className="grid gap-3">
            {partidos.map((partido) => {
              const esFinalizado = partido.status === 'finalizado';
              const resultado = obtenerResultadoReal(partido); 
              const fecha = new Date(partido.scheduled_time);
              const mesNombre = fecha.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase().replace('.', '');

              return (
                <div key={partido.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-visible">
                  
                  {/* Borde izquierdo de color */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${esFinalizado ? 'bg-slate-700' : 'bg-blue-500'}`}></div>

                  <div className="p-3 pl-5 flex flex-col sm:flex-row items-center gap-4">
                    
                    {/* 1. COLUMNA IZQUIERDA: Fecha + Hora + Sede */}
                    <div className="flex sm:flex-col items-center justify-center gap-1 min-w-[90px] text-center sm:border-r border-slate-100 sm:pr-4">
                       <div className="leading-none mb-2">
                         <span className="block text-3xl font-black text-slate-800">{fecha.getDate()}</span>
                         <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mesNombre}</span>
                       </div>
                       
                       <div className="flex flex-col gap-1 w-full items-center">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded w-max">
                             <Clock size={10} /> {fecha.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 truncate max-w-[80px]" title={partido.court_name}>
                             <MapPin size={9} /> {partido.court_name}
                          </div>
                       </div>
                    </div>

                    {/* 2. COLUMNA CENTRAL: Partido y Resultado */}
                    <div className="flex-1 w-full text-center sm:text-left">
                       <div className="flex justify-center sm:justify-start items-center gap-2 mb-3">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100 tracking-wider">
                            {partido.category?.name}
                          </span>
                          {getEstadoBadge(partido.status)}
                       </div>

                       <div className="flex items-center justify-center sm:justify-start gap-3">
                          <div className={`flex-1 text-right font-bold text-sm sm:text-base leading-tight ${resultado.home > resultado.away && esFinalizado ? 'text-slate-900' : 'text-slate-500'}`}>
                            {partido.home_team?.name}
                          </div>

                          {esFinalizado ? (
                            <div className="bg-slate-900 text-white px-3 py-1 rounded-md font-black text-lg tracking-widest min-w-[70px] text-center whitespace-nowrap shadow-sm z-10">
                              {resultado.home} - {resultado.away}
                            </div>
                          ) : (
                            <div className="bg-slate-100 text-slate-400 px-2 py-1 rounded text-[10px] font-black border border-slate-200">VS</div>
                          )}

                          <div className={`flex-1 text-left font-bold text-sm sm:text-base leading-tight ${resultado.away > resultado.home && esFinalizado ? 'text-slate-900' : 'text-slate-500'}`}>
                            {partido.away_team?.name}
                          </div>
                       </div>

                       {esFinalizado && partido.set_scores && (
                         <div className="flex justify-center sm:justify-start mt-1 gap-2 text-[10px] text-slate-400 font-medium tracking-wide">
                            {partido.set_scores.map((set: string, i: number) => (
                              <span key={i}>
                                {set}{i < partido.set_scores.length - 1 ? ',' : ''}
                              </span>
                            ))}
                         </div>
                       )}
                    </div>

                    {/* 3. COLUMNA DERECHA: Botón Acción BLINDADO */}
                    <div className="sm:pl-4 sm:border-l border-slate-100 flex items-center justify-center">
                      <button 
                        // AQUÍ ESTÁ LA MAGIA: window.location.href
                        onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/admin/partido/${partido.id}`;
                        }}
                        className={`relative z-50 cursor-pointer w-10 h-10 flex items-center justify-center rounded-full shadow-md transition transform hover:scale-105
                          ${esFinalizado 
                            ? 'bg-white text-slate-400 hover:text-blue-600 border border-slate-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        title={esFinalizado ? "Editar resultado" : "Cargar resultado"}
                      >
                         {esFinalizado ? <Edit3 size={18} /> : <ChevronRight size={20} />}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}