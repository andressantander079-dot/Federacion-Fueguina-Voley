'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Trophy, Calendar, ChevronRight, CheckCircle, Users, Shield, Medal, AlertCircle
} from 'lucide-react';

export default function ClubCompetitionsList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [teamId, setTeamId] = useState<string | null>(null);

    useEffect(() => {
        fetchCompetitions();
    }, []);

    async function fetchCompetitions() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            // 1. Get Team ID (club_id in schema)
            const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
            if (!profile?.club_id) return router.push('/club');

            setTeamId(profile.club_id);

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
                .eq('team_id', profile.club_id);

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
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <div className="animate-pulse flex flex-col items-center">
                <Trophy size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Competencias...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">

            {/* HEADER */}
            <div className="bg-white border-b px-6 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
                <Link href="/club" className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} className="text-slate-600" /></Link>
                <div>
                    <h1 className="font-black text-xl text-slate-800">Competencias</h1>
                    <p className="text-xs text-slate-500 font-medium">Torneos Activos e Historial</p>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

                {tournaments.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <Trophy size={64} className="mx-auto text-slate-200 mb-6" />
                        <h3 className="text-lg font-bold text-slate-500">Sin Competencias</h3>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">
                            Actualmente tu club no está inscripto en ningún torneo activo.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tournaments.map((t) => (
                            <Link key={t.id} href={`/club/competitions/${t.id}`}>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition group cursor-pointer relative overflow-hidden">

                                    {/* Status Strip */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.status === 'activo' ? 'bg-green-500' :
                                        t.status === 'finalizado' ? 'bg-slate-400' : 'bg-yellow-400'
                                        }`} />

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">

                                            {/* Icon Container */}
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                                                <Trophy size={24} />
                                            </div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                        {t.season}
                                                    </span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${t.status === 'activo' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        t.status === 'finalizado' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                        }`}>
                                                        {t.status}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-blue-700 transition">
                                                    {t.name}
                                                </h3>

                                                <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-400">
                                                    <span className="flex items-center gap-1"><Medal size={14} /> {t.category} {t.gender}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition group-hover:translate-x-1" size={24} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-800 text-sm border border-blue-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p>
                        Si no ves un torneo aquí, contacta a la <strong>Secretaría de Competencias</strong> para verificar tu inscripción.
                    </p>
                </div>

            </div>
        </div>
    );
}
