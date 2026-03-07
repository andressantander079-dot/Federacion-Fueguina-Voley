'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Trophy, Plus, Users, Calendar, Filter, CheckCircle, XCircle, Trash2, Archive, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

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
        city: 'Todas',
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
    }, [newTourney.category_id, newTourney.gender, newTourney.city]);

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
            // STEP 1: Fetch Squads (Planteles) for this Category AND Gender
            const { data: squadsData, error: squadsError } = await supabase
                .from('squads')
                .select('id, name, team_id') // No join here to avoid errors
                .eq('category_id', newTourney.category_id)
                .eq('gender', newTourney.gender);

            if (squadsError) {
                console.error("Error fetching squads:", squadsError);
                throw squadsError;
            }

            if (squadsData && squadsData.length > 0) {
                // STEP 2: Fetch related Clubs (Teams) manually
                const teamIds = Array.from(new Set(squadsData.map((s: any) => s.team_id))).filter(Boolean);

                let teamsMap = new Map();

                if (teamIds.length > 0) {
                    let query = supabase.from('teams').select('id, name, city').in('id', teamIds);
                    if (newTourney.city !== 'Todas') {
                        query = query.eq('city', newTourney.city);
                    }
                    const { data: teamsData, error: teamsError } = await query;

                    if (teamsError) {
                        console.error("Error fetching teams details:", teamsError);
                    } else {
                        teamsMap = new Map(teamsData?.map((t: any) => [t.id, t]) || []);
                    }
                }

                // STEP 3: Combine Data
                const combinedData = squadsData
                    .map((s: any) => ({
                        ...s,
                        teams: teamsMap.get(s.team_id) || null
                    }))
                    .filter((s: any) => s.teams !== null); // Discard squads if their team didn't match the city filter

                // Sort by Club Name then Squad Name
                const sortedSquads = combinedData.sort((a: any, b: any) => {
                    const clubA = a.teams?.name || '';
                    const clubB = b.teams?.name || '';
                    return clubA.localeCompare(clubB) || a.name.localeCompare(b.name);
                });

                setEquiposFiltrados(sortedSquads);

                // Auto-select all by default
                setNewTourney(prev => ({
                    ...prev,
                    selected_teams: sortedSquads.map((t: any) => t.id)
                }));
            } else {
                setEquiposFiltrados([]);
            }
        } catch (error) {
            console.error("Error filtrando planteles (Catch):", error);
            setEquiposFiltrados([]);
        } finally {
            setIsSearchingTeams(false);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTourney.category_id) return toast.error("Selecciona una categoría");

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

        if (error) return toast.error("Error al crear torneo: " + error.message);

        // 2. Inscribir Equipos (Planteles)
        if (newTourney.selected_teams.length > 0) {
            // selected_teams array contains Squad IDs now
            // We need to map them to { tournament_id, team_id, squad_id }
            // Note: We need to find the team_id for each squad_id from 'equiposFiltrados'

            const pivotData = newTourney.selected_teams.map(squadId => {
                const squad = equiposFiltrados.find(sq => sq.id === squadId);
                return {
                    tournament_id: torneoCreado.id,
                    team_id: squad?.team_id, // Club ID
                    squad_id: squadId        // Plantel ID (New Column)
                };
            }).filter(item => item.team_id); // Ensure we found the club

            const { error: errorPivot } = await supabase
                .from('tournament_teams')
                .insert(pivotData);

            if (errorPivot) {
                console.error("Error pivot:", errorPivot);
                toast.error("Torneo creado pero hubo error al inscribir equipos (DB Schema?).\n" + errorPivot.message);
            } else {
                toast.success("Torneo creado y equipos inscritos correctamente.");
            }
        } else {
            toast.success("Torneo creado sin equipos inscritos.");
        }

        setModalOpen(false);
        setNewTourney({
            name: '', category_id: '', gender: 'Masculino', season: new Date().getFullYear().toString(), point_system: 'fivb', city: 'Todas', selected_teams: []
        });
        fetchTorneos();
    };

    async function handleDelete(id: string) {
        if (!confirm("⚠️ ¿Estás seguro de ELIMINAR este torneo?\nEsto borrará todos los partidos, tablas y estadísticas asociadas.\nNo se puede deshacer.")) return;

        const { error } = await supabase.from('tournaments').delete().eq('id', id);
        if (error) {
            toast.error("Error al eliminar: " + error.message);
        } else {
            setTorneos(prev => prev.filter(t => t.id !== id));
            toast.success("Torneo eliminado correctamente.");
        }
    }

    async function handleArchive(id: string, currentStatus: string) {
        const newStatus = currentStatus === 'archivado' ? 'borrador' : 'archivado'; // Restore to 'borrador' safer than 'activo'
        const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', id);
        if (error) {
            alert("Error al actualizar estado: " + error.message);
        } else {
            fetchTorneos();
        }
    }

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
        <div className="space-y-6 text-white">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-800">
                <div>
                    <h1 className="text-3xl font-black text-white">Competencias</h1>
                    <p className="text-zinc-400 font-medium">Administra torneos, categorías y participantes.</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="bg-tdf-orange text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-tdf-orange-hover transition flex items-center gap-2">
                    <Plus size={20} /> Nuevo Torneo
                </button>
            </div>

            {/* LISTA TORNEOS */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-48 bg-zinc-900 rounded-xl animate-pulse border border-zinc-800"></div>
                    ))}
                </div>
            ) : torneos.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900 rounded-xl border border-dashed border-zinc-800">
                    <Trophy size={48} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-bold">No hay torneos creados aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {torneos.map((t: any) => (
                        <div key={t.id} className="relative group">
                            <Link href={`/admin/competencias/${t.id}`}>
                                <div className={`bg-zinc-900 p-0 rounded-xl shadow-sm border border-zinc-800 hover:shadow-md hover:border-tdf-blue transition cursor-pointer relative overflow-hidden flex flex-col h-full ${t.status === 'archivado' ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-800/50 rounded-bl-full -mr-8 -mt-8 z-0"></div>

                                    {/* Header Colorido según estado */}
                                    <div className={`h-1.5 w-full ${t.status === 'activo' ? 'bg-green-500' : t.status === 'archivado' ? 'bg-zinc-500' : 'bg-yellow-500'}`}></div>

                                    <div className="p-6 relative z-10 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                                                    Temp. {t.season}
                                                </span>
                                                <h3 className="text-xl font-black text-white leading-tight group-hover:text-tdf-blue transition">
                                                    {t.name}
                                                </h3>
                                            </div>
                                            {t.status !== 'borrador' && (
                                                <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.status === 'activo' ? 'bg-green-500/10 text-green-500' : t.status === 'archivado' ? 'bg-zinc-800 text-zinc-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                    {t.status}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-zinc-950 text-zinc-400 text-xs font-bold rounded-lg border border-zinc-800 uppercase w-full text-center">
                                                    {t.category?.name || 'General'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg border uppercase w-full text-center ${t.gender === 'Femenino' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : t.gender === 'Masculino' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}`}>
                                                    {t.gender || 'Mixto'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>

                            {/* Acciones Rápidas (Floating fuera del Link) */}
                            <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.preventDefault(); handleArchive(t.id, t.status); }}
                                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full border border-zinc-700 shadow-lg"
                                    title={t.status === 'archivado' ? "Restaurar" : "Archivar"}
                                >
                                    {t.status === 'archivado' ? <RefreshCcw size={14} /> : <Archive size={14} />}
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleDelete(t.id); }}
                                    className="p-2 bg-zinc-900 text-red-400 hover:text-red-500 hover:bg-red-900/30 rounded-full border border-zinc-700 shadow-lg"
                                    title="Eliminar Torneo"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL CREAR TORNEO */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                        {/* Header Modal */}
                        <div className="p-6 border-b border-zinc-800 bg-zinc-900 z-10">
                            <h2 className="text-2xl font-black text-white">Nuevo Torneo</h2>
                            <p className="text-zinc-500 text-sm font-medium">Configura los datos base y selecciona los participantes.</p>
                        </div>

                        {/* Cuerpo Scrollable */}
                        <div className="overflow-y-auto p-6 space-y-6">
                            <form id="createForm" onSubmit={handleCreate} className="space-y-6">

                                {/* FILA 1: Nombre y Temporada */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-zinc-500 uppercase mb-2 ml-1">Nombre del Torneo</label>
                                        <input required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 font-bold text-white outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition placeholder-zinc-700"
                                            placeholder="Ej: Apertura 2026"
                                            value={newTourney.name}
                                            onChange={e => setNewTourney({ ...newTourney, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-zinc-500 uppercase mb-2 ml-1">Temporada</label>
                                        <input required type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 font-bold text-white outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition"
                                            value={newTourney.season}
                                            onChange={e => setNewTourney({ ...newTourney, season: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* FILA 2: CATEGORIA, GÉNERO Y CIUDAD (FILTROS) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                    <div>
                                        <label className="block text-xs font-black text-zinc-400 uppercase mb-2 ml-1">Categoría</label>
                                        <select required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 font-bold text-white outline-none focus:border-tdf-blue transition appearance-none cursor-pointer"
                                            value={newTourney.category_id}
                                            onChange={e => setNewTourney({ ...newTourney, category_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-zinc-400 uppercase mb-2 ml-1">Género</label>
                                        <select required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 font-bold text-white outline-none focus:border-tdf-blue transition appearance-none cursor-pointer"
                                            value={newTourney.gender}
                                            onChange={e => setNewTourney({ ...newTourney, gender: e.target.value })}
                                        >
                                            <option value="Masculino">Masculino</option>
                                            <option value="Femenino">Femenino</option>
                                            <option value="Mixto">Mixto</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-zinc-400 uppercase mb-2 ml-1">Filtro de Ciudad</label>
                                        <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 font-bold text-white outline-none focus:border-tdf-blue transition appearance-none cursor-pointer"
                                            value={newTourney.city}
                                            onChange={e => setNewTourney({ ...newTourney, city: e.target.value })}
                                        >
                                            <option value="Todas">Todas las ciudades</option>
                                            <option value="Ushuaia">Ushuaia</option>
                                            <option value="Río Grande">Río Grande</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-zinc-500 uppercase mb-2 ml-1">Sistema de Puntos</label>
                                    <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 font-bold text-white outline-none cursor-pointer"
                                        value={newTourney.point_system}
                                        onChange={e => setNewTourney({ ...newTourney, point_system: e.target.value })}
                                    >
                                        <option value="fivb">FIVB Oficial (3, 2, 1, 0)</option>
                                        <option value="simple">Simple (Ganador 2pts, Perdedor 1pt)</option>
                                    </select>
                                </div>

                                {/* SELECCIÓN DINÁMICA DE EQUIPOS */}
                                <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-sm">
                                    <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                                        <h3 className="font-bold text-zinc-300 flex items-center gap-2 text-sm uppercase">
                                            <Users size={16} className="text-tdf-blue" /> Equipos Habilitados
                                        </h3>
                                        <span className="text-[10px] font-black bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-zinc-500 uppercase tracking-wide">
                                            {isSearchingTeams ? 'Buscando...' : `${equiposFiltrados.length} encontrados`}
                                        </span>
                                    </div>

                                    <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar bg-black/20">
                                        {/* ESTADOS */}
                                        {!newTourney.category_id ? (
                                            <div className="text-center py-8 px-4">
                                                <Filter className="mx-auto text-zinc-700 mb-2" size={24} />
                                                <p className="text-zinc-600 text-xs font-bold">Selecciona una Categoría para buscar.</p>
                                            </div>
                                        ) : isSearchingTeams ? (
                                            <div className="text-center py-8 text-tdf-blue font-bold text-xs animate-pulse">Consultando padrón...</div>
                                        ) : equiposFiltrados.length === 0 ? (
                                            <div className="text-center py-6 px-4 bg-red-500/10 m-2 rounded-lg border border-red-500/20">
                                                <XCircle className="mx-auto text-red-500/50 mb-2" size={24} />
                                                <p className="text-red-400 font-bold text-xs">No se encontraron equipos.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {equiposFiltrados.map((team: any) => {
                                                    const isSelected = newTourney.selected_teams.includes(team.id);
                                                    return (
                                                        <div key={team.id}
                                                            onClick={() => toggleTeamSelection(team.id)}
                                                            className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition select-none group ${isSelected ? 'bg-tdf-blue border-tdf-blue text-white shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-tdf-blue'}`}
                                                        >
                                                            <div className="flex flex-col text-left">
                                                                <span className="font-bold text-sm truncate text-white">{team.teams?.name || 'Club Desconocido'}</span>
                                                                <span className="text-xs text-zinc-500 font-mono">{team.name}</span>
                                                            </div>
                                                            {isSelected ?
                                                                <CheckCircle size={18} className="text-white" /> :
                                                                <div className="w-4 h-4 rounded-full border-2 border-zinc-700 group-hover:border-tdf-blue"></div>
                                                            }
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-zinc-900 px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-500 font-bold text-center">
                                        {newTourney.selected_teams.length} equipos seleccionados.
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Footer Fijo */}
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900 z-10 flex gap-4">
                            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border-2 border-zinc-800 rounded-lg font-bold text-zinc-400 hover:bg-zinc-800 transition uppercase text-xs tracking-wider">Cancelar</button>
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