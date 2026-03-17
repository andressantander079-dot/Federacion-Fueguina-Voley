'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Trophy, Calendar, MapPin, Volleyball, Users, Activity, Clock } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SponsorsBanner from '@/components/SponsorsBanner';

export default function LiveMatchBoard() {
    const { id: matchId } = useParams();
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    const [isLoading, setIsLoading] = useState(true);
    const [matchStatus, setMatchStatus] = useState('scheduled');
    const [lastSync, setLastSync] = useState('');

    const [teamsInfo, setTeamsInfo] = useState<{
        home: { name: string, shield: string | null },
        away: { name: string, shield: string | null },
        category: string,
        gender: string,
        phase: string,
        gym: string,
        date: string
    } | null>(null);

    const [sheetData, setSheetData] = useState<any>(null);

    // Fetch initial Data
    useEffect(() => {
        if (!matchId) return;

        const fetchData = async () => {
            const { data, error } = await supabase.from('matches').select(`
                status,
                scheduled_time,
                round,
                court_name,
                sheet_data,
                home_team:teams!home_team_id(id, name, shield_url),
                away_team:teams!away_team_id(id, name, shield_url),
                category:categories(name),
                tournament:tournaments(gender)
            `).eq('id', matchId).single();

            if (error) {
                console.error("Error fetching match live data:", error);
                return;
            }

            if (data) {
                // Determine Status
                if (data.status === 'live' || data.status === 'en_curso') setMatchStatus('live');
                else if (data.status === 'finalizado') setMatchStatus('finished');
                else setMatchStatus('scheduled');

                const getJoinData = (d: any) => Array.isArray(d) ? d[0] : d;
                
                const hc = getJoinData(data.home_team);
                const ac = getJoinData(data.away_team);
                const cat = getJoinData(data.category);
                const tourn = getJoinData(data.tournament);

                setTeamsInfo({
                    home: { name: hc?.name || 'Local', shield: hc?.shield_url || null },
                    away: { name: ac?.name || 'Visita', shield: ac?.shield_url || null },
                    category: cat?.name || 'Voley',
                    gender: tourn?.gender || 'Masculino',
                    phase: data.round || 'Fase Regular',
                    gym: data.court_name || 'Polivalente',
                    date: data.scheduled_time ? new Date(data.scheduled_time).toLocaleDateString() : 'A Conf.'
                });

                if (data.sheet_data) {
                    setSheetData(data.sheet_data);
                }

                setLastSync(new Date().toLocaleTimeString());
                setIsLoading(false);
            }
        };

        fetchData();

        // Realtime
        const channel = supabase
            .channel(`match_live:${matchId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${matchId}`
            }, (payload) => {
                const newData = payload.new as any;
                
                if (newData.status === 'live' || newData.status === 'en_curso') setMatchStatus('live');
                else if (newData.status === 'finalizado') setMatchStatus('finished');
                else setMatchStatus('scheduled');

                if (newData.sheet_data) {
                    setSheetData(newData.sheet_data);
                    setLastSync(new Date().toLocaleTimeString());
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, supabase]);


    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <Volleyball size={48} className="animate-spin text-blue-500 mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest animate-pulse">Cargando Tablero...</h2>
            </div>
        );
    }

    // Processing Score
    const sets = sheetData?.sets_history || [{ home: 0, away: 0, number: 1, finished: false }];
    const currentSetIdx = sheetData?.current_set_idx || 0;
    const currentSet = sets[currentSetIdx] || sets[sets.length - 1];

    // Global Sets Score
    const setsWonHome = sets.filter((s: any) => s.finished && s.home > s.away).length;
    const setsWonAway = sets.filter((s: any) => s.finished && s.away > s.home).length;

    const isServingOut = sheetData?.serving_team; // 'home' or 'away'

    // Extract Full Rosters
    const homeRoster = [...(sheetData?.pos_home || []), ...(sheetData?.bench_home || [])]
        .filter(Boolean)
        .sort((a: any, b: any) => a.number - b.number);
        
    const awayRoster = [...(sheetData?.pos_away || []), ...(sheetData?.bench_away || [])]
        .filter(Boolean)
        .sort((a: any, b: any) => a.number - b.number);

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white font-sans overflow-x-hidden selection:bg-blue-500/30 flex flex-col">
            
            {/* TOP BAR */}
            <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50 shadow-xl">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                    <ArrowLeft size={16} /> 
                    <span className="font-bold text-xs uppercase tracking-wider">Volver</span>
                </Link>

                <div className="flex gap-4 md:gap-8 items-center text-xs ml-4 md:ml-0 overflow-x-auto custom-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Trophy size={14} className="text-blue-500" /> {teamsInfo?.phase} - {teamsInfo?.category}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium hidden md:flex">
                        <MapPin size={14} className="text-red-500" /> {teamsInfo?.gym}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Calendar size={14} className="text-green-500" /> {teamsInfo?.date}
                    </div>
                </div>

                <div className="flex items-center gap-4 border-l border-slate-700 pl-4 shrink-0">
                    <div className="text-[10px] text-right md:block hidden">
                        <p className="text-slate-400 uppercase tracking-widest leading-tight">Última Sincronización</p>
                        <p className="text-blue-400 font-mono font-bold">{lastSync || '---'}</p>
                    </div>
                    {matchStatus === 'live' ? (
                        <div className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block"></span>
                            <span className="font-bold text-xs uppercase tracking-widest">En Vivo</span>
                        </div>
                    ) : matchStatus === 'finished' ? (
                        <div className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 text-xs font-bold uppercase tracking-widest">
                            Finalizado
                        </div>
                    ) : (
                        <div className="bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full border border-blue-800 text-xs font-bold uppercase tracking-widest">
                            Programado
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 flex flex-col">
                
                {/* 1. SCOREBOARD SUPERIOR (PANTALLA LED) */}
                <div className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 py-12 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                        
                        {/* TEAM LOCAL */}
                        <div className="flex flex-col items-center flex-1 w-full relative">
                            {isServingOut === 'home' && (
                                <div className="absolute top-0 right-0 md:-right-8 animate-bounce transition-all">
                                    <Volleyball size={24} className="text-yellow-400 fill-yellow-400/20" />
                                </div>
                            )}
                            <div className="w-24 h-24 bg-white rounded-2xl p-2 mb-4 shadow-2xl flex items-center justify-center transform hover:scale-105 transition duration-500">
                                {teamsInfo?.home.shield ? (
                                    <img src={teamsInfo.home.shield} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-4xl font-black text-blue-900">{teamsInfo?.home.name.charAt(0)}</span>
                                )}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-center text-white truncate max-w-full uppercase tracking-tight text-shadow-sm">{teamsInfo?.home.name}</h2>
                        </div>

                        {/* CENTER SCORE PANEL */}
                        <div className="flex flex-col items-center gap-6 shrink-0 relative bg-slate-900/60 p-8 rounded-[3rem] border border-slate-800 shadow-inner">
                            {/* Sets Global */}
                            <div className="absolute -top-4 bg-slate-800 text-white px-6 py-1.5 rounded-full font-black text-sm uppercase tracking-widest shadow-lg border border-slate-700 flex items-center gap-2">
                                <Trophy size={14} className="text-yellow-500" /> Marcador Global
                            </div>
                            
                            <div className="flex items-center gap-6 md:gap-12 mt-4">
                                <div className="text-8xl md:text-[10rem] font-black text-white mix-blend-screen drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] tabular-nums leading-none tracking-tighter w-32 md:w-48 text-right pr-4">
                                    {currentSet.home}
                                </div>
                                <div className="flex flex-col items-center gap-3">
                                    {/* Global Sets Box */}
                                    <div className="flex items-center justify-center gap-4 bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)_inset]">
                                        <span className="text-4xl md:text-5xl font-black text-blue-500">{setsWonHome}</span>
                                        <span className="text-slate-600 text-2xl font-bold">SETS</span>
                                        <span className="text-4xl md:text-5xl font-black text-red-500">{setsWonAway}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Set {currentSet.number}</span>
                                </div>
                                <div className="text-8xl md:text-[10rem] font-black text-white mix-blend-screen drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] tabular-nums leading-none tracking-tighter w-32 md:w-48 pl-4">
                                    {currentSet.away}
                                </div>
                            </div>
                        </div>

                        {/* TEAM AWAY */}
                        <div className="flex flex-col items-center flex-1 w-full relative">
                            {isServingOut === 'away' && (
                                <div className="absolute top-0 left-0 md:-left-8 animate-bounce transition-all">
                                    <Volleyball size={24} className="text-yellow-400 fill-yellow-400/20" />
                                </div>
                            )}
                            <div className="w-24 h-24 bg-white rounded-2xl p-2 mb-4 shadow-2xl flex items-center justify-center transform hover:scale-105 transition duration-500">
                                {teamsInfo?.away.shield ? (
                                    <img src={teamsInfo.away.shield} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-4xl font-black text-red-900">{teamsInfo?.away.name.charAt(0)}</span>
                                )}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-center text-white truncate max-w-full uppercase tracking-tight text-shadow-sm">{teamsInfo?.away.name}</h2>
                        </div>
                    </div>
                </div>

                {/* 2. COURT & STATS (BOTTOM SECTION) */}
                <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto w-full mt-4">
                    
                    {/* LEFT COL: Planteles Completos */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest font-bold text-sm mb-2">
                            <Users size={18} /> Planteles Oficiales
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4 h-full">
                            {/* Roster Home */}
                            <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-xl overflow-y-auto max-h-[350px] custom-scrollbar">
                                <h4 className="text-center font-black text-blue-400 uppercase tracking-widest text-xs mb-4 border-b border-slate-800 pb-2">
                                    {teamsInfo?.home.name || 'Local'}
                                </h4>
                                <div className="space-y-2">
                                    {homeRoster.length === 0 && <p className="text-center text-xs text-slate-500">Sin jugadores registrados</p>}
                                    {homeRoster.map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                                            <div className="w-8 h-8 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                                                {p.number}
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-bold text-slate-200 truncate">{p.name}</span>
                                                {p.isLibero && <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest">Líbero</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Roster Away */}
                            <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-xl overflow-y-auto max-h-[350px] custom-scrollbar">
                                <h4 className="text-center font-black text-red-400 uppercase tracking-widest text-xs mb-4 border-b border-slate-800 pb-2">
                                    {teamsInfo?.away.name || 'Visita'}
                                </h4>
                                <div className="space-y-2">
                                    {awayRoster.length === 0 && <p className="text-center text-xs text-slate-500">Sin jugadores registrados</p>}
                                    {awayRoster.map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                                            <div className="w-8 h-8 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center font-black text-xs shrink-0">
                                                {p.number}
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-bold text-slate-200 truncate">{p.name}</span>
                                                {p.isLibero && <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest">Líbero</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: Sets Table & Events */}
                    <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
                        {/* Summary Sets Table */}
                        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-xl">
                            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                <Activity size={16} /> Resumen de Sets
                            </h3>
                            <div className="space-y-3">
                                {sets.map((s: any, idx: number) => (
                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${idx === currentSetIdx ? 'bg-slate-800 border-slate-700' : 'bg-slate-950/50 border-slate-800/50'} transition-all`}>
                                        <div className="w-10 text-center font-black text-slate-500">S{s.number}</div>
                                        <div className={`font-black text-xl ${s.home > s.away ? 'text-white' : 'text-slate-400'}`}>
                                            {s.home}
                                        </div>
                                        <div className="w-12 text-center text-xs font-bold text-slate-600 bg-slate-950 py-1 rounded-md">
                                            {s.finished ? 'FIN' : 'ACT'}
                                        </div>
                                        <div className={`font-black text-xl ${s.away > s.home ? 'text-white' : 'text-slate-400'}`}>
                                            {s.away}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Warnings / Sanctions Mini Feed */}
                        {sheetData?.sanctionsLog && sheetData.sanctionsLog.length > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
                                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Clock size={16} /> Historial Sanciones
                                </h3>
                                <div className="flex-1 overflow-y-auto max-h-40 space-y-2 custom-scrollbar pr-2">
                                    {sheetData.sanctionsLog.slice().reverse().map((sl: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-1 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-300">{sl.playerName} ({sl.team === 'home' ? 'L' : 'V'})</span>
                                                <span className="font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Set {sl.setNum}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {sl.type === 'yellow' ? <span className="w-2 h-3 rounded-sm bg-yellow-500 block shadow-[0_0_5px_rgba(234,179,8,0.5)]"></span> :
                                                 sl.type === 'red' ? <span className="w-2 h-3 rounded-sm bg-red-600 block shadow-[0_0_5px_rgba(220,38,38,0.5)]"></span> :
                                                 sl.type === 'expulsion' ? <div className="flex gap-0.5"><span className="w-2 h-3 rounded-sm bg-yellow-500 block"></span><span className="w-2 h-3 rounded-sm bg-red-600 block"></span></div> :
                                                 <span className="text-red-600 font-bold">Descalificado</span>}
                                                <span className="text-slate-400">{sl.homeScore} - {sl.awayScore}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. SPONSORS */}
                <div className="mb-8">
                    <SponsorsBanner />
                </div>
            </main>
        </div>
    );
}
