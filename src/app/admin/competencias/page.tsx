'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
        gender: 'Masculino',
        season: new Date().getFullYear().toString(),
        point_system: 'fivb',
        selected_teams: [] as string[]
    });

    const supabase = createClient();

    useEffect(() => {
        fetchTorneos();
        fetchConfigData();
    }, []);

    // --- EFECTO: FILTRO AUTOMÁTICO DE EQUIPOS ---
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
        const { data: cats } = await supabase.from('categories').select('*').order('name');
        setCategorias(cats || []);
    }

    async function filtrarEquiposPorJugadores() {
        setIsSearchingTeams(true);

        try {
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
                const uniqueTeams = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
                uniqueTeams.sort((a: any, b: any) => a.name.localeCompare(b.name));

                setEquiposFiltrados(uniqueTeams);

                // Auto-seleccionar todos por defecto
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

        // 1. Crear Torneo
        const { data: torneoCreado, error } = await supabase
            .from('tournaments')
            .insert([{
                name: newTourney.name,
                category_id: newTourney.category_id,
                gender: newTourney.gender,
                season: newTourney.season,
                point_system: newTourney.point_system,
                status: 'borrador'
            }])
            .select()
            .single();

        if (error) return alert("Error al crear torneo: " + error.message);

        // 2. Inscribir Equipos
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
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-tdf-blue">Competencias</h1>
                    <p className="text-gray-500 font-medium">Administra torneos, categorías y participantes.</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="bg-tdf-orange text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-tdf-orange-hover transition flex items-center gap-2">
                    <Plus size={20} /> Nuevo Torneo
                </button>
            </div>

            {/* LISTA TORNEOS */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : torneos.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-bold">No hay torneos creados aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {torneos.map((t: any) => (
                        <Link key={t.id} href={`/admin/competencias/${t.id}`}>
                            <div className="bg-white p-0 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-tdf-blue transition cursor-pointer group relative overflow-hidden flex flex-col h-full">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-8 -mt-8 z-0"></div>

                                {/* Header Colorido según estado */}
                                <div className={`h-1.5 w-full ${t.status === 'activo' ? 'bg-green-500' : 'bg-gray-300'}`}></div>

                                <div className="p-6 relative z-10 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                                Temp. {t.season}
                                            </span>
                                            <h3 className="text-xl font-black text-gray-800 leading-tight group-hover:text-tdf-blue transition">
                                                {t.name}
                                            </h3>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {t.status}
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-blue-50 text-tdf-blue text-xs font-bold rounded-lg border border-blue-100 uppercase w-full text-center">
                                                {t.category?.name || 'General'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-lg border uppercase w-full text-center ${t.gender === 'Femenino' ? 'bg-pink-50 text-pink-700 border-pink-100' : t.gender === 'Masculino' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                {t.gender || 'Mixto'}
                                            </span>
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
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                        {/* Header Modal */}
                        <div className="p-6 border-b border-gray-100 bg-white z-10">
                            <h2 className="text-2xl font-black text-tdf-blue">Nuevo Torneo</h2>
                            <p className="text-gray-500 text-sm font-medium">Configura los datos base y selecciona los participantes.</p>
                        </div>

                        {/* Cuerpo Scrollable */}
                        <div className="overflow-y-auto p-6 space-y-6">
                            <form id="createForm" onSubmit={handleCreate} className="space-y-6">

                                {/* FILA 1: Nombre y Temporada */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Nombre del Torneo</label>
                                        <input required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-700 outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition"
                                            placeholder="Ej: Apertura 2026"
                                            value={newTourney.name}
                                            onChange={e => setNewTourney({ ...newTourney, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Temporada</label>
                                        <input required type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-700 outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition"
                                            value={newTourney.season}
                                            onChange={e => setNewTourney({ ...newTourney, season: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* FILA 2: CATEGORIA Y GÉNERO (FILTROS) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <div>
                                        <label className="block text-xs font-black text-tdf-blue uppercase mb-2 ml-1">Categoría</label>
                                        <select required className="w-full bg-white border border-blue-200 rounded-lg px-4 py-3 font-bold text-gray-700 outline-none focus:border-tdf-blue transition appearance-none cursor-pointer"
                                            value={newTourney.category_id}
                                            onChange={e => setNewTourney({ ...newTourney, category_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-tdf-blue uppercase mb-2 ml-1">Género</label>
                                        <select required className="w-full bg-white border border-blue-200 rounded-lg px-4 py-3 font-bold text-gray-700 outline-none focus:border-tdf-blue transition appearance-none cursor-pointer"
                                            value={newTourney.gender}
                                            onChange={e => setNewTourney({ ...newTourney, gender: e.target.value })}
                                        >
                                            <option value="Masculino">Masculino</option>
                                            <option value="Femenino">Femenino</option>
                                            <option value="Mixto">Mixto</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Sistema de Puntos</label>
                                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-700 outline-none cursor-pointer"
                                        value={newTourney.point_system}
                                        onChange={e => setNewTourney({ ...newTourney, point_system: e.target.value })}
                                    >
                                        <option value="fivb">FIVB Oficial (3, 2, 1, 0)</option>
                                        <option value="simple">Simple (Ganador 2pts, Perdedor 1pt)</option>
                                    </select>
                                </div>

                                {/* SELECCIÓN DINÁMICA DE EQUIPOS */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase">
                                            <Users size={16} className="text-tdf-blue" /> Equipos Habilitados
                                        </h3>
                                        <span className="text-[10px] font-black bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 uppercase tracking-wide">
                                            {isSearchingTeams ? 'Buscando...' : `${equiposFiltrados.length} encontrados`}
                                        </span>
                                    </div>

                                    <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar bg-gray-50/30">
                                        {/* ESTADOS */}
                                        {!newTourney.category_id ? (
                                            <div className="text-center py-8 px-4">
                                                <Filter className="mx-auto text-gray-300 mb-2" size={24} />
                                                <p className="text-gray-400 text-xs font-bold">Selecciona una Categoría y Género arriba para buscar equipos automáticamente.</p>
                                            </div>
                                        ) : isSearchingTeams ? (
                                            <div className="text-center py-8 text-tdf-blue font-bold text-xs animate-pulse">Consultando padrón de jugadores...</div>
                                        ) : equiposFiltrados.length === 0 ? (
                                            <div className="text-center py-6 px-4 bg-red-50 m-2 rounded-lg border border-red-100">
                                                <XCircle className="mx-auto text-red-300 mb-2" size={24} />
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
                                                            className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition select-none group ${isSelected ? 'bg-tdf-blue border-tdf-blue text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-tdf-blue'}`}
                                                        >
                                                            <span className="font-bold text-sm truncate">{team.name}</span>
                                                            {isSelected ?
                                                                <CheckCircle size={18} className="text-white" /> :
                                                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-tdf-blue"></div>
                                                            }
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-[10px] text-gray-400 font-bold text-center">
                                        {newTourney.selected_teams.length} equipos seleccionados para inscribir.
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Footer Fijo */}
                        <div className="p-6 border-t border-gray-100 bg-white z-10 flex gap-4">
                            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border-2 border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 transition uppercase text-xs tracking-wider">Cancelar</button>
                            <button onClick={handleCreate} className="flex-1 py-4 bg-tdf-orange text-white rounded-lg font-bold shadow-sm hover:bg-tdf-orange-hover transition uppercase text-xs tracking-wider flex justify-center items-center gap-2">
                                <Plus size={18} /> Crear Torneo
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}