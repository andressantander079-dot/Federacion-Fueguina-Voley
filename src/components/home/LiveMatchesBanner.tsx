'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Radio } from 'lucide-react'

const MAX_INACTIVE_LIVE_MS = 40 * 60 * 1000; // 40 minutos

export default function LiveMatchesBanner() {
    const [liveMatches, setLiveMatches] = useState<any[]>([])
    const [supabase] = useState(() => createClient())

    const fetchLiveMatches = async () => {
        const { data, error } = await supabase
            .from('matches')
            .select('id, created_at, updated_at, scheduled_time, home_team:teams!home_team_id(name, shield_url), away_team:teams!away_team_id(name, shield_url), sheet_data')
            .in('status', ['live', 'en_curso'])

        if (error) console.error("Error fetching live matches:", error);

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
                    return false; // El encuentro ya concluyó
                }

                // 2. Solo descartar por inactividad si hay timestamp explícito de último punto registrado superior a 40 min
                if (sheet.last_point_at) {
                    const lastPointTime = new Date(sheet.last_point_at).getTime();
                    if (!isNaN(lastPointTime) && (now - lastPointTime > MAX_INACTIVE_LIVE_MS)) {
                        return false; // Descartar si pasaron más de 40 minutos desde el último punto anotado
                    }
                }

                return true;
            });

            setLiveMatches(activeOnly);
        }
    }

    useEffect(() => {
        fetchLiveMatches()

        const channel = supabase
            .channel('live_matches_banner')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchLiveMatches();
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    if (liveMatches.length === 0) return null

    return (
        <section className="bg-zinc-950 border-b border-zinc-800 py-4 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient-x"></div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

                    <div className="flex items-center gap-3 min-w-max">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <h2 className="text-white font-black uppercase tracking-widest text-sm">Partidos En Vivo</h2>
                    </div>

                    <div className="flex-1 flex gap-4 overflow-x-auto pb-2 md:pb-0 custom-scrollbar w-full">
                        {liveMatches.map((match) => {
                            const sets = match.sheet_data?.sets_history || match.sheet_data?.sets || [];
                            const currentSet = sets.find((s: any) => !s.finished) || sets[sets.length - 1] || { home: 0, away: 0 };
                            const homePts = currentSet.home ?? currentSet.homeScore ?? currentSet.score_home ?? 0;
                            const awayPts = currentSet.away ?? currentSet.awayScore ?? currentSet.score_away ?? 0;

                            return (
                                <Link
                                    key={match.id}
                                    href={`/vivo/${match.id}`}
                                    className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 hover:bg-zinc-800 transition min-w-max group"
                                >
                                    <span className="text-xs font-bold text-white uppercase group-hover:text-tdf-orange transition">{match.home_team?.name}</span>
                                    <div className="bg-black px-3 py-1 rounded text-red-500 font-mono font-black text-xs border border-zinc-800">
                                        {homePts} - {awayPts}
                                    </div>
                                    <span className="text-xs font-bold text-white uppercase group-hover:text-tdf-orange transition">{match.away_team?.name}</span>
                                    <Radio size={14} className="text-red-500 animate-pulse ml-2" />
                                </Link>
                            )
                        })}
                    </div>

                </div>
            </div>
        </section>
    )
}
