'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Calendar, MapPin, Shield, Share2, ClipboardCheck } from 'lucide-react';
import { formatArgentinaDateLiteral, formatArgentinaTimeLiteral, formatArgentinaDateNumerical } from '@/lib/dateUtils';

interface MatchDetailsModalProps {
    matchId: string;
    onClose: () => void;
}

export default function MatchDetailsModal({ matchId, onClose }: MatchDetailsModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [match, setMatch] = useState<any>(null);
    const [shareSuccess, setShareSuccess] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    useEffect(() => {
        async function fetchMatch() {
            setLoading(true);
            const { data, error } = await supabase
                .from('matches')
                .select(`
                    *,
                    home_team:teams!home_team_id(name, shield_url),
                    away_team:teams!away_team_id(name, shield_url),
                    referee:referees!referee_id(first_name, last_name),
                    match_officials(
                        id, role, status, user_id,
                        profile:profiles(full_name)
                    )
                `)
                .eq('id', matchId)
                .single();
            
            if (data && !error) {
                // If set_scores is empty but sheet_data exists, build set_scores on the fly for display
                if (!data.set_scores || data.set_scores.length === 0) {
                    if (data.sheet_data?.sets_history) {
                        data.set_scores = data.sheet_data.sets_history.map((s: any) => `${s.home || 0}-${s.away || 0}`);
                    } else if (data.sheet_data?.sets) {
                        data.set_scores = data.sheet_data.sets.map((s: any) => `${s.home_points || 0}-${s.away_points || 0}`);
                    }
                }

                // Helper to resolve referee names
                const resolveRefereeName = async (id: string) => {
                    const { data: refData } = await supabase
                        .from('referees')
                        .select('first_name, last_name, profile:profiles(full_name)')
                        .eq('id', id)
                        .maybeSingle();
                    const refObj: any = refData;
                    if (refObj) {
                        return refObj.profile?.full_name || `${refObj.first_name || ''} ${refObj.last_name || ''}`.trim();
                    }
                    const { data: profData } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', id)
                        .maybeSingle();
                    const profileObj: any = profData;
                    return profileObj?.full_name || null;
                };

                // Find authorities names
                let firstRefereeName = data.match_officials?.find((mo: any) => mo.role === '1st_referee')?.profile?.full_name;
                if (!firstRefereeName) {
                    const ref1Id = data.sheet_data?.staff?.ref1 || data.referee_id;
                    if (ref1Id) {
                        firstRefereeName = await resolveRefereeName(ref1Id);
                    }
                }
                if (!firstRefereeName && data.referee) {
                    firstRefereeName = `${data.referee.first_name || ''} ${data.referee.last_name || ''}`.trim();
                }
                data.firstRefereeName = firstRefereeName || 'Sin designar';

                let secondRefereeName = data.match_officials?.find((mo: any) => mo.role === '2nd_referee')?.profile?.full_name;
                if (!secondRefereeName) {
                    const ref2Id = data.sheet_data?.staff?.ref2;
                    if (ref2Id) {
                        secondRefereeName = await resolveRefereeName(ref2Id);
                    }
                }
                data.secondRefereeName = secondRefereeName || null;

                let scorerName = data.match_officials?.find((mo: any) => mo.role === 'scorer')?.profile?.full_name;
                if (!scorerName) {
                    scorerName = data.sheet_data?.staff?.scorer;
                    // If scorer is a UUID, try resolving it. Otherwise keep it as is.
                    if (scorerName && scorerName.length === 36) {
                        const resolvedScorer = await resolveRefereeName(scorerName);
                        if (resolvedScorer) scorerName = resolvedScorer;
                    }
                }
                data.scorerName = scorerName || null;

                setMatch(data);
            }
            setLoading(false);
        }

        if (matchId) fetchMatch();
    }, [matchId]);

    const handleShare = async (matchData: any) => {
        if (!matchData) return;
        const categoryName = matchData.category?.name || 'Voley';
        const shareText = `🏆 Resultado Oficial FVF 🏆\n\n${matchData.home_team?.name} ${matchData.home_score} - ${matchData.away_score} ${matchData.away_team?.name}\nCategoría: ${categoryName}\nFecha: ${formatArgentinaDateNumerical(matchData.scheduled_time)}\nResultado sets: ${matchData.set_scores?.join(', ') || 'No registrado'}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Resultado del Partido - FVF',
                    text: shareText
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                setShareSuccess(true);
                setTimeout(() => setShareSuccess(false), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {loading || !match ? (
                    <div className="p-8 animate-pulse">
                        <div className="flex justify-between items-start mb-12">
                            <div className="h-4 w-1/3 bg-white/5 rounded"></div>
                            <div className="h-8 w-8 bg-white/5 rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-24 w-24 bg-white/5 rounded-full"></div>
                            <div className="h-16 w-32 bg-white/5 rounded"></div>
                            <div className="h-24 w-24 bg-white/5 rounded-full"></div>
                        </div>
                        <div className="h-16 w-full bg-white/5 rounded mb-4"></div>
                        <div className="h-12 w-full bg-white/5 rounded"></div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-start p-6 border-b border-white/5 bg-zinc-900/50 shrink-0">
                            <div>
                                <div className="text-tdf-orange font-bold text-sm tracking-widest uppercase mb-1 flex items-center gap-2">
                                    <Calendar size={14}/> 
                                    {formatArgentinaDateLiteral(match.scheduled_time)}
                                </div>
                                <div className="text-zinc-400 font-medium text-xs flex items-center gap-2">
                                    <MapPin size={14} className="text-zinc-500"/>
                                    {match.court_name || 'Sin sede'} • {formatArgentinaTimeLiteral(match.scheduled_time)} hs
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Match Focus (Scrollable Body) */}
                        <div className="p-8 pb-10 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-center justify-between gap-4">
                                {/* Local */}
                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-4 p-4 shadow-lg shrink-0">
                                        {match.home_team?.shield_url ? (
                                            <img src={match.home_team.shield_url} alt={match.home_team.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Shield size={40} className="text-zinc-700" />
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-center text-sm md:text-lg px-2 line-clamp-2">
                                        {match.home_team?.name}
                                    </h3>
                                    {match.home_score > match.away_score && (
                                        <span className="mt-2 text-[10px] uppercase font-black tracking-widest text-tdf-orange bg-tdf-orange/10 px-2 py-0.5 rounded-full">Ganador</span>
                                    )}
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="text-zinc-500 font-bold tracking-widest text-xs uppercase mb-2">Final</div>
                                    <div className="text-5xl sm:text-7xl font-black text-white px-6 py-2 bg-black/30 rounded-2xl border border-white/5 shadow-inner">
                                        {match.home_score} <span className="text-zinc-600 font-light mx-1">-</span> {match.away_score}
                                    </div>
                                </div>

                                {/* Visitante */}
                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-4 p-4 shadow-lg shrink-0">
                                        {match.away_team?.shield_url ? (
                                            <img src={match.away_team.shield_url} alt={match.away_team.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Shield size={40} className="text-zinc-700" />
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-center text-sm md:text-lg px-2 line-clamp-2">
                                        {match.away_team?.name}
                                    </h3>
                                    {match.away_score > match.home_score && (
                                        <span className="mt-2 text-[10px] uppercase font-black tracking-widest text-tdf-orange bg-tdf-orange/10 px-2 py-0.5 rounded-full">Ganador</span>
                                    )}
                                </div>
                            </div>

                            {/* Sets Breakdown */}
                            {(match.set_scores && match.set_scores.length > 0) ? (
                                <div className="mt-12 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                                        <thead className="text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Equipo</th>
                                                {match.set_scores.map((_: any, i: number) => (
                                                    <th key={`head-${i}`} className="px-2 py-3 text-center border-l border-white/5 font-medium w-16">
                                                        Set {i + 1}
                                                     </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr className="border-t border-white/5">
                                                <td className="px-4 py-3 font-bold text-zinc-300 max-w-[150px] sm:max-w-[200px] truncate">
                                                    {match.home_team?.name}
                                                </td>
                                                {match.set_scores.map((set: string, i: number) => {
                                                    const pts = parseInt(set.split('-')[0]) || 0;
                                                    const ops = parseInt(set.split('-')[1]) || 0;
                                                    const won = pts > ops;
                                                    return (
                                                        <td key={`h-${i}`} className={`px-2 py-3 text-center border-l border-white/5 font-mono text-sm ${won ? 'text-white font-bold bg-white/[0.02]' : 'text-zinc-500'}`}>
                                                            {pts}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-bold text-zinc-300 max-w-[150px] sm:max-w-[200px] truncate">
                                                    {match.away_team?.name}
                                                </td>
                                                {match.set_scores.map((set: string, i: number) => {
                                                    const pts = parseInt(set.split('-')[1]) || 0;
                                                    const ops = parseInt(set.split('-')[0]) || 0;
                                                    const won = pts > ops;
                                                    return (
                                                        <td key={`a-${i}`} className={`px-2 py-3 text-center border-l border-white/5 font-mono text-sm ${won ? 'text-white font-bold bg-white/[0.02]' : 'text-zinc-500'}`}>
                                                            {pts}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}

                            {/* Autoridades */}
                            <div className="mt-8 space-y-3">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block pl-1">Autoridades</span>
                                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 divide-y divide-white/5 text-xs font-bold space-y-3">
                                    {/* Primer Árbitro */}
                                    <div className="flex justify-between items-center pb-2">
                                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">1° Árbitro</span>
                                        <span className="text-zinc-300 font-medium">{match.firstRefereeName}</span>
                                    </div>
                                    {/* Segundo Árbitro */}
                                    {match.secondRefereeName && (
                                        <div className="flex justify-between items-center pt-2 pb-2">
                                            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">2° Árbitro</span>
                                            <span className="text-zinc-300 font-medium">{match.secondRefereeName}</span>
                                        </div>
                                    )}
                                    {/* Planillero */}
                                    {match.scorerName && (
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Planillero/a</span>
                                            <span className="text-zinc-300 font-medium">{match.scorerName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-zinc-950/80 border-t border-white/5 flex justify-between items-center shrink-0 relative">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl text-xs font-black transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => handleShare(match)}
                                className="px-4 py-2 bg-tdf-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/10 flex items-center gap-2 transition cursor-pointer"
                            >
                                <Share2 size={14} /> Compartir
                            </button>

                            {/* Toast Notification Fallback */}
                            {shareSuccess && (
                                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white text-black dark:bg-zinc-900 dark:text-white px-4 py-2.5 rounded-full text-xs font-black flex items-center gap-2 shadow-2xl border border-white/10 z-[110]">
                                    <ClipboardCheck size={14} className="text-emerald-500" /> ¡Copiado al portapapeles!
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

