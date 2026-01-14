'use client';

import { useState, useEffect } from 'react'; // <--- Agregamos useEffect
import { Search, Filter, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
export default function FixturePage() {
  const [partidos, setPartidos] = useState<any[]>([]); // Estado para guardar los datos reales
  const [loading, setLoading] = useState(true);

  // ESTO SE EJECUTA AL CARGAR LA PÁGINA
  useEffect(() => {
    async function cargarPartidos() {
      // Pedimos los datos a Supabase
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          date: scheduled_time,
          court_name,
          status,
          home_score_sets,
          away_score_sets,
          category: categories(name),
          home_team: home_team_id(name),  
          away_team: away_team_id(name)   
        `)
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('Error cargando partidos:', error);
      } else {
        setPartidos(data || []);
      }
      setLoading(false);
    }

    cargarPartidos();
  }, []);

  if (loading) return <div className="p-10 text-center">Cargando partidos...</div>;

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Fixture Oficial (Conectado a Nube)</h1>
      
      {/* LISTA DE PARTIDOS REALES */}
      <div className="space-y-4">
        {partidos.length === 0 && <p>No hay partidos cargados en la base de datos.</p>}

        {partidos.map((partido) => (
          <div key={partido.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex justify-between items-center mb-2">
               <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                 {partido.category?.name || 'Categoría'}
               </span>
               <span className="text-xs text-slate-500 flex items-center gap-1">
                 <Calendar className="w-3 h-3"/> 
                 {new Date(partido.date).toLocaleDateString()}
               </span>
            </div>

            <div className="flex items-center justify-between text-center">
               <div className="flex-1 font-bold text-slate-800">
                 {/* Si el nombre no carga (porque no unimos tablas aun) mostramos ID */}
                 {partido.home_team?.name || 'Local'} 
               </div>
               <div className="px-3 font-black text-xl">VS</div>
               <div className="flex-1 font-bold text-slate-800">
                 {partido.away_team?.name || 'Visita'}
               </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {partido.court_name}</span>
              <span>{partido.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
