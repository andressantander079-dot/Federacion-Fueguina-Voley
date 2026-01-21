// src/app/planillero/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import LogoutButton from '../../components/LogoutButton';
import { Calendar, MapPin, Clock, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function PlanilleroDashboard() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Opcional: Obtener nombre del perfil
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setUserName(profile?.full_name || 'Planillero');
    }

    // 2. Obtener partidos de HOY (o pendientes)
    // Filtramos por fecha actual y ordenamos por hora
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        date,
        time,
        location,
        status,
        home_team: home_team_id ( name ),
        away_team: away_team_id ( name )
      `)
      // .eq('date', today) // Descomenta esto en producción para ver solo HOY
      .order('time', { ascending: true });

    if (!error && data) {
        setMatches(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Panel de Control</h1>
              <p className="text-xs font-bold text-slate-400 uppercase">Hola, {userName}</p>
          </div>
          <LogoutButton />
      </header>

      {/* CONTENIDO */}
      <main className="p-6 max-w-4xl mx-auto">
          
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-700 flex items-center gap-2">
                  <Calendar className="text-blue-600"/> Partidos Asignados
              </h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                  {new Date().toLocaleDateString()}
              </span>
          </div>

          {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40}/></div>
          ) : matches.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <p className="text-slate-400 font-bold">No hay partidos programados para hoy.</p>
              </div>
          ) : (
              <div className="grid gap-4">
                  {matches.map((match) => {
                      const isFinished = match.status === 'finalizado';
                      
                      return (
                        <div key={match.id} className={`bg-white rounded-2xl p-6 border-l-8 shadow-sm transition hover:shadow-md flex flex-col md:flex-row items-center gap-6 ${isFinished ? 'border-green-500 opacity-75' : 'border-blue-500'}`}>
                            
                            {/* INFO HORA/LUGAR */}
                            <div className="flex flex-col items-center md:items-start min-w-[120px] text-center md:text-left border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                                <div className="text-3xl font-black text-slate-800 tracking-tighter">
                                    {match.time?.slice(0,5)}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase mt-1">
                                    <MapPin size={12}/> {match.location || 'Cancha Central'}
                                </div>
                            </div>

                            {/* EQUIPOS */}
                            <div className="flex-1 flex flex-col items-center gap-2 w-full">
                                <div className="flex items-center justify-center gap-4 w-full text-lg md:text-2xl font-black text-slate-700 uppercase">
                                    <span className="text-right flex-1 truncate">{match.home_team?.name || 'Local'}</span>
                                    <span className="text-slate-300 text-sm">VS</span>
                                    <span className="text-left flex-1 truncate">{match.away_team?.name || 'Visita'}</span>
                                </div>
                                {isFinished && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><CheckCircle size={10}/> FINALIZADO</span>}
                                {match.status === 'programado' && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><AlertCircle size={10}/> POR JUGAR</span>}
                            </div>

                            {/* BOTÓN ACCIÓN */}
                            <div className="min-w-[140px] flex justify-end">
                                {isFinished ? (
                                    <button disabled className="bg-slate-100 text-slate-400 w-full py-3 rounded-xl font-bold text-sm cursor-not-allowed">
                                        Planilla Cerrada
                                    </button>
                                ) : (
                                    <Link 
                                        href={`/planillero/partido/${match.id}`} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition"
                                    >
                                        Iniciar Planilla <ArrowRight size={16}/>
                                    </Link>
                                )}
                            </div>

                        </div>
                      );
                  })}
              </div>
          )}
      </main>
    </div>
  );
}