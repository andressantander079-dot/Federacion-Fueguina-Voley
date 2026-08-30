'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { resolveTeamColors } from '@/lib/colorUtils';
import { executeLiveMatchCleanup } from '@/app/actions/liveMatchCleanup';

const MAX_INACTIVE_LIVE_MS = 40 * 60 * 1000; // 40 minutos

export default function LiveMatchFloater() {
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [supabase] = useState(() => createClient());

    const fetchLiveMatches = async () => {
        // Ejecutar limpieza autónoma en segundo plano
        executeLiveMatchCleanup().catch(err => console.error("Error running live cleanup background action:", err));

        const { data, error } = await supabase
            .from('matches')
            .select('id, created_at, scheduled_time, home_team:teams!home_team_id(id, name, shield_url), away_team:teams!away_team_id(id, name, shield_url), sheet_data')
            .in('status', ['live', 'en_curso']);

        if (error) console.error("Error fetching live matches floater:", error);

        if (data) {
            const now = Date.now();

            const activeOnly = data.filter((match) => {
                const sheet = match.sheet_data || {};
                const sets = sheet.sets_history || sheet.sets || [];

                // 1. Filtrar partidos cuyo score final indique que un equipo ya ganó el partido
                const bestOf = sheet.metadata?.bestOfSets || 5;
                const targetSets = Math.ceil(bestOf / 2);
                
                const setsWonHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
                const setsWonAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

                if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
                    return false;
                }

                // 2. Solo descartar por inactividad si hay timestamp explícito de último punto o inicio registrado y han pasado más de 40 min
                const lastPointTime = sheet.last_point_at ? new Date(sheet.last_point_at).getTime() : null;
                const startedTime = sheet.started_at ? new Date(sheet.started_at).getTime() : null;

                const lastExplicitActivity = lastPointTime || startedTime;

                if (lastExplicitActivity && (now - lastExplicitActivity > MAX_INACTIVE_LIVE_MS)) {
                    return false;
                }

                return true;
            });

            setLiveMatches(activeOnly);
        }
    };

    useEffect(() => {
        fetchLiveMatches();

        const channel = supabase
            .channel('live_matches_floater')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchLiveMatches();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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
                        const currentSet = sets.find((s: any) => !s.finished) || sets[sets.length - 1] || { home: 0, away: 0 };
                        const homePts = currentSet.home ?? currentSet.homeScore ?? currentSet.score_home ?? 0;
                        const awayPts = currentSet.away ?? currentSet.awayScore ?? currentSet.score_away ?? 0;
                        const setNum = sets.length || 1;

                        const homeColors = resolveTeamColors(match.home_team?.name, match.home_team, sheet.teamColors?.home, true);
                        const awayColors = resolveTeamColors(match.away_team?.name, match.away_team, sheet.teamColors?.away, false, homeColors.primary);

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
