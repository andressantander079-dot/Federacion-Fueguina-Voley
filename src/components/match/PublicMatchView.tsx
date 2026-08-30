'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Radio, User, Trophy, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useParams } from 'next/navigation';
import { formatArgentinaDateLiteral, formatArgentinaTimeLiteral } from '@/lib/dateUtils';
import { resolveTeamColors, getContrastColor } from '@/lib/colorUtils';

export default function PublicMatchView() {
    const params = useParams();
    const matchId = params.id as string;
    const [supabase] = useState(() => createClient());

    const [matchData, setMatchData] = useState<any>(null);
    const [sponsors, setSponsors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const prevScoreHomeRef = useRef<number | null>(null);
    const prevScoreAwayRef = useRef<number | null>(null);

    // Estado del temporizador de redirección de 30 segundos
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
    const confettiFiredRef = useRef<boolean>(false);

    const triggerConfetti = async (xRatio: number, primaryColor: string, isMatchPoint: boolean = false) => {
        if (typeof window === 'undefined') return;
        try {
            const confetti = (await import('canvas-confetti')).default;
            const colors = isMatchPoint 
                ? ['#FFD700', '#FFA500', '#FFFFFF', primaryColor]
                : [primaryColor, '#ffffff'];

            confetti({
                particleCount: isMatchPoint ? 60 : 25,
                spread: isMatchPoint ? 100 : 55,
                origin: { x: xRatio, y: 0.35 },
                colors
            });
        } catch (err) {
            console.error("Error al disparar confeti:", err);
        }
    };

    useEffect(() => {
        if (!matchId) return;

        const fetchSponsors = async () => {
            const { data: sponsorsData } = await supabase.from('sponsors').select('*').eq('active', true).order('display_order', { ascending: true });
            if (sponsorsData) setSponsors(sponsorsData);
        };

        const fetchMatchInfo = async () => {
            const { data } = await supabase
                .from('matches')
                .select(`
                    *,
                    home_team:teams!home_team_id(id, name, shield_url),
                    away_team:teams!away_team_id(id, name, shield_url),
                    category:categories(name),
                    tournament:tournaments!tournament_id(name, gender)
                `)
                .eq('id', matchId)
                .single();

            if (data) {
                const sheet = data.sheet_data || {};
                const sets = sheet.sets_history || sheet.sets || [];
                const currentIdx = sheet.current_set_idx || 0;
                const currentSet = sets[currentIdx] || { home: 0, away: 0, number: 1 };

                const currentHomePts = currentSet.home ?? currentSet.homeScore ?? currentSet.score_home ?? 0;
                const currentAwayPts = currentSet.away ?? currentSet.awayScore ?? currentSet.score_away ?? 0;

                const homeColors = resolveTeamColors(data.home_team?.name, data.home_team, sheet.teamColors?.home, true);
                const awayColors = resolveTeamColors(data.away_team?.name, data.away_team, sheet.teamColors?.away, false, homeColors.primary);

                // Detección de Delta de Puntos (Confeti Reactivo SSR-Safe)
                if (prevScoreHomeRef.current !== null && currentHomePts > prevScoreHomeRef.current) {
                    const isFinalMatch = (data.round || '').toLowerCase().includes('final') || (data.tournament?.name || '').toLowerCase().includes('final');
                    triggerConfetti(0.25, homeColors.primary, isFinalMatch);
                } else if (prevScoreAwayRef.current !== null && currentAwayPts > prevScoreAwayRef.current) {
                    const isFinalMatch = (data.round || '').toLowerCase().includes('final') || (data.tournament?.name || '').toLowerCase().includes('final');
                    triggerConfetti(0.75, awayColors.primary, isFinalMatch);
                }

                prevScoreHomeRef.current = currentHomePts;
                prevScoreAwayRef.current = currentAwayPts;

                setMatchData({
                    sets,
                    currentSetIdx: currentIdx,
                    currentSetHomePts: currentHomePts,
                    currentSetAwayPts: currentAwayPts,
                    posHome: sheet.pos_home || [],
                    posAway: sheet.pos_away || [],
                    benchHome: sheet.bench_home || [],
                    benchAway: sheet.bench_away || [],
                    staff: sheet.staff || { referee1: '', referee2: '', scorer: '' },
                    homeName: data.home_team?.name || 'Local',
                    homeShield: data.home_team?.shield_url,
                    homeColors,
                    awayName: data.away_team?.name || 'Visita',
                    awayShield: data.away_team?.shield_url,
                    awayColors,
                    categoryName: data.category?.name || 'Sub-14',
                    tournamentName: data.tournament?.name || 'Oficial',
                    bestOfSets: sheet.metadata?.bestOfSets || 5,
                    round: data.round || 'Fecha 1',
                    date: data.scheduled_time ? formatArgentinaDateLiteral(data.scheduled_time).split(',').slice(0, 2).join(',').trim() : 'HOY',
                    time: data.scheduled_time ? formatArgentinaTimeLiteral(data.scheduled_time) : 'A CONFIRMAR',
                    status: data.status,
                    homeScore: data.home_score,
                    awayScore: data.away_score
                });
            }
            setLoading(false);
        };

        fetchSponsors();
        fetchMatchInfo();

        const intervalId = setInterval(fetchMatchInfo, 1000);

        const channel = supabase
            .channel(`public_match:${matchId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, () => {
                fetchMatchInfo();
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channel); 
            clearInterval(intervalId);
        };
    }, [matchId, supabase]);

    // Detección de Partido Finalizado e Inserción de Confeti + Temporizador de Redirección (30s)
    useEffect(() => {
        if (!matchData) return;

        const { sets, status, homeScore, awayScore, bestOfSets, homeColors, awayColors } = matchData;
        const bestOf = bestOfSets || 5;
        const targetSets = Math.ceil(bestOf / 2);

        const calculatedSetsHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
        const calculatedSetsAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

        const setsWonHome = homeScore ?? calculatedSetsHome;
        const setsWonAway = awayScore ?? calculatedSetsAway;

        const isMatchFinishedByScore = setsWonHome >= targetSets || setsWonAway >= targetSets;
        const isFinishedMatch = status === 'finalizado' || status === 'finished' || status === 'completado' || isMatchFinishedByScore;

        if (isFinishedMatch && !confettiFiredRef.current) {
            confettiFiredRef.current = true;
            
            const winningColor = setsWonHome > setsWonAway ? homeColors?.primary : awayColors?.primary;
            const primaryHex = winningColor || '#FFD700';

            // Ráfaga múltiple de confeti celebratorio
            triggerConfetti(0.5, primaryHex, true);
            setTimeout(() => triggerConfetti(0.2, primaryHex, true), 350);
            setTimeout(() => triggerConfetti(0.8, primaryHex, true), 700);

            // Iniciar temporizador de redirección de 30 segundos
            setRedirectCountdown(30);
        }
    }, [matchData]);

    // Contador regresivo de 30 segundos para redirigir al Inicio
    useEffect(() => {
        if (redirectCountdown === null) return;
        if (redirectCountdown <= 0) {
            window.location.href = '/';
            return;
        }

        const timer = setTimeout(() => {
            setRedirectCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearTimeout(timer);
    }, [redirectCountdown]);

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold animate-pulse">Cargando Seguimiento en Vivo...</div>;
    if (!matchData) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold">Partido no encontrado.</div>;

    const { sets, currentSetIdx, currentSetHomePts, currentSetAwayPts, posHome, posAway, benchHome, benchAway, staff, homeColors, awayColors, homeName, awayName, homeShield, awayShield, categoryName, tournamentName, bestOfSets, round, date, time, status, homeScore, awayScore } = matchData;
    const currentSetNumber = sets[currentSetIdx]?.number || (currentSetIdx + 1);

    const bestOf = bestOfSets || 5;
    const targetSets = Math.ceil(bestOf / 2);

    const calculatedSetsHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
    const calculatedSetsAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

    const setsWonHome = homeScore ?? calculatedSetsHome;
    const setsWonAway = awayScore ?? calculatedSetsAway;

    const isMatchFinishedByScore = setsWonHome >= targetSets || setsWonAway >= targetSets;
    const isFinished = status === 'finalizado' || status === 'finished' || status === 'completado' || isMatchFinishedByScore;
    const isSuspended = status === 'suspendido' || status === 'suspended';

    const winnerName = setsWonHome > setsWonAway ? homeName : setsWonAway > setsWonHome ? awayName : null;

    const renderPlayerList = (posArr: any[], benchArr: any[]) => {
        const all = [...(posArr || []), ...(benchArr || [])]
            .filter(p => p && p.number !== undefined)
            .sort((a, b) => (a.number || 0) - (b.number || 0));

        return all.map((p: any) => (
            <div key={p.id || p.number} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 transition">
                <span className="font-black text-xl w-8 text-right text-zinc-500">#{p.number}</span>
                <span className="font-bold text-base text-zinc-200 uppercase truncate flex-1">{p.name}</span>
                {p.isLibero && <span className="bg-purple-900/50 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-purple-500/20">Líbero</span>}
                {p.isCaptain && <span className="bg-yellow-900/50 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-yellow-500/20">Capitán</span>}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-hidden flex flex-col items-center py-6">

            {/* 1. HEADER & SCOREBOARD */}
            <header className="w-full max-w-7xl px-4 mb-8 flex flex-col items-center">

                {/* Back & Status */}
                <div className="w-full flex items-center justify-between mb-6">
                    <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-bold uppercase tracking-wider">
                        <ArrowLeft size={14} /> Volver al Inicio
                    </Link>
                    {isFinished ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/40 rounded-full">
                            <Trophy size={14} className="text-yellow-400" />
                            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Finalizado</span>
                        </div>
                    ) : isSuspended ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/40 rounded-full">
                            <AlertTriangle size={14} className="text-orange-400" />
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Suspendido</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full animate-pulse">
                            <Radio size={14} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">En Vivo</span>
                        </div>
                    )}
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap gap-3 mb-6 items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                        📅 {date || 'HOY'}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                        ⏰ {time || 'A CONFIRMAR'}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-xs font-bold text-blue-400 uppercase">
                        🏆 {tournamentName} • {categoryName} • {round}
                    </div>
                </div>

                {/* ANUNCIO DORADO DE GANADOR Y CONTEO REGRESIVO DE 30 SEGUNDOS */}
                {isFinished && (
                    <div className="w-full max-w-4xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-500/60 rounded-3xl p-6 mb-8 flex flex-col items-center gap-4 text-center shadow-2xl shadow-yellow-500/20 animate-in fade-in zoom-in-95">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shrink-0 animate-bounce">
                                    <Trophy size={32} />
                                </div>
                                <div className="text-left">
                                    <span className="text-xs font-black text-yellow-400 uppercase tracking-widest block">¡PARTIDO FINALIZADO!</span>
                                    <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                                        {winnerName ? <>¡Ganador: <span className="text-yellow-400">{winnerName}</span>!</> : 'Resultado Registrado'}
                                    </h3>
                                </div>
                            </div>
                            <div className="px-6 py-3 bg-zinc-900/90 border border-yellow-500/40 rounded-2xl font-mono font-black text-2xl text-yellow-400 shadow-inner">
                                {setsWonHome} - {setsWonAway} SETS
                            </div>
                        </div>

                        {/* Banner de aviso de 30 segundos para cerrar pestaña / redirigir al inicio */}
                        {redirectCountdown !== null && (
                            <div className="w-full mt-2 pt-4 border-t border-yellow-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                                <div className="flex items-center gap-2 text-yellow-200 text-xs font-bold">
                                    <Clock size={16} className="text-yellow-400 animate-spin" />
                                    <span>Esta pestaña se cerrará automáticamente en <strong className="text-yellow-400 font-mono text-sm">{redirectCountdown}s</strong> al finalizar el partido.</span>
                                </div>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5"
                                >
                                    <ArrowLeft size={14} /> Volver al Inicio Ahora
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* SCOREBOARD PRINCIPAL PREMIUM EN DARK MODE */}
                <div className="w-full grid grid-cols-2 gap-4 md:gap-8 max-w-4xl">
                    
                    {/* TARJETA LOCAL */}
                    <div 
                        className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between relative overflow-hidden transition-all duration-500"
                        style={{ boxShadow: `0 0 35px ${homeColors.primary}22` }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: homeColors.primary }} />

                        <div className="flex flex-col items-center text-center">
                            {homeShield ? (
                                <img src={homeShield} className="w-16 h-16 md:w-24 md:h-24 object-contain mb-4 drop-shadow-xl" alt="" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500 font-bold">LOC</div>
                            )}
                            <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight leading-tight min-h-[48px] flex items-center justify-center">
                                {homeName}
                            </h2>
                        </div>

                        {/* SCORE BOX PRIMARIO */}
                        <div 
                            className="w-full mt-6 py-4 md:py-6 rounded-2xl flex items-center justify-center shadow-inner font-mono font-black text-5xl md:text-8xl tabular-nums border border-white/10"
                            style={{ 
                                backgroundColor: homeColors.primary, 
                                color: getContrastColor(homeColors.primary)
                            }}
                        >
                            {currentSetHomePts}
                        </div>
                    </div>

                    {/* TARJETA VISITANTE */}
                    <div 
                        className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between relative overflow-hidden transition-all duration-500"
                        style={{ boxShadow: `0 0 35px ${awayColors.primary}22` }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: awayColors.primary }} />

                        <div className="flex flex-col items-center text-center">
                            {awayShield ? (
                                <img src={awayShield} className="w-16 h-16 md:w-24 md:h-24 object-contain mb-4 drop-shadow-xl" alt="" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500 font-bold">VIS</div>
                            )}
                            <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight leading-tight min-h-[48px] flex items-center justify-center">
                                {awayName}
                            </h2>
                        </div>

                        {/* SCORE BOX PRIMARIO */}
                        <div 
                            className="w-full mt-6 py-4 md:py-6 rounded-2xl flex items-center justify-center shadow-inner font-mono font-black text-5xl md:text-8xl tabular-nums border border-white/10"
                            style={{ 
                                backgroundColor: awayColors.primary, 
                                color: getContrastColor(awayColors.primary)
                            }}
                        >
                            {currentSetAwayPts}
                        </div>
                    </div>

                </div>

                {/* Badge Set Actual */}
                <div className="mt-6 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Set Actual</span>
                    <div className="text-2xl font-black text-white bg-zinc-900 px-6 py-1.5 rounded-xl border border-zinc-800">
                        Set {currentSetNumber}
                    </div>
                </div>

                {/* Historial de Sets Terminados */}
                {sets && sets.filter((s: any) => s.finished).length > 0 && (
                    <div className="w-full max-w-2xl mt-6 px-4">
                        <div className="text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                            Historial de Sets Anteriores
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 justify-start md:justify-center scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {sets
                                .filter((s: any) => s.finished)
                                .map((s: any, idx: number) => {
                                    const isHomeWinner = s.home > s.away;
                                    const winnerName = isHomeWinner ? homeName : awayName;
                                    const scoreFormatted = isHomeWinner ? `${s.home}-${s.away}` : `${s.away}-${s.home}`;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition ${
                                                isHomeWinner 
                                                    ? 'bg-blue-950/30 border-blue-500/20 text-blue-400 hover:bg-blue-950/50 shadow-md shadow-blue-950/20' 
                                                    : 'bg-red-950/30 border-red-500/20 text-red-400 hover:bg-red-950/50 shadow-md shadow-red-950/20'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                                            <span>Set {s.number}: Ganó {winnerName} {scoreFormatted}</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* Referees Row */}
                <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-zinc-500 font-medium">
                    {staff.referee1 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                            <User size={12} /> <span className="uppercase">1º: {staff.referee1}</span>
                        </div>
                    )}
                    {staff.scorer && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                            <User size={12} /> <span className="uppercase">Planillero: {staff.scorer}</span>
                        </div>
                    )}
                    {staff.referee2 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                            <User size={12} /> <span className="uppercase">2º: {staff.referee2}</span>
                        </div>
                    )}
                </div>

            </header>

            {/* 2. ROSTERS */}
            <main className="flex-1 w-full max-w-7xl px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start overflow-hidden">

                {/* HOME CARD */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[600px]">
                    <div 
                        className="p-6 flex items-center justify-between backdrop-blur-sm border-b border-white/10"
                        style={{ backgroundColor: homeColors.primary, color: getContrastColor(homeColors.primary) }}
                    >
                        <h2 className="text-2xl font-black uppercase tracking-tight">{homeName}</h2>
                        {homeShield && <img src={homeShield} className="w-12 h-12 object-contain drop-shadow-md" alt="" />}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/50 p-2">
                        {renderPlayerList(posHome, benchHome)}
                        {[...posHome, ...benchHome].length === 0 && <div className="text-center py-10 text-zinc-700 italic">No hay jugadores cargados</div>}
                    </div>
                </div>

                {/* AWAY CARD */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[600px]">
                    <div 
                        className="p-6 flex items-center justify-between backdrop-blur-sm border-b border-white/10"
                        style={{ backgroundColor: awayColors.primary, color: getContrastColor(awayColors.primary) }}
                    >
                        {awayShield && <img src={awayShield} className="w-12 h-12 object-contain drop-shadow-md" alt="" />}
                        <h2 className="text-2xl font-black uppercase tracking-tight text-right">{awayName}</h2>
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
