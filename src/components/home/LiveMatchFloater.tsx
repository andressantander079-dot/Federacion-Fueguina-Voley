'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { resolveTeamColors } from '@/lib/colorUtils';

const MAX_INACTIVE_LIVE_MS = 40 * 60 * 1000; // 40 minutos de abandono dentro del set
const MAX_LIVE_WINDOW_MS = 18 * 60 * 60 * 1000; // 18 horas de ventana móvil defensiva anti-zombis
const POLLING_INTERVAL_MS = 8000; // 8 segundos de Dual-Engine Sync

export interface LiveMatchSet {
    number?: number;
    home?: number;
    away?: number;
    score_home?: number;
    score_away?: number;
    homeScore?: number;
    awayScore?: number;
    finished?: boolean;
    [key: string]: unknown;
}

export interface LiveMatchSheetData {
    last_point_at?: string | null;
    started_at?: string | null;
    sets_history?: LiveMatchSet[];
    sets?: LiveMatchSet[];
    metadata?: {
        bestOfSets?: number;
        [key: string]: unknown;
    };
    current_set_idx?: number;
    final_score?: {
        home?: number;
        away?: number;
    };
    teamColors?: {
        home?: string[];
        away?: string[];
    };
    [key: string]: unknown;
}

export interface LiveMatchCandidate {
    id: string;
    status: string;
    scheduled_time?: string | null;
    created_at?: string | null;
    home_team?: {
        id?: string;
        name?: string;
        shield_url?: string | null;
        primary_color?: string | null;
        secondary_color?: string | null;
    } | null;
    away_team?: {
        id?: string;
        name?: string;
        shield_url?: string | null;
        primary_color?: string | null;
        secondary_color?: string | null;
    } | null;
    sheet_data?: LiveMatchSheetData | null;
}

export function parseTimestamp(val: unknown): number | null {
    if (typeof val === 'string' && val.trim().length > 0) {
        const ms = new Date(val).getTime();
        return !isNaN(ms) ? ms : null;
    }
    if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
    return null;
}

export function getLatestActivityTimestamp(match: LiveMatchCandidate): number {
    const sheet = match.sheet_data || {};
    const candidates: number[] = [];

    const tLastPoint = parseTimestamp(sheet.last_point_at);
    if (tLastPoint !== null) candidates.push(tLastPoint);

    const tStarted = parseTimestamp(sheet.started_at);
    if (tStarted !== null) candidates.push(tStarted);

    const tScheduled = parseTimestamp(match.scheduled_time);
    if (tScheduled !== null) candidates.push(tScheduled);

    const tCreated = parseTimestamp(match.created_at);
    if (tCreated !== null) candidates.push(tCreated);

    // Si no existe ningún timestamp válido (caso extremo), usar Date.now() para jamás descartar erróneamente un partido activo
    return candidates.length > 0 ? Math.max(...candidates) : Date.now();
}

export default function LiveMatchFloater() {
    const [liveMatches, setLiveMatches] = useState<LiveMatchCandidate[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [supabase] = useState(() => createClient());

    const fetchLiveMatches = async () => {
        const { data, error } = await supabase
            .from('matches')
            .select('id, status, created_at, scheduled_time, home_team:teams!home_team_id(id, name, shield_url), away_team:teams!away_team_id(id, name, shield_url), sheet_data')
            .in('status', ['live', 'en_curso']);

        if (error) console.error("Error fetching live matches floater:", error);

        if (data) {
            const now = Date.now();

            const activeOnly = (data as unknown as LiveMatchCandidate[]).filter((match) => {
                const sheet = match.sheet_data || {};
                const sets = sheet.sets_history || sheet.sets || [];

                // 1. REGLA DE CIERRE DEPORTIVO: Si un equipo ya alcanzó los sets reglamentarios para ganar
                const bestOf = sheet.metadata?.bestOfSets || 5;
                const targetSets = Math.ceil(bestOf / 2);
                
                const setsWonHome = sets.filter((s) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
                const setsWonAway = sets.filter((s) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

                if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
                    return false;
                }

                // 2. REGLA ESTRICTA DE ABANDONO EN JUEGO: Si pasaron >40 min ininterrumpidos desde el último punto registrado
                const lastPointMs = parseTimestamp(sheet.last_point_at);
                if (lastPointMs !== null && (now - lastPointMs > MAX_INACTIVE_LIVE_MS)) {
                    return false;
                }

                // 3. VENTANA DEFENSIVA ANTI-PARTIDOS ZOMBI (18 HORAS):
                // Si la actividad más reciente del partido supera las 18 horas, descartar de la portada
                const latestActivityMs = getLatestActivityTimestamp(match);
                if (now - latestActivityMs > MAX_LIVE_WINDOW_MS) {
                    return false;
                }

                return true;
            });

            setLiveMatches(activeOnly);
        }
    };

    useEffect(() => {
        fetchLiveMatches();

        // 1. Canal Realtime con telemetría de suscripción
        const channel = supabase
            .channel('live_matches_floater')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchLiveMatches();
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn("Realtime live_matches_floater error, relying on polling fallback.");
                }
            });

        // 2. Polling Fallback cada 8 segundos (Dual-Engine Sync)
        const intervalId = setInterval(fetchLiveMatches, POLLING_INTERVAL_MS);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(intervalId);
        };
    }, [supabase]);

    if (liveMatches.length === 0 || !isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 max-w-md w-full sm:w-auto animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto">
            
            {/* Header Barra Flotante Multi-Partido */}
            <div className="bg-zinc-950/95 border border-zinc-800 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 w-full backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-200">
                        {liveMatches.length === 1 ? '1 Partido En Vivo' : `${liveMatches.length} Partidos En Vivo`}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
                        title={isMinimized ? "Expandir" : "Minimizar"}
                    >
                        {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-zinc-400 hover:text-red-400 p-1 rounded-lg hover:bg-zinc-800 transition ml-1"
                        title="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Lista Vertical de Tarjetas Flotantes de Partidos en Juego con Pelota Rebotando Identitaria */}
            {!isMinimized && (
                <div className="flex flex-col gap-3 w-full max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {liveMatches.map((match) => {
                        const sheet = match.sheet_data || {};
                        const sets = sheet.sets_history || sheet.sets || [];
                        const currentSetIdx = typeof sheet.current_set_idx === 'number' ? sheet.current_set_idx : (sets.length > 0 ? sets.length - 1 : 0);
                        const currentSet = sets[currentSetIdx] || sheet.final_score || { home: 0, away: 0 };
                        const homePts = typeof currentSet.home === 'number' ? currentSet.home : (typeof currentSet.score_home === 'number' ? currentSet.score_home : (currentSet.homeScore ?? 0));
                        const awayPts = typeof currentSet.away === 'number' ? currentSet.away : (typeof currentSet.score_away === 'number' ? currentSet.score_away : (currentSet.awayScore ?? 0));
                        const setNum = (currentSetIdx + 1) || 1;

                        const homeColors = resolveTeamColors(match.home_team?.name || 'Local', match.home_team, sheet.teamColors?.home, true);
                        const awayColors = resolveTeamColors(match.away_team?.name || 'Visita', match.away_team, sheet.teamColors?.away, false, homeColors.primary);

                        return (
                            <Link key={match.id} href={`/vivo/${match.id}`} className="group block">
                                <div 
                                    className="bg-zinc-900/95 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 backdrop-blur-xl shadow-2xl rounded-2xl p-4 transition-all duration-300 transform group-hover:-translate-y-1 relative overflow-hidden flex items-center gap-4"
                                >
                                    {/* Indicador Cromático Superior */}
                                    <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                                        <div className="h-full w-1/2" style={{ backgroundColor: homeColors.primary }} />
                                        <div className="h-full w-1/2" style={{ backgroundColor: awayColors.primary }} />
                                    </div>

                                    {/* 🏐 ICONO IDENTITARIO: PELOTA QUE PICA CON PUNTO ROJO EN VIVO */}
                                    <div className="relative shrink-0 flex items-center justify-center pt-1">
                                        <span className="flex h-2.5 w-2.5 absolute -top-1 right-0 z-10">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                        <div className="animate-bounce-slow drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] text-4xl select-none">
                                            🏐
                                        </div>
                                    </div>

                                    {/* Cuerpo del Marcador */}
                                    <div className="flex-1 flex flex-col gap-1 min-w-0 pt-1">
                                        
                                        <div className="flex items-center justify-between gap-2">
                                             {/* Equipo Local */}
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                {match.home_team?.shield_url ? (
                                                    <img src={match.home_team.shield_url} className="w-5 h-5 object-contain shrink-0 drop-shadow" alt="" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-zinc-400 shrink-0">L</div>
                                                )}
                                                <span className="text-xs font-black text-white uppercase truncate group-hover:text-amber-400 transition">
                                                    {match.home_team?.name}
                                                </span>
                                            </div>

                                            {/* Marcador Central */}
                                            <div className="bg-black/90 px-3 py-1 rounded-xl text-white font-mono font-black text-sm border border-zinc-800 tracking-wider shadow-inner shrink-0 flex items-center gap-1">
                                                <span style={{ color: homeColors.primary }}>{homePts}</span>
                                                <span className="text-zinc-600">-</span>
                                                <span style={{ color: awayColors.primary }}>{awayPts}</span>
                                            </div>

                                            {/* Equipo Visitante */}
                                            <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                                                <span className="text-xs font-black text-white uppercase truncate text-right group-hover:text-amber-400 transition">
                                                    {match.away_team?.name}
                                                </span>
                                                {match.away_team?.shield_url ? (
                                                    <img src={match.away_team.shield_url} className="w-5 h-5 object-contain shrink-0 drop-shadow" alt="" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-zinc-400 shrink-0">V</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase border-t border-zinc-800/60 pt-1 mt-0.5">
                                            <span className="text-red-500 font-black tracking-widest flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                EN VIVO
                                            </span>
                                            <span>Set {setNum}</span>
                                        </div>

                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-7px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 1.6s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
