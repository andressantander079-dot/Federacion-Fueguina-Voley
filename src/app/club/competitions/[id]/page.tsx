'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { calculateStandings, StandingRow } from '@/lib/tournamentUtils';
import { ArrowLeft, Trophy, Calendar, FileText, Download, MapPin, Clock, AlertTriangle, ChevronDown, Check } from 'lucide-react';

export default function CompetitionDetail() {
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [standings, setStandings] = useState<StandingRow[]>([]);
    const [activeTab, setActiveTab] = useState<'standings' | 'fixture' | 'sheets'>('standings');
    const [myTeamId, setMyTeamId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [tournamentId]);

    async function fetchData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            // 1. Get My Team ID
            const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
            const currentTeamId = profile?.club_id;
            setMyTeamId(currentTeamId);

            // 2. Tournament Details
            const { data: t, error: tError } = await supabase.from('tournaments')
                .select('*, category:categories(name)')
                .eq('id', tournamentId)
                .single();

            if (tError) throw tError;
            setTournament(t);

            // 3. Matches (for Fixture & Standings)
            const { data: m, error: mError } = await supabase
                .from('matches')
                .select(`
          *,
          venue:venues(name),
          home_team:teams!home_team_id(id, name, logo_url),
          away_team:teams!away_team_id(id, name, logo_url)
        `)
                .eq('tournament_id', tournamentId)
                .order('date_time', { ascending: true }); // Chronological for Fixture

            if (mError) throw mError;
            setMatches(m || []);

            // 4. Calculate Standings
            // We need unique participants first
            const uniqueTeamsMap = new Map();
            m?.forEach((match: any) => {
                if (match.home_team) uniqueTeamsMap.set(match.home_team.id, match.home_team);
                if (match.away_team) uniqueTeamsMap.set(match.away_team.id, match.away_team);
            });
            const participants = Array.from(uniqueTeamsMap.values()).map((t: any) => ({ id: t.id, name: t.name }));

            const calculatedStandings = calculateStandings(
                m || [],
                t.point_system || 'fivb',
                participants
            );
            setStandings(calculatedStandings);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- RENDER HELPERS ---

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'programado': return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-100">Programado</span>
            case 'finalizado': return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase border border-slate-200">Finalizado</span>
            case 'en_curso': return <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 text-[10px] font-bold uppercase border border-green-100 animate-pulse">En Juego</span>
            default: return <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-400 text-[10px] font-bold uppercase">{status}</span>
        }
    };

    const isMyMatch = (m: any) => {
        return m.home_team_id === myTeamId || m.away_team_id === myTeamId;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">

            {/* HEADER */}
            <div className="bg-white border-b px-6 py-4 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/club/competitions" className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} className="text-slate-600" /></Link>
                    <div>
                        <h1 className="font-black text-xl text-slate-800 leading-none">{tournament?.name}</h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">{tournament?.category?.name} {tournament?.gender} • {tournament?.season}</p>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('standings')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'standings' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Trophy size={16} /> <span className="hidden md:inline">Posiciones</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('fixture')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'fixture' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Calendar size={16} /> <span className="hidden md:inline">Fixture</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sheets')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'sheets' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <FileText size={16} /> <span className="hidden md:inline">Planillas</span>
                    </button>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-5xl mx-auto">

                {/* --- TAB: POSICIONES --- */}
                {activeTab === 'standings' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-center">#</th>
                                        <th className="px-4 py-3">Equipo</th>
                                        <th className="px-4 py-3 text-center">PTS</th>
                                        <th className="px-4 py-3 text-center hidden md:table-cell">PJ</th>
                                        <th className="px-4 py-3 text-center hidden md:table-cell">PG</th>
                                        <th className="px-4 py-3 text-center hidden md:table-cell">PP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {standings.map((row, index) => (
                                        <tr key={row.id} className={`hover:bg-slate-50 transition ${row.id === myTeamId ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-4 py-3 text-center font-bold text-slate-400">{index + 1}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-2">
                                                {row.id === myTeamId && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                                {row.name}
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-slate-800">{row.pts}</td>
                                            <td className="px-4 py-3 text-center text-slate-500 hidden md:table-cell">{row.pg + row.pp}</td>
                                            <td className="px-4 py-3 text-center text-green-600 font-medium hidden md:table-cell">{row.pg}</td>
                                            <td className="px-4 py-3 text-center text-red-500 font-medium hidden md:table-cell">{row.pp}</td>
                                        </tr>
                                    ))}
                                    {standings.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                                                Aún no hay datos registrados en la tabla.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB: FIXTURE --- */}
                {activeTab === 'fixture' && (
                    <div className="space-y-4">
                        {matches.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">No hay partidos programados aún.</div>
                        ) : (
                            matches.map(m => (
                                <div key={m.id} className={`bg-white rounded-xl border p-4 shadow-sm transition hover:shadow-md ${isMyMatch(m) ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.round || 'Fecha General'}</span>
                                        {getStatusBadge(m.status)}
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        {/* Local */}
                                        <div className={`flex-1 flex flex-col items-center gap-2 ${m.home_team_id === myTeamId ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>
                                            <img src={m.home_team?.logo_url || '/placeholder.png'} className="w-10 h-10 object-contain" />
                                            <span className="text-center text-sm leading-tight">{m.home_team?.name}</span>
                                        </div>

                                        {/* VS / Score */}
                                        <div className="flex flex-col items-center shrink-0 w-20">
                                            {m.status === 'finalizado' ? (
                                                <div className="text-2xl font-black text-slate-800 tracking-tighter">
                                                    {m.home_score} - {m.away_score}
                                                </div>
                                            ) : (
                                                <div className="text-sm font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded">VS</div>
                                            )}
                                            {m.status === 'finalizado' && <span className="text-[10px] text-slate-400 mt-1">{m.set_scores?.join(', ')}</span>}
                                        </div>

                                        {/* Visita */}
                                        <div className={`flex-1 flex flex-col items-center gap-2 ${m.away_team_id === myTeamId ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>
                                            <img src={m.away_team?.logo_url || '/placeholder.png'} className="w-10 h-10 object-contain" />
                                            <span className="text-center text-sm leading-tight">{m.away_team?.name}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
                                        {m.date_time && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-slate-300" />
                                                {new Date(m.date_time).toLocaleDateString()}
                                            </div>
                                        )}
                                        {m.date_time && (
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-300" />
                                                {new Date(m.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                        {m.venue && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-slate-300" />
                                                {m.venue.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- TAB: PLANILLAS --- */}
                {activeTab === 'sheets' && (
                    <div className="grid gap-3">
                        {matches.filter(m => m.status === 'finalizado').length === 0 ? (
                            <div className="text-center py-10 text-slate-400">No hay partidos finalizados con planilla disponible.</div>
                        ) : (
                            matches.filter(m => m.status === 'finalizado').map(m => (
                                <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-blue-300 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">
                                                {m.home_team?.name} vs {m.away_team?.name}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(m.date_time).toLocaleDateString()} • {m.home_score}-{m.away_score}
                                            </p>
                                        </div>
                                    </div>

                                    {m.sheet_url ? (
                                        <a
                                            href={m.sheet_url}
                                            target="_blank"
                                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-black transition shadow-lg shadow-slate-200"
                                        >
                                            <Download size={14} /> Descargar
                                        </a>
                                    ) : (
                                        <span className="text-xs font-medium text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg">
                                            No cargada
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
