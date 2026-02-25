// src/app/club/competitions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Trophy, Calendar, ChevronRight, CheckCircle,
    Users, Shield, Medal, AlertCircle
} from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';

export default function ClubCompetitionsList() {
    const router = useRouter();
    const { clubId, loading: authLoading } = useClubAuth();
    const [dataLoading, setDataLoading] = useState(true);
    const [tournaments, setTournaments] = useState<any[]>([]);

    useEffect(() => {
        if (clubId) fetchCompetitions(clubId);
    }, [clubId]);

    async function fetchCompetitions(effectiveClubId: string) {
        try {
            // 1. Get User & Team ID (Layout already validates session, but we need the ID)
            // const { data: { user } } = await supabase.auth.getUser();
            // if (!user) return; // Silent return, Layout handles redirect

            // const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
            if (!effectiveClubId) {
                // If no club, just stop loading. Redirecting to /club might cause loop if we are mistakenly there.
                setDataLoading(false);
                return;
            }

            // setTeamId(profile.club_id);

            // 2. Find tournaments where this team participates
            // We look at 'tournament_teams' pivot table
            const { data: participations, error: partError } = await supabase
                .from('tournament_teams')
                .select(`
          tournament_id,
          tournament:tournaments!inner (
            id, name, season, category_id, gender, status,
            category:categories(name)
          )
        `)
                .eq('team_id', effectiveClubId);

            if (partError) throw partError;

            // Extract unique tournaments and format
            const formattedTournaments = participations?.map((p: any) => ({
                id: p.tournament.id,
                name: p.tournament.name,
                season: p.tournament.season,
                gender: p.tournament.gender,
                category: p.tournament.category?.name || 'General',
                status: p.tournament.status
            })) || [];

            setTournaments(formattedTournaments);

        } catch (error) {
            console.error(error);
        } finally {
            setDataLoading(false);
        }
    }

    if (authLoading || dataLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
            <div className="animate-pulse flex flex-col items-center">
                <Trophy size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Competencias...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 font-sans pb-20 text-white">

            {/* HEADER */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
                <Link href="/club" className="p-2 hover:bg-zinc-800 rounded-full transition text-zinc-400"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="font-black text-xl text-white">Competencias</h1>
                    <p className="text-xs text-zinc-500 font-medium">Torneos Activos e Historial</p>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

                {tournaments.length === 0 ? (
                    <div className="text-center py-16 bg-zinc-900 rounded-3xl border border-zinc-800 border-dashed">
                        <Trophy size={64} className="mx-auto text-zinc-800 mb-6" />
                        <h3 className="text-lg font-bold text-zinc-500">Sin Competencias</h3>
                        <p className="text-sm text-zinc-600 max-w-xs mx-auto mt-2">
                            Actualmente tu club no está inscripto en ningún torneo activo.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tournaments.map((t) => (
                            <Link key={t.id} href={`/club/competitions/${t.id}`}>
                                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition group cursor-pointer relative overflow-hidden">

                                    {/* Status Strip */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.status === 'activo' ? 'bg-emerald-500' :
                                        t.status === 'finalizado' ? 'bg-zinc-600' : 'bg-yellow-500'
                                        }`} />

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">

                                            {/* Icon Container */}
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                                                <Trophy size={24} />
                                            </div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                                                        {t.season}
                                                    </span>
                                                    {t.status !== 'borrador' && (
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${t.status === 'activo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            t.status === 'finalizado' ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                            {t.status}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-black text-white leading-tight group-hover:text-blue-400 transition">
                                                    {t.name}
                                                </h3>

                                                <div className="flex items-center gap-3 mt-2 text-xs font-medium text-zinc-500">
                                                    <span className="flex items-center gap-1"><Medal size={14} /> {t.category} {t.gender}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight className="text-zinc-700 group-hover:text-blue-500 transition group-hover:translate-x-1" size={24} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="bg-blue-500/10 p-4 rounded-xl flex gap-3 text-blue-300 text-sm border border-blue-500/20">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p>
                        Si no ves un torneo aquí, contacta a la <strong>Secretaría de Competencias</strong> para verificar tu inscripción.
                    </p>
                </div>

            </div>
        </div>
    );
}
