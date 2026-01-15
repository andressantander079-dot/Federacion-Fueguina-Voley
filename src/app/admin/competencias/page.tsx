// src/app/admin/competencias/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; 
import Link from 'next/link';
import { 
  Trophy, Plus, Archive, ChevronRight, 
  Activity, Trash2, Users 
} from 'lucide-react';

export default function CompetenciasPage() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  
  // Formulario
  const [form, setForm] = useState({ 
    name: '', season: new Date().getFullYear().toString(), point_system: 'fivb', category_id: '' 
  });
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [mostrarArchivados]);

  async function cargarDatos() {
    setLoading(true);
    
    // 1. Cargar Torneos
    let query = supabase
      .from('tournaments')
      .select('*, category:categories(name), matches(count)')
      .order('created_at', { ascending: false });

    if (!mostrarArchivados) query = query.eq('status', 'active');
    const { data: t } = await query;
    if (t) setTorneos(t);

    // 2. Cargar Auxiliares
    const { data: c } = await supabase.from('categories').select('*').order('name');
    const { data: e } = await supabase.from('teams').select('*').order('name');
    
    if (c) setCategorias(c);
    if (e) setEquiposDisponibles(e);

    setLoading(false);
  }

  const toggleEquipo = (id: string) => {
    if (equiposSeleccionados.includes(id)) {
      setEquiposSeleccionados(equiposSeleccionados.filter(eid => eid !== id));
    } else {
      setEquiposSeleccionados([...equiposSeleccionados, id]);
    }
  };

  async function crearTorneo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category_id) return alert("Debes elegir una categoría.");
    if (equiposSeleccionados.length < 2) return alert("Selecciona al menos 2 equipos participantes.");

    // A. Crear Torneo
    const { data: nuevo, error } = await supabase.from('tournaments').insert([form]).select().single();
    
    if (error || !nuevo) {
        return alert("Error al crear torneo: " + (error?.message || "Error desconocido"));
    }

    // B. Inscribir Equipos
    const inscripciones = equiposSeleccionados.map(teamId => ({
        tournament_id: nuevo.id,
        team_id: teamId
    }));

    const { error: errorInsc } = await supabase.from('tournament_teams').insert(inscripciones);

    if (!errorInsc) {
        setModalNuevo(false);
        setForm({ name: '', season: '2026', point_system: 'fivb', category_id: '' });
        setEquiposSeleccionados([]);
        cargarDatos();
    } else {
        alert("El torneo se creó pero hubo error al inscribir equipos: " + errorInsc.message);
    }
  }

  async function eliminarTorneo(id: string) {
    if (!confirm("⚠️ SE BORRARÁ TODO: Partidos, tablas y datos de este torneo.\n\n¿Confirmar eliminación?")) return;
    await supabase.from('tournaments').delete().eq('id', id);
    cargarDatos();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <Trophy className="text-indigo-600" size={32} /> Competencias
            </h1>
            <p className="text-slate-500 mt-1">Gestión de Torneos por Categoría.</p>
          </div>
          
          <div className="flex gap-3">
             <button 
               onClick={() => setMostrarArchivados(!mostrarArchivados)}
               className={`px-4 py-2 rounded-xl font-bold border transition flex items-center gap-2 ${mostrarArchivados ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}
             >
               <Archive size={18}/> {mostrarArchivados ? 'Ocultar Archivo' : 'Ver Archivo'}
             </button>
             <button 
               onClick={() => setModalNuevo(true)}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition"
             >
               <Plus size={20}/> Nuevo Torneo
             </button>
          </div>
        </div>

        {/* LISTA */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {torneos.map(torneo => (
              <div key={torneo.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition relative group border-t-4 border-t-indigo-600">
                 
                 <div className="flex justify-between items-start mb-3">
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        {torneo.category?.name || 'Sin Categoría'}
                    </span>
                    <button onClick={() => eliminarTorneo(torneo.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                 </div>

                 <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">{torneo.name}</h3>
                 <p className="text-sm text-slate-400 font-bold mb-4">Temporada {torneo.season}</p>

                 <div className="flex items-center gap-4 mb-6 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Activity size={14} className="text-green-500"/> {torneo.status === 'active' ? 'Activo' : 'Finalizado'}</span>
                    <span className="w-px h-3 bg-slate-200"></span>
                    <span>{torneo.matches[0]?.count || 0} Partidos</span>
                 </div>

                 <Link href={`/admin/competencias/${torneo.id}`} className="block w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-center hover:bg-slate-800 transition flex items-center justify-center gap-2">
                    Administrar <ChevronRight size={16}/>
                 </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CREAR */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-slate-800 mb-6">Nuevo Torneo</h2>
              <form onSubmit={crearTorneo} className="space-y-6">
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre</label>
                        <input className="w-full border p-3 rounded-xl font-bold outline-none focus:border-indigo-500" placeholder="Ej: Apertura" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Categoría Única</label>
                        <select className="w-full border p-3 rounded-xl bg-white font-bold outline-none focus:border-indigo-500" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required>
                            <option value="">Seleccionar...</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Temporada</label>
                        <input type="number" className="w-full border p-3 rounded-xl font-bold" value={form.season} onChange={e => setForm({...form, season: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Puntos</label>
                        <select className="w-full border p-3 rounded-xl bg-white font-bold" value={form.point_system} onChange={e => setForm({...form, point_system: e.target.value})}>
                            <option value="fivb">FIVB (3,2,1,0)</option>
                            <option value="simple">Simple (2,1)</option>
                        </select>
                    </div>
                 </div>

                 {/* SELECCIÓN DE EQUIPOS */}
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1"><Users size={14}/> Equipos Participantes ({equiposSeleccionados.length})</label>
                        <button type="button" onClick={() => setEquiposSeleccionados([])} className="text-xs text-red-500 font-bold hover:underline">Limpiar</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2">
                        {equiposDisponibles.map(eq => (
                            <label key={eq.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition ${equiposSeleccionados.includes(eq.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                <input type="checkbox" className="hidden" checked={equiposSeleccionados.includes(eq.id)} onChange={() => toggleEquipo(eq.id)}/>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${equiposSeleccionados.includes(eq.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                    {equiposSeleccionados.includes(eq.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                </div>
                                <span className="text-xs font-bold truncate">{eq.name}</span>
                            </label>
                        ))}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModalNuevo(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg">Crear Torneo</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}