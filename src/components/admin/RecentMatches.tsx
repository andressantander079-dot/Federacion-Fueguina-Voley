'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match } from '@/types/match'; // Ensure Types match
import { AlertTriangle, Calendar, Clock, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatArgentinaTimeLiteral } from '@/lib/dateUtils';

export default function RecentMatches() {
    const [matches, setMatches] = useState<any[]>([]); // Using any for join flexibility or update Match type
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchMatches();
    }, []);

    async function fetchMatches() {
        const now = new Date().toISOString();
        // Fetch upcoming matches (programado or en_curso)
        // Limit to 10 for dashboard
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                home_team:home_team_id(name, shield_url),
                away_team:away_team_id(name, shield_url),
                category:category_id(name)
            `)
            .or(`status.eq.programado,status.eq.en_curso`)
            .gte('scheduled_time', now) // Only future/current
            .order('scheduled_time', { ascending: true })
            .limit(10);

        if (error) {
            console.error('Error fetching matches:', error);
        } else {
            console.log('Matches fetched:', data);
            setMatches(data || []);
        }
        setLoading(false);
    }

    // Double Booking Logic
    // Returns true if either team has another match at the exact same time in this list
    // Note: robust double booking checks usually require server-side query against ALL matches, 
    // but for "Visual Alert" on dashboard, checking within the fetched list is a good start, 
    // or we can assume the list is comprehensive enough for the immediate future.
    // Enhanced: Check if count of matches for (team + time) > 1
    const hasConflict = (match: any) => {
        const time = match.scheduled_time;
        const homeId = match.home_team_id;
        const awayId = match.away_team_id;

        // Count occurrences in the current loaded list (client-side heuristic)
        // A better approach would be to fetch conflicting matches from DB but that's N+1.
        // Let's implement client-side check on the 'matches' array for now.

        const conflictCount = matches.filter(m =>
            m.id !== match.id && // Not self
            Math.abs(new Date(m.scheduled_time).getTime() - new Date(time).getTime()) < 60 * 60 * 1000 && // Within 1 hour overlap? Or exact? User said "misma hora". Let's say < 45 mins.
            (
                m.home_team_id === homeId || m.away_team_id === homeId ||
                m.home_team_id === awayId || m.away_team_id === awayId
            )
        ).length;

        return conflictCount > 0;
    };

    if (loading) return <div className="h-48 bg-gray-100 rounded-3xl animate-pulse"></div>;

    if (matches.length === 0) return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-white/5 text-center mb-8">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">Todo al día</h3>
            <p className="text-sm text-slate-500">No hay partidos programados próximamente.</p>
        </div>
    );

    return (
        <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="text-tdf-blue" /> Agenda Reciente
                </h2>
                <div className="flex items-center gap-4">
                    <Link href="/admin/programar" className="text-xs font-bold text-tdf-orange hover:underline bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">+ Programar</Link>
                    <Link href="/admin/partidos" className="text-xs font-bold text-tdf-blue hover:underline">Ver Todo</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {matches.map((match) => {
                    const conflict = hasConflict(match);
                    const isLive = match.status === 'en_curso';

                    return (
                        <div key={match.id} className={`relative bg-white dark:bg-zinc-900 p-4 rounded-2xl border ${isLive ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100 dark:border-white/5'} shadow-sm hover:shadow-md transition-all group`}>

                            {/* Conflict Alert */}
                            {conflict && (
                                <div className="absolute top-2 right-2 text-red-500 animate-pulse" title="Conflicto: Un equipo tiene otro partido cerca de esta hora.">
                                    <AlertTriangle size={20} />
                                </div>
                            )}

                            {/* Time & Status */}
                            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                {isLive ? (
                                    <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> En Vivo</span>
                                ) : (
                                    <span className="flex items-center gap-1"><Clock size={12} /> {formatArgentinaTimeLiteral(match.scheduled_time)} hs</span>
                                )}
                                <span>•</span>
                                <span className="text-tdf-blue">{match.category?.name || 'Torneo'}</span>
                            </div>

                            {/* Teams */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-3 w-full sm:w-5/12 justify-start">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                        {match.home_team?.shield_url ? <img src={match.home_team.shield_url} className="w-full h-full object-cover" /> : <span className="font-black text-gray-300">L</span>}
                                    </div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-white line-clamp-1">{match.home_team?.name || 'Local'}</span>
                                </div>

                                <span className="font-black text-xs sm:text-lg text-slate-300">VS</span>

                                <div className="flex items-center gap-3 w-full sm:w-5/12 justify-start sm:justify-end">
                                    <span className="font-bold text-sm text-slate-700 dark:text-white line-clamp-1 sm:text-right">{match.away_team?.name || 'Visita'}</span>
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 sm:order-last -order-1">
                                        {match.away_team?.shield_url ? <img src={match.away_team.shield_url} className="w-full h-full object-cover" /> : <span className="font-black text-gray-300">V</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-between border-t border-gray-50 dark:border-white/5 pt-3">
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <MapPin size={12} />
                                    {match.court_name || 'Cancha Central'}
                                </div>
                                <Link
                                    href={`/partido/${match.id}`}
                                    className="px-4 py-2 bg-tdf-orange text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                                >
                                    Ir a Planilla <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
