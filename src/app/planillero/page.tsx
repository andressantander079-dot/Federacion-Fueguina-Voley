// src/app/planillero/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { Calendar, MapPin, ChevronRight, Clock, UserCheck } from 'lucide-react';

export default function PlanilleroDashboard() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPartidosHoy();
  }, []);

  async function cargarPartidosHoy() {
    // Buscamos partidos donde la fecha sea HOY
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('matches')
      .select(`
        id, 
        time, 
        location,
        status,
        category_id, 
        home_team_id, 
        away_team_id
      `)
      .eq('date', today)
      .order('time', { ascending: true });

    if (!data) {
       setPartidos([]);
       setLoading(false);
       return;
    }

    // MOCKEO DE NOMBRES DE EQUIPOS
    // Tipamos 'p' como any para evitar el error de "Spread types"
    const procesados = data.map((p: any) => ({
        ...p,
        home_name: 'Club A. Local', // A futuro: p.home_team.name
        away_name: 'Club B. Visita', // A futuro: p.away_team.name
        category_name: 'Sub-18 Femenino'
    }));

    setPartidos(procesados);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      
      <header className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-2xl font-black text-slate-800">Hola, Planillero</h1>
           <p className="text-slate-500 text-sm">Partidos programados para hoy: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-2 rounded-full shadow-sm">
           <UserCheck className="text-blue-600"/>
        </div>
      </header>

      {loading ? <p className="text-center text-slate-400">Buscando programación...</p> : (
        <div className="space-y-4">
           {partidos.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                 <Calendar size={48} className="mx-auto mb-2"/>
                 <p>No hay partidos asignados para hoy.</p>
              </div>
           ) : (
              partidos.map(p => (
                 <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden group">
                    {/* Borde de estado */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${p.status === 'programado' ? 'bg-blue-500' : p.status === 'en_juego' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    
                    <div className="flex justify-between items-center pl-4">
                       <div>
                          <div className="flex items-center gap-2 mb-2">
                             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p.category_name}</span>
                             <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase"><MapPin size={10}/> {p.location || 'Sede Central'}</span>
                          </div>
                          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                             {p.home_name} <span className="text-slate-300 text-sm font-medium">vs</span> {p.away_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                             <Clock size={14} className="text-blue-500"/>
                             <span className="font-bold text-slate-700">{p.time?.slice(0,5)} hs</span>
                             {p.status === 'en_juego' && <span className="text-[10px] bg-green-100 text-green-600 px-2 rounded-full font-bold animate-pulse">EN VIVO</span>}
                          </div>
                       </div>

                       <Link href={`/planillero/partido/${p.id}`} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition shadow-lg group-hover:scale-105 active:scale-95">
                          <ChevronRight/>
                       </Link>
                    </div>
                 </div>
              ))
           )}
        </div>
      )}
    </div>
  );
}