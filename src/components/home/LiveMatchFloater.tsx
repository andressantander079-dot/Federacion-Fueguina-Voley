'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { X } from 'lucide-react';

const MAX_INACTIVE_LIVE_MS = 40 * 60 * 1000; // 40 minutos

export default function LiveMatchFloater() {
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [supabase] = useState(() => createClient());

    const fetchLiveMatches = async () => {
        const { data } = await supabase
            .from('matches')
            .select('id, created_at, updated_at, scheduled_time, home_team:teams!home_team_id(name, shield_url), away_team:teams!away_team_id(name, shield_url), sheet_data')
            .in('status', ['live', 'en_curso']);

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

                // 2. Filtrar partidos congelados por más de 40 minutos de inactividad
                const lastPointTimestamp = sheet.last_point_at ? new Date(sheet.last_point_at).getTime() : null;
                const lastUpdatedTimestamp = match.updated_at ? new Date(match.updated_at).getTime() : null;
                const createdTimestamp = match.created_at ? new Date(match.created_at).getTime() : now;

                const mostRecentActivity = lastPointTimestamp || lastUpdatedTimestamp || createdTimestamp;
                const elapsedMs = now - mostRecentActivity;

                if (elapsedMs > MAX_INACTIVE_LIVE_MS) {
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

    // Show first active live match found
    const match = liveMatches[0];
    const sets = match.sheet_data?.sets_history || match.sheet_data?.sets || [];
    const currentSet = sets.find((s: any) => !s.finished) || sets[sets.length - 1] || { home: 0, away: 0 };
    const homePts = currentSet.home ?? currentSet.homeScore ?? currentSet.score_home ?? 0;
    const awayPts = currentSet.away ?? currentSet.awayScore ?? currentSet.score_away ?? 0;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="relative group">
                {/* Close Button (Hover) */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute -top-2 -right-2 bg-zinc-900 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
                >
                    <X size={12} />
                </button>

                <Link href={`/vivo/${match.id}`}>
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/20 transition-all active:scale-95 overflow-hidden">

                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-red-500/20 opacity-50 blur-xl"></div>

                        {/* Bouncing Ball */}
                        <div className="relative">
                            <span className="flex h-3 w-3 absolute top-0 right-0 -mr-1 -mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <div className="animate-bounce-slow drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                                <span className="text-6xl">🏐</span>
                            </div>
                        </div>

                        {/* Score Info */}
                        <div className="relative z-10 flex flex-col">
                            <span className="text-[10px] font-black uppercase text-white/70 tracking-widest mb-0.5">En Vivo</span>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end">
                                    {match.home_team?.shield_url && <img src={match.home_team.shield_url} className="w-5 h-5 object-contain" alt="" />}
                                    <span className="text-[10px] font-bold text-white uppercase truncate max-w-[60px]">{match.home_team?.name}</span>
                                </div>

                                <div className="bg-black/50 px-2 py-0.5 rounded text-white font-mono font-black text-sm border border-white/10 shadow-inner">
                                    {homePts}-{awayPts}
                                </div>

                                <div className="flex flex-col items-start">
                                    {match.away_team?.shield_url && <img src={match.away_team.shield_url} className="w-5 h-5 object-contain" alt="" />}
                                    <span className="text-[10px] font-bold text-white uppercase truncate max-w-[60px]">{match.away_team?.name}</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-white/50 font-medium">Set {sets.length || 1}</span>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
