// src/app/admin/programar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; 
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';

export default function ProgramarPartidoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Listas de datos
  const [equipos, setEquipos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  // Formulario
  const [form, setForm] = useState({
    fecha: '',
    hora: '',
    categoria: '',
    local: '',
    visita: '',
    cancha: 'Gimnasio Petrina'
  });

  // 1. Cargar datos al iniciar
  useEffect(() => {
    async function cargarDatos() {
      try {
        // Cargar Categorías
        const { data: dCats } = await supabase.from('categories').select('*').order('name');
        if (dCats) setCategorias(dCats);

        // Cargamos TODOS los equipos, el filtro lo hacemos visualmente abajo en "equiposFiltrados"
        const { data: dTeams } = await supabase.from('teams').select('*').order('name');
        if (dTeams) setEquipos(dTeams);
        
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    }
    cargarDatos();
  }, []);

  // 2. Guardar el partido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fechaHora = `${form.fecha}T${form.hora}:00`;

    const { error } = await supabase.from('matches').insert({
      category_id: form.categoria,
      home_team_id: form.local,
      away_team_id: form.visita,
      court_name: form.cancha,
      scheduled_time: fechaHora,
      status: 'programado'
    });

    if (error) {
      alert('Error al guardar: ' + error.message);
      setLoading(false);
    } else {
      alert('¡Partido programado con éxito! 🏐');
      router.push('/admin/dashboard');
    }
  };

  // --- LÓGICA DE FILTRADO (MAGIA AQUÍ) ---
  // Si hay categoría seleccionada, filtramos los equipos. Si no, lista vacía.
  const equiposFiltrados = form.categoria 
    ? equipos.filter(equipo => equipo.category_id === form.categoria)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        
        <button onClick={() => router.back()} className="flex items-center text-slate-500 hover:text-blue-700 mb-6 transition">
          <ChevronLeft className="w-5 h-5" /> Volver al Panel
        </button>

        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="bg-blue-700 p-6 text-white">
            <h1 className="font-bold text-xl">Programar Nuevo Partido</h1>
            <p className="text-blue-100 text-sm">Define el cruce, fecha y sede.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Fila 1: Categoría y Cancha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Categoría</label>
                <select 
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={e => {
                     // Al cambiar categoría, reseteamos los equipos seleccionados para evitar errores
                     setForm({...form, categoria: e.target.value, local: '', visita: ''}) 
                  }}
                  value={form.categoria}
                >
                  <option value="">-- Seleccionar --</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cancha / Sede</label>
                <input 
                  type="text"
                  required
                  value={form.cancha}
                  onChange={e => setForm({...form, cancha: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Fila 2: El Duelo */}
            <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-center">Local</label>
                  <select 
                    required
                    disabled={!form.categoria} // Desactivado si no hay categoría
                    className="w-full p-2 border border-slate-300 rounded text-center font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    onChange={e => setForm({...form, local: e.target.value})}
                    value={form.local}
                  >
                    <option value="">
                      {form.categoria ? "Seleccionar..." : "Elige categoría primero"}
                    </option>
                    {/* AQUÍ USAMOS LA LISTA FILTRADA */}
                    {equiposFiltrados.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </select>
               </div>

               <div className="text-center font-black text-slate-300 text-xl">VS</div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-center">Visita</label>
                  <select 
                    required
                    disabled={!form.categoria} // Desactivado si no hay categoría
                    className="w-full p-2 border border-slate-300 rounded text-center font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    onChange={e => setForm({...form, visita: e.target.value})}
                    value={form.visita}
                  >
                    <option value="">
                      {form.categoria ? "Seleccionar..." : "Elige categoría primero"}
                    </option>
                    {/* AQUÍ USAMOS LA LISTA FILTRADA */}
                    {equiposFiltrados.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* Fila 3: Fecha y Hora */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha</label>
                <input 
                  type="date"
                  required
                  onChange={e => setForm({...form, fecha: e.target.value})}
                  value={form.fecha}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hora</label>
                <input 
                  type="time"
                  required
                  onChange={e => setForm({...form, hora: e.target.value})}
                  value={form.hora}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Botón Final */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> Confirmar Partido</>}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}