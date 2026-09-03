'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Clock, Trophy, CalendarDays, Loader2, Eye, CheckCircle } from 'lucide-react';
import { formatArgentinaDateLiteral } from '@/lib/dateUtils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import MatchDetailsModal from '@/components/fixture/MatchDetailsModal';

// --- TIPOS ESTRICTOS Y HELPERS DE HUSO HORARIO (USHUAIA ART UTC-3) ---
export type StandardRefereeRole = '1st_referee' | '2nd_referee' | 'scorer' | 'line_judge';

export interface TeamRef {
    id: string;
    name: string;
    shield_url?: string | null;
}

export interface TournamentRef {
    id: string;
    name: string;
    gender?: string | null;
    category?: CategoryRef | null;
}

export interface CategoryRef {
    name: string;
}

export interface MatchDataRef {
    id: string;
    scheduled_time: string;
    status: string;
    court_name?: string | null;
    referee_id?: string | null;
    sheet_data?: Record<string, unknown> | null;
    home?: TeamRef | null;
    away?: TeamRef | null;
    category?: CategoryRef | null;
    tournament?: TournamentRef | null;
}

export interface OfficialAssignmentRecord {
    id: string;
    role: StandardRefereeRole;
    match: MatchDataRef;
}

export function getArgentinaDateStr(dateInput?: string | Date | null): string {
    if (!dateInput) return '';
    try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput.slice(0, 10) : '';
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Ushuaia' }).format(d);
    } catch {
        return typeof dateInput === 'string' ? dateInput.slice(0, 10) : '';
    }
}

export function getArgentinaYearMonthStr(dateInput?: string | Date | null): string {
    const fullDate = getArgentinaDateStr(dateInput);
    return fullDate ? fullDate.slice(0, 7) : '';
}

export function normalizeRefereeRole(rawRole?: string | null): StandardRefereeRole {
    if (!rawRole) return '1st_referee';
    const lower = rawRole.toLowerCase().trim();
    if (lower === '1st_referee' || lower === 'first_referee' || lower === 'ref1' || lower === '1er_arbitro') {
        return '1st_referee';
    }
    if (lower === '2nd_referee' || lower === 'second_referee' || lower === 'ref2' || lower === '2do_arbitro') {
        return '2nd_referee';
    }
    if (lower === 'scorer' || lower === 'anotador' || lower === 'planillero' || lower === 'apuntador') {
        return 'scorer';
    }
    if (lower === 'line_judge' || lower === 'juez_de_linea') {
        return 'line_judge';
    }
    return '1st_referee';
}

function MatchDetailsHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const matchId = searchParams.get('match_details');

    if (!matchId) return null;
    return <MatchDetailsModal matchId={matchId} onClose={() => router.push(pathname, { scroll: false })} />;
}

export function getEffectiveRoleForMatch(
    userId: string,
    match: MatchDataRef,
    fallbackRole?: StandardRefereeRole
): StandardRefereeRole {
    const staff = (match.sheet_data?.staff || {}) as Record<string, string>;
    const ref1Sheet = staff.ref1;
    const ref2Sheet = staff.ref2;
    const scorerSheet = staff.scorer;
    const linesmanSheet = staff.linesman;
    const refereeIdMatch = match.referee_id;

    if (ref1Sheet === userId || (refereeIdMatch === userId && !ref1Sheet)) {
        return '1st_referee';
    }
    if (ref2Sheet === userId) {
        return '2nd_referee';
    }
    if (scorerSheet === userId) {
        return 'scorer';
    }
    if (linesmanSheet === userId) {
        return 'line_judge';
    }

    return fallbackRole || '1st_referee';
}

export default function RefereeReportsPage() {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('all-2026');
    const [allData, setAllData] = useState<OfficialAssignmentRecord[]>([]);

    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedGender, setSelectedGender] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch de designaciones oficial de match_officials filtrado por user_id
        const { data: officialsData } = await supabase
            .from('match_officials')
            .select(`
                id, role, status,
                match:matches (
                    id, scheduled_time, status, court_name, referee_id, sheet_data,
                    home:teams!home_team_id(id, name, shield_url),
                    away:teams!away_team_id(id, name, shield_url),
                    category:categories(name),
                    tournament:tournaments(id, name, gender)
                )
            `)
            .eq('user_id', user.id);

        // 2. Fetch de partidos finalizados FILTRADO 100% SERVER-SIDE EN POSTGRESQL (Sin descarga masiva)
        const { data: fallbackMatches } = await supabase
            .from('matches')
            .select(`
                id, scheduled_time, status, court_name, referee_id, sheet_data,
                home:teams!home_team_id(id, name, shield_url),
                away:teams!away_team_id(id, name, shield_url),
                category:categories(name),
                tournament:tournaments(id, name, gender)
            `)
            .eq('status', 'finalizado')
            .or(`referee_id.eq.${user.id},sheet_data->staff->>ref1.eq.${user.id},sheet_data->staff->>ref2.eq.${user.id},sheet_data->staff->>scorer.eq.${user.id}`);

        const matchesMap = new Map<string, OfficialAssignmentRecord>();

        // 1. Carga de asignaciones previas de match_officials
        if (officialsData) {
            officialsData.forEach((item: any) => {
                const matchObj = Array.isArray(item.match) ? item.match[0] : item.match;
                if (matchObj && matchObj.status === 'finalizado') {
                    const match: MatchDataRef = {
                        id: matchObj.id,
                        scheduled_time: matchObj.scheduled_time,
                        status: matchObj.status,
                        court_name: matchObj.court_name,
                        referee_id: matchObj.referee_id,
                        sheet_data: matchObj.sheet_data,
                        home: Array.isArray(matchObj.home) ? matchObj.home[0] : matchObj.home,
                        away: Array.isArray(matchObj.away) ? matchObj.away[0] : matchObj.away,
                        category: Array.isArray(matchObj.category) ? matchObj.category[0] : matchObj.category,
                        tournament: Array.isArray(matchObj.tournament) ? matchObj.tournament[0] : matchObj.tournament,
                    };

                    const rawRole = normalizeRefereeRole(item.role);
                    const effectiveRole = getEffectiveRoleForMatch(user.id, match, rawRole);

                    matchesMap.set(match.id, {
                        id: item.id,
                        role: effectiveRole,
                        match
                    });
                }
            });
        }

        // 2. Prevalencia MANDATORIA de la planilla oficial de juego (sheet_data.staff) sobre asignaciones previas
        if (fallbackMatches) {
            fallbackMatches.forEach((m: any) => {
                const match: MatchDataRef = {
                    id: m.id,
                    scheduled_time: m.scheduled_time,
                    status: m.status,
                    court_name: m.court_name,
                    referee_id: m.referee_id,
                    sheet_data: m.sheet_data,
                    home: Array.isArray(m.home) ? m.home[0] : m.home,
                    away: Array.isArray(m.away) ? m.away[0] : m.away,
                    category: Array.isArray(m.category) ? m.category[0] : m.category,
                    tournament: Array.isArray(m.tournament) ? m.tournament[0] : m.tournament,
                };

                const existing = matchesMap.get(match.id);
                const fallbackRole = existing?.role || '1st_referee';
                const effectiveRole = getEffectiveRoleForMatch(user.id, match, fallbackRole);

                matchesMap.set(match.id, {
                    id: existing?.id || `m-eff-${match.id}`,
                    role: effectiveRole,
                    match
                });
            });
        }

        const validList = Array.from(matchesMap.values());
        validList.sort((a, b) => {
            const timeA = a.match.scheduled_time || '';
            const timeB = b.match.scheduled_time || '';
            const dateComp = timeB.localeCompare(timeA);
            if (dateComp !== 0) return dateComp;
            return (a.match.id || '').localeCompare(b.match.id || '');
        });

        setAllData(validList);
        setLoading(false);
    };

    const categoriesList = Array.from(new Set(allData.map(item => item.match.category?.name || item.match.tournament?.category?.name).filter(Boolean))) as string[];

    const filteredMatches = allData.filter(item => {
        const match = item.match;
        if (!match || match.status !== 'finalizado') return false;

        const catName = match.category?.name || match.tournament?.category?.name;
        if (selectedCategory && catName !== selectedCategory) return false;
        if (selectedGender && match.tournament?.gender !== selectedGender) return false;

        const matchLocalYearMonth = getArgentinaYearMonthStr(match.scheduled_time);

        if (selectedPeriod === 'all-2026') {
            return matchLocalYearMonth.startsWith('2026');
        }
        return matchLocalYearMonth === selectedPeriod;
    });

    const countRef1 = filteredMatches.filter(m => m.role === '1st_referee').length;
    const countRef2 = filteredMatches.filter(m => m.role === '2nd_referee').length;
    const countScorer = filteredMatches.filter(m => m.role === 'scorer' || m.role === 'line_judge').length;
    const totalOfficiated = filteredMatches.length;

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-tdf-orange" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
            <Suspense fallback={null}>
                <MatchDetailsHandler />
            </Suspense>

            {/* Header + Selector de Períodos en Huso Horario Ushuaia (UTC-3) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2 text-white">
                        <BarChart3 className="text-tdf-orange" />
                        Reportes Deportivos
                    </h2>
                    <p className="text-xs text-zinc-400 font-semibold mt-1">Historial de designaciones y desempeño en cancha</p>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-tdf-orange text-xs font-black rounded-xl px-3 py-2 outline-none focus:border-tdf-orange transition cursor-pointer"
                    >
                        <option value="all-2026">📅 Todo el Año 2026</option>
                        <option value="2026-08">📅 Agosto 2026</option>
                        <option value="2026-09">📅 Septiembre 2026</option>
                    </select>

                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-tdf-orange transition"
                    >
                        <option value="">Todas las Categorías</option>
                        {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards por Rol (Sin Módulo Financiero) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-emerald-500/20 shadow-xl relative overflow-hidden">
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-2">1° Árbitro Principal</p>
                    <div className="text-3xl font-black text-white">{countRef1}</div>
                </div>

                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-blue-500/20 shadow-xl relative overflow-hidden">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-wider mb-2">2° Árbitro Asistente</p>
                    <div className="text-3xl font-black text-white">{countRef2}</div>
                </div>

                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-amber-500/20 shadow-xl relative overflow-hidden">
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2">Anotador / Mesa</p>
                    <div className="text-3xl font-black text-white">{countScorer}</div>
                </div>

                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-tdf-orange/30 shadow-xl relative overflow-hidden">
                    <p className="text-tdf-orange text-[10px] font-black uppercase tracking-wider mb-2">Total Partidos</p>
                    <div className="text-3xl font-black text-white">{totalOfficiated}</div>
                </div>
            </div>

            {/* Historial de Partidos Dirigidos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-500" /> Historial de Partidos Dirigidos
                    </h3>
                </div>

                {filteredMatches.length === 0 ? (
                    <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                        No se registraron partidos finalizados bajo el período seleccionado.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/60 max-h-[450px] overflow-y-auto pr-1">
                        {filteredMatches.map(record => {
                            const match = record.match;
                            const roleBadge = record.role === '1st_referee'
                                ? { label: '1° ÁRBITRO', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                                : record.role === '2nd_referee'
                                    ? { label: '2° ÁRBITRO', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
                                    : { label: 'ANOTADOR / MESA', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };

                            return (
                                <div key={record.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-tdf-orange font-black text-xs shrink-0">
                                            FVF
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">
                                                {match.home?.name || 'Local'} <span className="text-zinc-600 font-normal italic mx-1">vs</span> {match.away?.name || 'Visitante'}
                                            </p>
                                            <p className="text-xs text-zinc-500 font-medium">
                                                {formatArgentinaDateLiteral(match.scheduled_time)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase ${roleBadge.style}`}>
                                            {roleBadge.label}
                                        </span>
                                        <button
                                            onClick={() => router.push(`${pathname}?match_details=${match.id}`, { scroll: false })}
                                            className="text-zinc-400 hover:text-white transition p-2 bg-black/50 hover:bg-black border border-zinc-800 rounded-lg cursor-pointer"
                                            title="Ver Planilla Oficial"
                                        >
                                            <Eye size={16} />
                                        </button>
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
