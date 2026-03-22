'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Calendar, Clock, MapPin, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import Link from 'next/link';
import { formatArgentinaTimeLiteral } from '@/lib/dateUtils';

export default function RecentMatches() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchMatches();
    }, []);

    async function fetchMatches() {
        // Solo En Vivo y Suspendidos — son los que requieren atención inmediata
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                home_team:home_team_id(name, shield_url),
                away_team:away_team_id(name, shield_url),
                category:category_id(name)
            `)
            .or(`status.eq.en_curso,status.eq.suspendido`)
            .order('scheduled_time', { ascending: true })
            .limit(10);

        if (error) {
            console.error('Error fetching matches:', error);
        } else {
            setMatches(data || []);
        }
        setLoading(false);
    }

    if (loading) return <div className="h-36 bg-slate-100 dark:bg-zinc-800/40 rounded-3xl animate-pulse mb-8" />;

    return (
        <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="text-tdf-blue" size={20} /> Agenda Reciente
                </h2>
                <Link
                    href="/admin/partidos"
                    className="text-xs font-bold text-tdf-blue hover:underline flex items-center gap-1"
                >
                    Ver Todo <ArrowRight size={12} />
                </Link>
            </div>

            {matches.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-gray-100 dark:border-white/5 text-center">
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Sin actividad urgente</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">No hay partidos en vivo ni suspendidos.</p>
                    <Link href="/admin/partidos" className="inline-block mt-3 text-xs text-tdf-blue font-bold hover:underline">
                        Ver agenda semanal →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {matches.map((match) => {
                        const isLive = match.status === 'en_curso';
                        const isSuspended = match.status === 'suspendido';

                        return (
                            <div
                                key={match.id}
                                className={`relative bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all
                                    ${isLive
                                        ? 'border-green-500 ring-1 ring-green-500/50 shadow-lg shadow-green-500/10 dark:shadow-green-900/20'
                                        : 'border-red-300 dark:border-red-800/60 ring-1 ring-red-300/50 dark:ring-red-800/30'
                                    }`}
                            >
                                {/* Badge de estado */}
                                <div className="flex items-center gap-2 mb-3">
                                    {isLive ? (
                                        <span className="flex items-center gap-1.5 text-xs font-black text-green-400 uppercase tracking-wider">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            EN VIVO
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-black text-red-400 uppercase tracking-wider">
                                            <AlertTriangle size={12} className="animate-pulse" />
                                            SUSPENDIDO — REQUIERE REPROGRAMACIÓN
                                        </span>
                                    )}
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-xs font-bold text-zinc-400">{match.category?.name || 'Torneo'}</span>
                                </div>

                                <div className="flex items-center justify-between gap-3 mb-4 bg-slate-50 dark:bg-zinc-800/40 px-4 py-3 rounded-xl">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-9 h-9 bg-slate-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                            {match.home_team?.shield_url
                                                ? <img src={match.home_team.shield_url} className="w-full h-full object-contain" />
                                                : <span className="font-black text-slate-300 dark:text-zinc-500 text-xs">L</span>}
                                        </div>
                                        <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{match.home_team?.name || 'Local'}</span>
                                    </div>

                                    <span className="font-black text-slate-300 dark:text-zinc-600 shrink-0">VS</span>

                                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                        <span className="font-bold text-sm text-slate-800 dark:text-white truncate text-right">{match.away_team?.name || 'Visita'}</span>
                                        <div className="w-9 h-9 bg-slate-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                            {match.away_team?.shield_url
                                                ? <img src={match.away_team.shield_url} className="w-full h-full object-contain" />
                                                : <span className="font-black text-slate-300 dark:text-zinc-500 text-xs">V</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Pie: cancha + acción (suspendidos tienen botón reprogramar) */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500">
                                        <MapPin size={11} />
                                        <span>{match.court_name || 'Cancha Central'}</span>
                                    </div>
                                    {isSuspended && (
                                        <Link
                                            href={`/admin/programar?reprogramar=${match.id}`}
                                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md shadow-red-900/30"
                                        >
                                            Reprogramar <ArrowRight size={12} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
