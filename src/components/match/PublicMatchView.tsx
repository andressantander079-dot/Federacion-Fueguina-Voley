'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PublicMatchView() {
    const params = useParams();
    const matchId = params.id as string;
    const [supabase] = useState(() => createClient());

    const [matchData, setMatchData] = useState<any>(null);
    const [sponsors, setSponsors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!matchId) return;

        const fetchData = async () => {
            const { data } = await supabase
                .from('matches')
                .select(`
                    *,
                    home_team:teams!home_team_id(name, shield_url),
                    away_team:teams!away_team_id(name, shield_url),
                    category:categories(name)
                `)
                .eq('id', matchId)
                .single();

            if (data) {
                const sheet = data.sheet_data || {};
                setMatchData({
                    // Hydrate basic score data
                    sets: sheet.sets_history || [],
                    currentSetIdx: sheet.current_set_idx || 0,
                    // Hydrate rosters
                    posHome: sheet.pos_home || [],
                    posAway: sheet.pos_away || [],
                    benchHome: sheet.bench_home || [],
                    benchAway: sheet.bench_away || [],
                    // Hydrate Staff
                    staff: sheet.staff || { referee1: '', referee2: '', scorer: '' },
                    // Metadata
                    homeName: data.home_team?.name || 'Local',
                    homeShield: data.home_team?.shield_url,
                    // Default colors if not present
                    homeColor: data.home_team?.main_color || 'blue',
                    awayName: data.away_team?.name || 'Visita',
                    awayShield: data.away_team?.shield_url,
                    awayColor: data.away_team?.main_color || 'red',
                    categoryName: data.category?.name,
                    date: data.date,
                    time: data.time,
                    phase: data.phase,
                    gym: data.location
                });
            }

            const { data: sponsorsData } = await supabase.from('sponsors').select('*').eq('active', true).order('display_order', { ascending: true });
            if (sponsorsData) setSponsors(sponsorsData);

            setLoading(false);
        };

        fetchData();

        const channel = supabase
            .channel(`public_match:${matchId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [matchId]);

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold animate-pulse">Cargando...</div>;
    if (!matchData) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold">Partido no encontrado.</div>;

    const { sets, currentSetIdx, posHome, posAway, benchHome, benchAway, staff, homeName, awayName, homeShield, awayShield, categoryName, date, time, phase } = matchData;
    const currentSet = sets[currentSetIdx] || { home: 0, away: 0, number: 1 };

    // @ts-ignore
    const renderPlayerList = (posArr, benchArr) => {
        // @ts-ignore
        const all = [...(posArr || []), ...(benchArr || [])]
            .filter(p => p && p.number !== undefined) // Filter nulls and missing numbers
            .sort((a, b) => (a.number || 0) - (b.number || 0));

        return all.map((p: any) => (
            <div key={p.id || p.number} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 transition">
                <span className="font-black text-xl w-8 text-right text-zinc-500">{p.number}</span>
                <span className="font-bold text-base text-zinc-200 uppercase truncate flex-1">{p.name}</span>
                {p.isLibero && <span className="bg-purple-900/50 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-purple-500/20">Líbero</span>}
                {p.isCaptain && <span className="bg-yellow-900/50 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-yellow-500/20">Capitán</span>}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-hidden flex flex-col items-center py-6">

            {/* 1. HEADER & SCOREBOARD (Top Section) */}
            <header className="w-full max-w-7xl px-4 mb-8 flex flex-col items-center">

                {/* Back & Title */}
                <div className="absolute top-6 left-6 flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-bold uppercase tracking-wider">
                        <ArrowLeft size={14} /> Volver al Inicio
                    </Link>
                </div>

                {/* METADATA ROW */}
                <div className="flex gap-6 mt-12 mb-2 md:mt-0 md:mb-0 items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                        📅 {date || 'HOY'}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                        ⏰ {time?.slice(0, 5) || 'A CONFIRMAR'}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-xs font-bold text-blue-400 uppercase">
                        🏆 {phase || categoryName || 'Liga'}
                    </div>
                </div>

                <div className="absolute top-6 right-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">En Vivo</span>
                    </div>
                </div>

                {/* Main Scoreboard */}
                <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex items-center gap-12 mt-8 md:mt-4">

                    {/* Home Score */}
                    <div className="flex flex-col items-center">
                        <div className="text-6xl font-black text-white leading-none">{currentSet.home}</div>
                        <div className="w-12 h-1 bg-blue-500 rounded-full mt-2"></div>
                    </div>

                    {/* Badge */}
                    <div className="flex flex-col items-center px-6">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Set Actual</span>
                        <div className="text-4xl font-black text-white bg-zinc-800 px-6 py-2 rounded-xl border border-white/5">
                            {currentSet.number}
                        </div>
                        <div className="flex gap-1 mt-3">
                            {sets.map((s: any, i: number) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${s.finished ? 'bg-zinc-500' : 'bg-zinc-800'}`}></div>
                            ))}
                        </div>
                    </div>

                    {/* Away Score */}
                    <div className="flex flex-col items-center">
                        <div className="text-6xl font-black text-white leading-none">{currentSet.away}</div>
                        <div className="w-12 h-1 bg-red-500 rounded-full mt-2"></div>
                    </div>

                </div>

                {/* Referees Row */}
                <div className="flex gap-4 mt-6 text-xs text-zinc-500 font-medium">
                    {staff.referee1 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                            <User size={12} /> <span className="uppercase">1º: {staff.referee1}</span>
                        </div>
                    )}
                    {staff.scorer && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                            <User size={12} /> <span className="uppercase">Planillera/o: {staff.scorer}</span>
                        </div>
                    )}
                    {staff.referee2 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                            <User size={12} /> <span className="uppercase">2º: {staff.referee2}</span>
                        </div>
                    )}
                </div>

            </header>

            {/* 2. ROSTERS (Two Columns Layout) */}
            <main className="flex-1 w-full max-w-7xl px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start overflow-hidden">

                {/* HOME CARD */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[600px]">
                    <div className="bg-blue-600/90 p-6 flex items-center justify-between backdrop-blur-sm">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">{homeName}</h2>
                        {homeShield && <img src={homeShield} className="w-12 h-12 object-contain drop-shadow-md" />}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/50 p-2">
                        {renderPlayerList(posHome, benchHome)}
                        {[...posHome, ...benchHome].length === 0 && <div className="text-center py-10 text-zinc-700 italic">No hay jugadores cargados</div>}
                    </div>
                </div>

                {/* AWAY CARD */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[600px]">
                    <div className="bg-red-600/90 p-6 flex items-center justify-between backdrop-blur-sm">
                        {awayShield && <img src={awayShield} className="w-12 h-12 object-contain drop-shadow-md" />}
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight text-right">{awayName}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/50 p-2">
                        {renderPlayerList(posAway, benchAway)}
                        {[...posAway, ...benchAway].length === 0 && <div className="text-center py-10 text-zinc-700 italic">No hay jugadores cargados</div>}
                    </div>
                </div>

            </main>

            {/* 3. FOOTER SPONSORS */}
            <footer className="w-full max-w-7xl px-4 mt-8 pb-4">
                {sponsors.length > 0 ? (
                    <div className="min-h-24 bg-zinc-900/50 rounded-2xl border border-white/5 flex flex-wrap items-center justify-center gap-8 overflow-hidden py-4 px-8">
                        {sponsors.map(s => (
                            s.website ? (
                                <a key={s.id} href={s.website} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition">
                                    <img src={s.logo_url} alt={s.name} className="max-h-16 max-w-[150px] object-contain" />
                                </a>
                            ) : (
                                <img key={s.id} src={s.logo_url} alt={s.name} className="max-h-16 max-w-[150px] object-contain opacity-80 hover:opacity-100 transition" />
                            )
                        ))}
                    </div>
                ) : (
                    <div className="h-24 bg-zinc-900/50 rounded-2xl border border-white/5 flex items-center justify-center gap-12 overflow-hidden">
                        <span className="text-zinc-800 font-black uppercase text-3xl">Espacio Publicitario</span>
                    </div>
                )}
            </footer>
        </div>
    );
}
