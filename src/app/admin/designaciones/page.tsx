'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    Calendar, Clock, MapPin, User, Shield, AlertTriangle, CheckCircle, Search, Filter,
    Eye, Share2, X, ClipboardCheck, ChevronLeft, ChevronRight, Layers, Award
} from 'lucide-react';
import { formatArgentinaDateNumerical, formatArgentinaTimeLiteral } from '@/lib/dateUtils';
import MatchDetailsModal from '@/components/fixture/MatchDetailsModal';

// --- HELPER DE ZONA HORARIA ARGENTINA (ART UTC-3) ---
export function getArgentinaMonthRange(year: number | string, month: number | string) {
    const y = Number(year) || 2026;
    
    if (!month || month === '') {
        return {
            startIso: `${y}-01-01T00:00:00-03:00`,
            endIso: `${y}-12-31T23:59:59-03:00`
        };
    }

    const m = Number(month);
    const startIso = `${y}-${String(m).padStart(2, '0')}-01T00:00:00-03:00`;
    const lastDay = new Date(y, m, 0).getDate();
    const endIso = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59-03:00`;

    return { startIso, endIso };
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const YEARS_LIST = [2025, 2026, 2027, 2028, 2029];

export default function DesignationsPage() {
    const supabase = createClient();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [referees, setReferees] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'pendientes' | 'finalizados'>('pendientes');

    // Selection state
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const [assignments, setAssignments] = useState({
        '1st_referee': '',
        '2nd_referee': '',
        'scorer': '',
        'line_judge': ''
    });

    // Match details state
    const [detailsMatch, setDetailsMatch] = useState<any | null>(null);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedGender, setSelectedGender] = useState<string>('');
    const [selectedReferee, setSelectedReferee] = useState<string>('');
    
    // Mes actual por defecto (1-indexed) y Año 2026
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>('2026');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [assignmentStatus, setAssignmentStatus] = useState<'all' | 'unassigned' | 'assigned'>('all');

    // Paginación server-side
    const [page, setPage] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(0);

    // Listas independientes de opciones para filtros
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [allTeams, setAllTeams] = useState<any[]>([]);

    const pageSize = 50;

    // Cargar listas completas para los desplegables de filtros de forma independiente
    useEffect(() => {
        async function fetchFilterOptions() {
            try {
                const [catRes, teamRes, refRes] = await Promise.all([
                    supabase.from('categories').select('id, name').order('name'),
                    supabase.from('teams').select('id, name').order('name'),
                    supabase.from('referees').select(`
                        id,
                        category,
                        profile:profiles(id, full_name),
                        referee_restrictions(restricted_team_id)
                    `)
                ]);

                if (catRes.data) setAllCategories(catRes.data);
                if (teamRes.data) setAllTeams(teamRes.data);
                if (refRes.data) setReferees(refRes.data);
            } catch (err) {
                console.error("Error al cargar opciones de filtro:", err);
            }
        }
        fetchFilterOptions();
    }, [supabase]);

    // Resetear a página 1 ante cambios en pestaña o cualquier filtro
    useEffect(() => {
        setPage(1);
    }, [activeTab, selectedCategory, selectedTeam, selectedGender, selectedReferee, selectedMonth, selectedYear, sortOrder, assignmentStatus]);

    const fetchMatches = useCallback(async () => {
        setLoading(true);

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Configuración dinámica de !inner joins en Supabase PostgREST
        const tournamentSelect = selectedGender 
            ? 'tournament:tournaments!inner!tournament_id(id, name, gender, season)' 
            : 'tournament:tournaments!tournament_id(id, name, gender, season)';

        const officialsSelect = selectedReferee
            ? 'match_officials!inner(id, role, status, user_id, profile:profiles(full_name))'
            : 'match_officials(id, role, status, user_id, profile:profiles(full_name))';

        let query = supabase
            .from('matches')
            .select(`
                *,
                home_team:teams!home_team_id(id, name, shield_url),
                away_team:teams!away_team_id(id, name, shield_url),
                category:categories(id, name),
                ${tournamentSelect},
                ${officialsSelect}
            `, { count: 'exact' });

        // 1. Pestaña Pendientes vs Finalizados
        if (activeTab === 'pendientes') {
            query = query.neq('status', 'finalizado').neq('sheet_status', 'submitted');
        } else {
            query = query.or('status.eq.finalizado,sheet_status.eq.submitted');
        }

        // 2. Filtro por Club / Equipo (Bidireccional)
        if (selectedTeam) {
            query = query.or(`home_team_id.eq.${selectedTeam},away_team_id.eq.${selectedTeam}`);
        }

        // 3. Filtro por Categoría
        if (selectedCategory) {
            query = query.eq('category_id', selectedCategory);
        }

        // 4. Filtro por Género / Rama
        if (selectedGender) {
            query = query.eq('tournament.gender', selectedGender);
        }

        // 5. Filtro por Árbitro / Oficial
        if (selectedReferee) {
            query = query.eq('match_officials.user_id', selectedReferee);
        }

        // 6. Rango de Fechas con Huso Horario Seguro (ART UTC-3)
        if (selectedMonth !== '') {
            const { startIso, endIso } = getArgentinaMonthRange(selectedYear, selectedMonth);
            query = query.gte('scheduled_time', startIso).lte('scheduled_time', endIso);
        }

        // 7. Ordenamiento (nullsFirst prioritario en Pendientes para partidos sin asignar fecha)
        const isAscending = sortOrder === 'asc';
        const nullsFirstOption = activeTab === 'pendientes';
        query = query.order('scheduled_time', { ascending: isAscending, nullsFirst: nullsFirstOption });

        // 8. Paginación Server-Side (50 por página)
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) {
            console.error("Error al cargar partidos de designaciones:", error);
        } else {
            setMatches(data || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    }, [supabase, activeTab, selectedCategory, selectedTeam, selectedGender, selectedReferee, selectedMonth, selectedYear, sortOrder, page]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    // Filtrado secundario rápido por Cobertura Arbitral en cliente sobre la página actual
    const displayedMatches = matches.filter(match => {
        const has1stRef = match.match_officials?.some((mo: any) => mo.role === '1st_referee');
        if (assignmentStatus === 'unassigned') return !has1stRef;
        if (assignmentStatus === 'assigned') return has1stRef;
        return true;
    });

    // Métricas de cobertura en vivo sobre la lista recibida
    const fullyAssignedCount = matches.filter(m => {
        const roles = m.match_officials?.map((mo: any) => mo.role) || [];
        return roles.includes('1st_referee') && (roles.includes('scorer') || roles.includes('2nd_referee'));
    }).length;

    const partiallyAssignedCount = matches.filter(m => {
        const roles = m.match_officials?.map((mo: any) => mo.role) || [];
        return roles.includes('1st_referee') && !roles.includes('scorer') && !roles.includes('2nd_referee');
    }).length;

    const unassignedCount = matches.filter(m => {
        const roles = m.match_officials?.map((mo: any) => mo.role) || [];
        return !roles.includes('1st_referee');
    }).length;

    // Incompatibilidades para el modal de asignación
    function getAvailableReferees(match: any) {
        if (!match) return [];
        return referees.filter(ref => {
            const restrictions = ref.referee_restrictions?.map((r: any) => r.restricted_team_id) || [];
            const isRestricted = restrictions.includes(match.home_team_id) || restrictions.includes(match.away_team_id);
            return !isRestricted;
        });
    }

    function openAssignmentModal(match: any) {
        setSelectedMatch(match);
        setAssignments({
            '1st_referee': match.match_officials?.find((m: any) => m.role === '1st_referee')?.user_id || '',
            '2nd_referee': match.match_officials?.find((m: any) => m.role === '2nd_referee')?.user_id || '',
            'scorer': match.match_officials?.find((m: any) => m.role === 'scorer')?.user_id || '',
            'line_judge': match.match_officials?.find((m: any) => m.role === 'line_judge')?.user_id || '',
        });
    }

    async function saveAssignments(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedMatch) return;

        const roles = ['1st_referee', '2nd_referee', 'scorer', 'line_judge'];

        for (const role of roles) {
            // @ts-ignore
            const refereeId = assignments[role];
            const existing = selectedMatch.match_officials?.find((mo: any) => mo.role === role);

            if (refereeId) {
                const { error } = await supabase.from('match_officials').upsert({
                    match_id: selectedMatch.id,
                    role: role,
                    user_id: refereeId,
                    status: 'assigned'
                }, { onConflict: 'match_id, role' });

                if (error) console.error('Error al asignar ' + role, error);
            } else if (existing) {
                await supabase.from('match_officials').delete().eq('id', existing.id);
            }
        }

        setSelectedMatch(null);
        fetchMatches();
    }

    const availableReferees = getAvailableReferees(selectedMatch);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const fromDisplay = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const toDisplay = Math.min(page * pageSize, totalCount);

    const handleClearFilters = () => {
        setSelectedCategory('');
        setSelectedTeam('');
        setSelectedGender('');
        setSelectedReferee('');
        setSelectedMonth(String(currentDate.getMonth() + 1));
        setSelectedYear('2026');
        setSortOrder('desc');
        setAssignmentStatus('all');
    };

    const isFilterActive = selectedCategory || selectedTeam || selectedGender || selectedReferee || selectedMonth !== String(currentDate.getMonth() + 1) || selectedYear !== '2026' || assignmentStatus !== 'all';

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black">
            <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-tdf-blue" />
                        Designaciones Arbitrales
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestión y asignación de cuerpo arbitral para competencias oficiales FVF.</p>
                </div>

                {/* Badges de Cobertura en Vivo */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                        <span>🏐 {totalCount} Partidos</span>
                    </div>
                    {activeTab === 'pendientes' && (
                        <>
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5" title="1° Árbitro y Anotador completos">
                                <span>🟢 {fullyAssignedCount} Listos</span>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5" title="Falta Anotador o 2° Árbitro">
                                <span>🟡 {partiallyAssignedCount} Parcial</span>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5" title="Sin Árbitro designado">
                                <span>🔴 {unassignedCount} Sin Árbitro</span>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* TAB SYSTEM */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 mb-6 relative">
                <button
                    onClick={() => setActiveTab('pendientes')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors relative z-10 ${activeTab === 'pendientes' ? 'text-tdf-blue flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-2'}`}
                >
                    <Clock size={16} /> Pendientes
                    {activeTab === 'pendientes' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-tdf-blue rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('finalizados')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors relative z-10 ${activeTab === 'finalizados' ? 'text-green-500 flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-2'}`}
                >
                    <CheckCircle size={16} /> Finalizados
                    {activeTab === 'finalizados' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 rounded-t-full"></div>}
                </button>
            </div>

            {/* FILTROS ESCALABLES (7 SELECTORES) */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
                        <Filter size={16} className="text-tdf-blue" />
                        <span>Filtros de Búsqueda Avanzada</span>
                    </div>

                    {/* Filtro Rápido de Cobertura */}
                    {activeTab === 'pendientes' && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 self-start sm:self-auto">
                            <button
                                onClick={() => setAssignmentStatus('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${assignmentStatus === 'all' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setAssignmentStatus('unassigned')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${assignmentStatus === 'unassigned' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-red-400'}`}
                            >
                                Sin Árbitro
                            </button>
                            <button
                                onClick={() => setAssignmentStatus('assigned')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${assignmentStatus === 'assigned' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-emerald-400'}`}
                            >
                                Designados
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {/* 1. Club */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Club / Equipo</label>
                        <select
                            value={selectedTeam}
                            onChange={e => setSelectedTeam(e.target.value)}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todos los clubes</option>
                            {allTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Género / Rama */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Género / Rama</label>
                        <select
                            value={selectedGender}
                            onChange={e => setSelectedGender(e.target.value)}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todos los géneros</option>
                            <option value="femenino">Femenino</option>
                            <option value="masculino">Masculino</option>
                            <option value="mixto">Mixto</option>
                        </select>
                    </div>

                    {/* 3. Categoría */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Categoría</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todas las categorías</option>
                            {allCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Árbitro */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Árbitro / Oficial</label>
                        <select
                            value={selectedReferee}
                            onChange={e => setSelectedReferee(e.target.value)}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todos los árbitros</option>
                            {referees.map(r => (
                                <option key={r.id} value={r.profile?.id || r.id}>
                                    {r.profile?.full_name || `Árbitro #${r.id.slice(0, 4)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 5. Mes */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Mes</label>
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todos los meses</option>
                            {MONTH_NAMES.map((name, idx) => (
                                <option key={idx} value={String(idx + 1)}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 6. Año */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Año</label>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            {YEARS_LIST.map(y => (
                                <option key={y} value={String(y)}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* 7. Ordenamiento */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Orden por Fecha</label>
                        <select
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
                            className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="desc">Más reciente primero</option>
                            <option value="asc">Más viejo primero</option>
                        </select>
                    </div>
                </div>

                {/* Limpiar Filtros */}
                {isFilterActive && (
                    <div className="flex justify-end mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <button
                            onClick={handleClearFilters}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 transition px-3 py-1 bg-red-500/10 rounded-lg"
                        >
                            <X size={14} /> Limpiar Filtros
                        </button>
                    </div>
                )}
            </div>

            {/* LISTADO DE PARTIDOS */}
            {loading ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm animate-pulse">
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Cargando designaciones arbitrales...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {displayedMatches.map(match => {
                        const officials = match.match_officials || [];
                        const ref1 = officials.find((mo: any) => mo.role === '1st_referee');
                        const ref2 = officials.find((mo: any) => mo.role === '2nd_referee');
                        const scorer = officials.find((mo: any) => mo.role === 'scorer');

                        const genderName = match.tournament?.gender ? match.tournament.gender.toUpperCase() : null;

                        return (
                            <div key={match.id} className="bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 hover:border-zinc-700 transition group">

                                {/* Match Info */}
                                <div className="flex-1 w-full">
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                                        <span className="bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-zinc-300 font-black">
                                            {match.category?.name || 'Categoría'}
                                        </span>
                                        {genderName && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${genderName === 'FEMENINO' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : genderName === 'MASCULINO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                {genderName}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} /> {match.scheduled_time ? formatArgentinaDateNumerical(match.scheduled_time) : 'Sin Fecha'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {match.scheduled_time ? formatArgentinaTimeLiteral(match.scheduled_time) : '--:--'} hs
                                        </span>
                                    </div>

                                    {/* Equipos */}
                                    <div className="flex items-center gap-3 mt-2 w-full justify-between overflow-hidden">
                                        <div className="flex items-center justify-end gap-3 text-right flex-1 min-w-0">
                                            <div className="truncate font-black text-slate-800 dark:text-white text-base md:text-lg">{match.home_team?.name || 'Local'}</div>
                                            {match.home_team?.shield_url && (
                                                <img src={match.home_team.shield_url} className="w-7 h-7 object-contain shrink-0" alt="" />
                                            )}
                                        </div>
                                        
                                        <div className="text-slate-300 font-black shrink-0 px-2 text-sm">VS</div>
                                        
                                        <div className="flex items-center justify-start gap-3 text-left flex-1 min-w-0">
                                            {match.away_team?.shield_url && (
                                                <img src={match.away_team.shield_url} className="w-7 h-7 object-contain shrink-0" alt="" />
                                            )}
                                            <div className="truncate font-black text-slate-800 dark:text-white text-base md:text-lg">{match.away_team?.name || 'Visita'}</div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2 flex items-center gap-1">
                                        <MapPin size={13} className="text-slate-400" /> {match.court_name || 'Cancha a confirmar'}
                                    </div>
                                </div>

                                {/* Preview de Designación Arbitral */}
                                <div className="flex items-center gap-3 shrink-0">
                                    {ref1 ? (
                                        <div className="flex flex-col gap-1 text-right">
                                            <div className="text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center justify-end gap-1.5">
                                                <User size={13} className="text-emerald-500" />
                                                <span>1° {ref1.profile?.full_name || 'Designado'}</span>
                                            </div>
                                            {scorer && (
                                                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-end gap-1">
                                                    <span>Anotador: {scorer.profile?.full_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={14} /> Sin Designar
                                        </span>
                                    )}
                                </div>

                                {/* Botón de Acción */}
                                <div className="shrink-0">
                                    {match.status === 'finalizado' || match.sheet_status === 'submitted' ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl font-bold text-xs">
                                                <CheckCircle size={14} /> Finalizado
                                            </div>
                                            <button
                                                onClick={() => setDetailsMatch(match)}
                                                className="p-2 bg-slate-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-xl transition"
                                                title="Ver Detalles del Partido"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openAssignmentModal(match)}
                                            className="bg-tdf-blue hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-1.5"
                                        >
                                            <Shield size={14} /> Designar Terna
                                        </button>
                                    )}
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sin Resultados */}
            {displayedMatches.length === 0 && !loading && (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-800">
                    <Shield size={40} className="mx-auto text-slate-300 dark:text-zinc-700 mb-3" />
                    <p className="text-slate-500 dark:text-zinc-400 font-bold">No se encontraron partidos con los filtros aplicados.</p>
                    {isFilterActive && (
                        <button 
                            onClick={handleClearFilters} 
                            className="mt-4 text-tdf-blue font-bold text-xs hover:underline inline-flex items-center gap-1"
                        >
                            <X size={14} /> Limpiar todos los filtros
                        </button>
                    )}
                </div>
            )}

            {/* BARRA INFERIOR DE PAGINACIÓN SERVER-SIDE (0-SAFE) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                    {totalCount === 0 
                        ? 'Sin partidos para los filtros seleccionados' 
                        : `Mostrando ${fromDisplay} - ${toDisplay} de ${totalCount} partidos`}
                </span>
                
                <div className="flex items-center gap-2">
                    <button
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center gap-1"
                    >
                        <ChevronLeft size={14} /> Anterior
                    </button>
                    <span className="text-xs font-black text-slate-700 dark:text-white px-3">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center gap-1"
                    >
                        Siguiente <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* MODAL DE DESIGNACIÓN DE TERNA ARBITRAL */}
            {selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={saveAssignments} className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-zinc-800 space-y-5 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-tdf-blue/10 border border-tdf-blue/20 flex items-center justify-center text-tdf-blue">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Designación de Terna</h3>
                                    <span className="text-xs font-bold text-slate-400 dark:text-zinc-400 block">{selectedMatch.home_team?.name} vs {selectedMatch.away_team?.name}</span>
                                </div>
                            </div>
                            <button type="button" onClick={() => setSelectedMatch(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-white flex items-center justify-center transition">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* 1st Referee */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">1° Árbitro Principal</label>
                                <select
                                    className="w-full text-xs font-bold p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-slate-700 dark:text-white outline-none focus:border-tdf-blue transition"
                                    value={assignments['1st_referee']}
                                    onChange={e => setAssignments({ ...assignments, '1st_referee': e.target.value })}
                                >
                                    <option value="">Seleccionar 1° Árbitro...</option>
                                    {availableReferees.map(r => (
                                        <option key={r.id} value={r.profile?.id}>
                                            {r.profile?.full_name} ({r.category || 'Oficial'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2nd Referee */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">2° Árbitro Asistente</label>
                                <select
                                    className="w-full text-xs font-bold p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-slate-700 dark:text-white outline-none focus:border-tdf-blue transition"
                                    value={assignments['2nd_referee']}
                                    onChange={e => setAssignments({ ...assignments, '2nd_referee': e.target.value })}
                                >
                                    <option value="">Seleccionar 2° Árbitro (Opcional)...</option>
                                    {availableReferees.map(r => (
                                        <option key={r.id} value={r.profile?.id}>
                                            {r.profile?.full_name} ({r.category || 'Oficial'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Scorer */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Apuntador / Planillero</label>
                                <select
                                    className="w-full text-xs font-bold p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-slate-700 dark:text-white outline-none focus:border-tdf-blue transition"
                                    value={assignments['scorer']}
                                    onChange={e => setAssignments({ ...assignments, 'scorer': e.target.value })}
                                >
                                    <option value="">Seleccionar Apuntador...</option>
                                    {availableReferees.map(r => (
                                        <option key={r.id} value={r.profile?.id}>
                                            {r.profile?.full_name} ({r.category || 'Oficial'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Linesman */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Juez de Línea</label>
                                <select
                                    className="w-full text-xs font-bold p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-slate-700 dark:text-white outline-none focus:border-tdf-blue transition"
                                    value={assignments['line_judge']}
                                    onChange={e => setAssignments({ ...assignments, 'line_judge': e.target.value })}
                                >
                                    <option value="">Seleccionar Juez de Línea (Opcional)...</option>
                                    {availableReferees.map(r => (
                                        <option key={r.id} value={r.profile?.id}>
                                            {r.profile?.full_name} ({r.category || 'Oficial'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                            <button 
                                type="button" 
                                onClick={() => setSelectedMatch(null)} 
                                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold text-xs transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="px-5 py-2.5 rounded-xl bg-tdf-blue hover:bg-blue-600 text-white font-bold text-xs transition shadow-md"
                            >
                                Guardar Designación
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal de Detalles del Partido */}
            {detailsMatch && (
                <MatchDetailsModal 
                    matchId={detailsMatch.id} 
                    onClose={() => setDetailsMatch(null)} 
                />
            )}
        </div>
    );
}
