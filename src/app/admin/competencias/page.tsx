// src/app/admin/competencias/page.tsx
'use client';

import { useState, useEffect } from 'react';
// AJUSTE DE RUTA: Desde 'admin/competencias' son 3 niveles hasta 'lib'
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { Trophy, Plus, Users, Calendar, Filter, CheckCircle, XCircle } from 'lucide-react';

export default function AdminCompetenciasList() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // --- DATOS PARA EL FORMULARIO ---
  const [categorias, setCategorias] = useState<any[]>([]);
  const [equiposFiltrados, setEquiposFiltrados] = useState<any[]>([]); // Equipos que cumplen requisitos
  const [isSearchingTeams, setIsSearchingTeams] = useState(false);
  
  // --- ESTADO DEL NUEVO TORNEO ---
  const [newTourney, setNewTourney] = useState({
      name: '',
      category_id: '',
      gender: 'Masculino', // Nuevo campo Género
      season: new Date().getFullYear().toString(),
      point_system: 'fivb',
      selected_teams: [] as string[] // IDs de equipos seleccionados
  });

  useEffect(() => {
    fetchTorneos();
    fetchConfigData();
  }, []);

  // --- EFECTO: FILTRO AUTOMÁTICO DE EQUIPOS ---
  // Cada vez que cambia la Categoría o el Género, buscamos equipos aptos
  useEffect(() => {
      if (newTourney.category_id && newTourney.gender) {
          filtrarEquiposPorJugadores();
      } else {
          setEquiposFiltrados([]);
          setNewTourney(prev => ({ ...prev, selected_teams: [] }));
      }
  }, [newTourney.category_id, newTourney.gender]);

  async function fetchTorneos() {
    try {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*, category:categories(name)')
            .order('created_at', { ascending: false });
        if (error) console.error('Error fetching tournaments:', error);
        setTorneos(data || []);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  }

  async function fetchConfigData() {
      // Cargamos categorías
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      setCategorias(cats || []);
  }

  // --- LÓGICA CLAVE: BUSCAR EQUIPOS CON JUGADORES APTOS ---
  async function filtrarEquiposPorJugadores() {
      setIsSearchingTeams(true);
      
      try {
        // Consultamos: Dame los equipos que tengan AL MENOS UN jugador 
        // de la categoría X y el género Y.
        // El "!inner" fuerza a que el equipo TENGA que tener coincidencia en players para aparecer.
        const { data, error } = await supabase
            .from('teams')
            .select(`
                id, 
                name,
                players!inner ( id ) 
            `)
            .eq('players.category_id', newTourney.category_id)
            .eq('players.gender', newTourney.gender); 

        if (error) throw error;

        if (data) {
            // Eliminamos posibles duplicados (aunque Supabase suele agrupar bien por ID de padre)
            // Usamos un Map por ID para asegurar unicidad
            const uniqueTeams = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
            
            // Ordenamos alfabéticamente
            uniqueTeams.sort((a: any, b: any) => a.name.localeCompare(b.name));

            setEquiposFiltrados(uniqueTeams);
            
            // Auto-seleccionar todos los equipos encontrados (UX: Facilitar la vida al admin)
            setNewTourney(prev => ({
                ...prev,
                selected_teams: uniqueTeams.map((t: any) => t.id)
            }));
        }
      } catch (error) {
          console.error("Error filtrando equipos:", error);
          setEquiposFiltrados([]);
      } finally {
          setIsSearchingTeams(false);
      }
  }

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTourney.category_id) return alert("Selecciona una categoría");
      
      // 1. Crear Torneo en la BD
      const { data: torneoCreado, error } = await supabase
          .from('tournaments')
          .insert([{
              name: newTourney.name,
              category_id: newTourney.category_id,
              gender: newTourney.gender, // Guardamos el género seleccionado
              season: newTourney.season,
              point_system: newTourney.point_system,
              status: 'borrador' // Inicia como borrador
          }])
          .select()
          .single();

      if (error) return alert("Error al crear torneo: " + error.message);

      // 2. Inscribir Equipos Automáticamente
      if (newTourney.selected_teams.length > 0) {
          const pivotData = newTourney.selected_teams.map(teamId => ({
              tournament_id: torneoCreado.id,
              team_id: teamId
          }));
          
          const { error: errorPivot } = await supabase
              .from('tournament_teams')
              .insert(pivotData);
              
          if (errorPivot) alert("Torneo creado pero hubo error al inscribir equipos.");
      }

      setModalOpen(false);
      // Reiniciar formulario básico
      setNewTourney({
          name: '', category_id: '', gender: 'Masculino', season: new Date().getFullYear().toString(), point_system: 'fivb', selected_teams: []
      });
      fetchTorneos();
  };

  const toggleTeamSelection = (teamId: string) => {
      setNewTourney(prev => {
          if (prev.selected_teams.includes(teamId)) {
              return { ...prev, selected_teams: prev.selected_teams.filter(id => id !== teamId) };
          } else {
              return { ...prev, selected_teams: [...prev.selected_teams, teamId] };
          }
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800">Competencias</h1>
                <p className="text-slate-500 font-bold">Administra torneos, categorías y participantes.</p>
            </div>
            <button onClick={() => setModalOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition flex items-center gap-2">
                <Plus size={20}/> Nuevo Torneo
            </button>
        </div>

        {/* LISTA TORNEOS */}
        {loading ? (
            <div className="text-center py-20">Cargando competencias...</div>
        ) : torneos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <Trophy size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">No hay torneos creados aún.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {torneos.map((t: any) => (
                    <Link key={t.id} href={`/admin/competencias/${t.id}`}>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition cursor-pointer group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold shadow-sm">
                                        <Trophy size={24}/>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${t.status==='activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {t.status}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition leading-tight">{t.name}</h3>
                                
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                        <Calendar size={14}/> Temp. {t.season}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                        <Users size={14}/> {t.category?.name} • <span className="text-indigo-600">{t.gender}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}

        {/* MODAL CREAR TORNEO */}
        {modalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    
                    {/* Header Modal */}
                    <div className="p-6 md:p-8 border-b border-slate-100 bg-white z-10">
                        <h2 className="text-2xl font-black text-slate-800">Nuevo Torneo</h2>
                        <p className="text-slate-500 text-sm font-medium">Configura los datos base y selecciona los participantes.</p>
                    </div>
                    
                    {/* Cuerpo Scrollable */}
                    <div className="overflow-y-auto p-6 md:p-8 space-y-6">
                        <form id="createForm" onSubmit={handleCreate} className="space-y-6">
                            
                            {/* FILA 1: Nombre y Temporada */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Nombre del Torneo</label>
                                    <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" 
                                        placeholder="Ej: Apertura 2026" 
                                        value={newTourney.name} 
                                        onChange={e => setNewTourney({...newTourney, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Temporada</label>
                                    <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" 
                                        value={newTourney.season} 
                                        onChange={e => setNewTourney({...newTourney, season: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* FILA 2: CATEGORIA Y GÉNERO (FILTROS) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <div>
                                    <label className="block text-xs font-black text-indigo-400 uppercase mb-2 ml-1">Categoría</label>
                                    <select required className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition appearance-none cursor-pointer"
                                        value={newTourney.category_id} 
                                        onChange={e => setNewTourney({...newTourney, category_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-indigo-400 uppercase mb-2 ml-1">Género</label>
                                    <select required className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition appearance-none cursor-pointer"
                                        value={newTourney.gender} 
                                        onChange={e => setNewTourney({...newTourney, gender: e.target.value})}
                                    >
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Sistema de Puntos</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none cursor-pointer"
                                    value={newTourney.point_system} 
                                    onChange={e => setNewTourney({...newTourney, point_system: e.target.value})}
                                >
                                    <option value="fivb">FIVB Oficial (3, 2, 1, 0)</option>
                                    <option value="simple">Simple (Ganador 2pts, Perdedor 1pt)</option>
                                </select>
                            </div>

                            {/* SELECCIÓN DINÁMICA DE EQUIPOS */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                                        <Users size={16} className="text-indigo-500"/> Equipos Habilitados
                                    </h3>
                                    <span className="text-[10px] font-black bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 uppercase tracking-wide">
                                        {isSearchingTeams ? 'Buscando...' : `${equiposFiltrados.length} encontrados`}
                                    </span>
                                </div>

                                <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar bg-slate-50/30">
                                    {/* ESTADOS */}
                                    {!newTourney.category_id ? (
                                        <div className="text-center py-8 px-4">
                                            <Filter className="mx-auto text-slate-300 mb-2" size={24}/>
                                            <p className="text-slate-400 text-xs font-bold">Selecciona una Categoría y Género arriba para buscar equipos automáticamente.</p>
                                        </div>
                                    ) : isSearchingTeams ? (
                                        <div className="text-center py-8 text-indigo-500 font-bold text-xs animate-pulse">Consultando padrón de jugadores...</div>
                                    ) : equiposFiltrados.length === 0 ? (
                                        <div className="text-center py-6 px-4 bg-red-50 m-2 rounded-lg border border-red-100">
                                            <XCircle className="mx-auto text-red-300 mb-2" size={24}/>
                                            <p className="text-red-600 font-bold text-xs">No se encontraron equipos.</p>
                                            <p className="text-red-400 text-[10px] mt-1">Ningún equipo tiene jugadores inscriptos en {categorias.find((c: any) => c.id === newTourney.category_id)?.name} - {newTourney.gender}.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {equiposFiltrados.map((team: any) => {
                                                const isSelected = newTourney.selected_teams.includes(team.id);
                                                return (
                                                    <div key={team.id} 
                                                        onClick={() => toggleTeamSelection(team.id)}
                                                        className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition select-none group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}`}
                                                    >
                                                        <span className="font-bold text-sm truncate">{team.name}</span>
                                                        {isSelected ? 
                                                            <CheckCircle size={18} className="text-white"/> : 
                                                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-indigo-400"></div>
                                                        }
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-400 font-bold text-center">
                                    {newTourney.selected_teams.length} equipos seleccionados para inscribir.
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* Footer Fijo */}
                    <div className="p-6 md:p-8 border-t border-slate-100 bg-white z-10 flex gap-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border-2 border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition uppercase text-xs tracking-wider">Cancelar</button>
                        <button onClick={handleCreate} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition uppercase text-xs tracking-wider flex justify-center items-center gap-2">
                           <Plus size={18}/> Crear Torneo
                        </button>
                    </div>

                </div>
            </div>
        )}

      </div>
    </div>
  );
}