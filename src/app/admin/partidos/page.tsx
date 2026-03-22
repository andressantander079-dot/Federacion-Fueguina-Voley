// src/app/admin/partidos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, MapPin, ArrowRight, AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatArgentinaDateLiteral, formatArgentinaTimeLiteral } from '@/lib/dateUtils';

interface MatchDay {
    dateLabel: string;
    dateKey: string;
    matches: any[];
}

export default function AgendaSemanalPage() {
    const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchWeekMatches();
    }, []);

    async function fetchWeekMatches() {
        const now = new Date();
        // Inicio de la semana actual (lunes)
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(now.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Fin de la semana (domingo siguiente)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                home_team:home_team_id(name, shield_url),
                away_team:away_team_id(name, shield_url),
                category:category_id(name)
            `)
            .or(`status.eq.programado,status.eq.en_curso,status.eq.suspendido`)
            .gte('scheduled_time', startOfWeek.toISOString())
            .lte('scheduled_time', endOfWeek.toISOString())
            .order('scheduled_time', { ascending: true });

        if (error) {
            console.error('Error fetching weekly matches:', error);
            setLoading(false);
            return;
        }

        // Agrupar por día
        const grouped: Record<string, MatchDay> = {};
        (data || []).forEach(match => {
            const d = new Date(match.scheduled_time);
            const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!grouped[key]) {
                grouped[key] = {
                    dateKey: key,
                    dateLabel: formatArgentinaDateLiteral(match.scheduled_time, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    }),
                    matches: []
                };
            }
            grouped[key].matches.push(match);
        });

        setMatchDays(Object.values(grouped));
        setLoading(false);
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/admin" className="text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition mb-1 inline-block">
                            ← Volver al Panel
                        </Link>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <Calendar className="text-tdf-blue" size={24} />
                            Agenda Semanal
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">Todos los partidos programados para esta semana</p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchWeekMatches(); }}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white transition"
                        title="Actualizar"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-slate-100 dark:bg-zinc-800/40 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : matchDays.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 border border-gray-100 dark:border-white/5 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={28} className="text-slate-400 dark:text-zinc-600" />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Sin partidos esta semana</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-500">No hay partidos programados para los próximos 7 días.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {matchDays.map(({ dateKey, dateLabel, matches }) => (
                            <div key={dateKey}>
                                {/* Encabezado del día */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-px flex-1 bg-gray-100 dark:bg-zinc-800" />
                                    <span className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full">
                                        {dateLabel}
                                    </span>
                                    <div className="h-px flex-1 bg-gray-100 dark:bg-zinc-800" />
                                </div>

                                {/* Partidos del día */}
                                <div className="space-y-3">
                                    {matches.map(match => {
                                        const isLive = match.status === 'en_curso';
                                        const isSuspended = match.status === 'suspendido';

                                        return (
                                            <div
                                                key={match.id}
                                                className={`bg-zinc-900 rounded-xl border transition-all
                                                    ${isLive ? 'border-green-600/60 ring-1 ring-green-600/20 shadow-lg shadow-green-900/10'
                                                    : isSuspended ? 'border-red-800/50 ring-1 ring-red-800/20'
                                                    : 'border-zinc-800'}`}
                                            >
                                                <div className="p-4">
                                                    {/* Status + Categoría + Hora */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            {isLive ? (
                                                                <span className="flex items-center gap-1.5 text-[11px] font-black text-green-400 uppercase tracking-wider bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800/40">
                                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                                    EN VIVO
                                                                </span>
                                                            ) : isSuspended ? (
                                                                <span className="flex items-center gap-1.5 text-[11px] font-black text-red-400 uppercase tracking-wider bg-red-900/20 px-2 py-0.5 rounded-full border border-red-800/30">
                                                                    <AlertTriangle size={10} />
                                                                    SUSPENDIDO
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                                                    <Clock size={10} />
                                                                    {formatArgentinaTimeLiteral(match.scheduled_time)} hs
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] font-bold text-blue-600 dark:text-tdf-blue">
                                                                {match.category?.name || 'Torneo'}
                                                            </span>
                                                        </div>
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-zinc-600">
                                                            <MapPin size={10} />
                                                            {match.court_name || 'Cancha Central'}
                                                        </span>
                                                    </div>

                                                    {/* Equipos enfrentados */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <div className="w-8 h-8 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                                                {match.home_team?.shield_url
                                                                    ? <img src={match.home_team.shield_url} className="w-full h-full object-contain" />
                                                                    : <span className="text-[10px] font-black text-slate-400 dark:text-zinc-600">L</span>}
                                                            </div>
                                                            <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{match.home_team?.name || 'Local'}</span>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="font-black text-xs text-slate-300 dark:text-zinc-600">VS</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                            <span className="font-bold text-sm text-slate-800 dark:text-white truncate text-right">{match.away_team?.name || 'Visita'}</span>
                                                            <div className="w-8 h-8 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                                                {match.away_team?.shield_url
                                                                    ? <img src={match.away_team.shield_url} className="w-full h-full object-contain" />
                                                                    : <span className="text-[10px] font-black text-slate-400 dark:text-zinc-600">V</span>}
                                                            </div>
                                                        </div>

                                                        {/* Acción: solo para suspendidos (reprogramar) */}
                                                        {isSuspended && (
                                                            <div className="shrink-0 ml-2">
                                                                <Link
                                                                    href={`/admin/programar?reprogramar=${match.id}`}
                                                                    className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                                                                >
                                                                    Reprogramar <ArrowRight size={11} />
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                    </div>
                )}
            </div>
        </div>
    );
}
