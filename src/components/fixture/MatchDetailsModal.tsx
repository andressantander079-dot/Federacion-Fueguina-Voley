'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Calendar, MapPin, Shield, Share2, Award } from 'lucide-react';
import { formatArgentinaDateLiteral, formatArgentinaTimeLiteral } from '@/lib/dateUtils';
import { useMatchShare } from '@/hooks/useMatchShare';

interface MatchDetailsModalProps {
    matchId: string;
    onClose: () => void;
}

export default function MatchDetailsModal({ matchId, onClose }: MatchDetailsModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [match, setMatch] = useState<any>(null);
    const shareCardRef = useRef<HTMLDivElement>(null);
    const { shareMatch, isSharing } = useMatchShare({ cardRef: shareCardRef });

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
                    category:categories(id, name),
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

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-zinc-900 border border-white/10 rounded-none sm:rounded-3xl w-full h-[100dvh] sm:h-auto max-w-2xl sm:max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {loading || !match ? (
                    <div className="p-8 animate-pulse flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-12">
                            <div className="h-4 w-1/3 bg-white/5 rounded"></div>
                            <div className="h-8 w-8 bg-white/5 rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-white/5 rounded-full"></div>
                            <div className="h-12 w-24 bg-white/5 rounded"></div>
                            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-white/5 rounded-full"></div>
                        </div>
                        <div className="h-16 w-full bg-white/5 rounded mb-4"></div>
                        <div className="h-12 w-full bg-white/5 rounded"></div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-start p-4 sm:p-6 border-b border-white/5 bg-zinc-900/50 shrink-0">
                            <div>
                                <div className="text-tdf-orange font-bold text-xs sm:text-sm tracking-widest uppercase mb-1 flex items-center gap-2">
                                    <Calendar size={14}/> 
                                    {formatArgentinaDateLiteral(match.scheduled_time)}
                                </div>
                                <div className="text-zinc-400 font-medium text-[10px] sm:text-xs flex items-center gap-2">
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
                        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-center justify-between gap-2 sm:gap-4">
                                {/* Local */}
                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-2 sm:mb-4 p-2 sm:p-4 shadow-lg shrink-0">
                                        {match.home_team?.shield_url ? (
                                            <img src={match.home_team.shield_url} alt={match.home_team.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-700" />
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-center text-xs sm:text-base md:text-lg px-1 sm:px-2 line-clamp-2">
                                        {match.home_team?.name}
                                    </h3>
                                    {match.home_score > match.away_score && (
                                        <span className="mt-1 sm:mt-2 text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-tdf-orange bg-tdf-orange/10 px-2 py-0.5 rounded-full">Ganador</span>
                                    )}
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-center shrink-0 mx-2">
                                    <div className="text-zinc-500 font-bold tracking-widest text-[9px] sm:text-xs uppercase mb-1 sm:mb-2">Final</div>
                                    <div className="text-3xl sm:text-6xl md:text-7xl font-black text-white px-4 py-1.5 sm:px-6 sm:py-2 bg-black/30 rounded-2xl border border-white/5 shadow-inner">
                                        {match.home_score} <span className="text-zinc-600 font-light mx-0.5 sm:mx-1">-</span> {match.away_score}
                                    </div>
                                </div>

                                {/* Visitante */}
                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-2 sm:mb-4 p-2 sm:p-4 shadow-lg shrink-0">
                                        {match.away_team?.shield_url ? (
                                            <img src={match.away_team.shield_url} alt={match.away_team.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-700" />
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-center text-xs sm:text-base md:text-lg px-1 sm:px-2 line-clamp-2">
                                        {match.away_team?.name}
                                    </h3>
                                    {match.away_score > match.home_score && (
                                        <span className="mt-1 sm:mt-2 text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-tdf-orange bg-tdf-orange/10 px-2 py-0.5 rounded-full">Ganador</span>
                                    )}
                                </div>
                            </div>

                            {/* Sets Breakdown */}
                            {(match.set_scores && match.set_scores.length > 0) ? (
                                <div className="mt-6 sm:mt-10 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-xs sm:text-sm text-left table-fixed">
                                        <thead className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-white/5">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2 sm:py-3 font-medium w-1/3 sm:w-auto truncate">Equipo</th>
                                                {match.set_scores.map((_: any, i: number) => (
                                                    <th key={`head-${i}`} className="px-1 py-2 sm:py-3 text-center border-l border-white/5 font-medium w-10 sm:w-16">
                                                        <span className="hidden sm:inline">Set </span>{i + 1}
                                                     </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr className="border-t border-white/5">
                                                <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-zinc-300 truncate">
                                                    {match.home_team?.name}
                                                </td>
                                                {match.set_scores.map((set: string, i: number) => {
                                                    const pts = parseInt(set.split('-')[0]) || 0;
                                                    const ops = parseInt(set.split('-')[1]) || 0;
                                                    const won = pts > ops;
                                                    return (
                                                        <td key={`h-${i}`} className={`px-1 py-2 sm:py-3 text-center border-l border-white/5 font-mono text-xs sm:text-sm ${won ? 'text-white font-bold bg-white/[0.02]' : 'text-zinc-500'}`}>
                                                            {pts}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr>
                                                <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-zinc-300 truncate">
                                                    {match.away_team?.name}
                                                </td>
                                                {match.set_scores.map((set: string, i: number) => {
                                                    const pts = parseInt(set.split('-')[1]) || 0;
                                                    const ops = parseInt(set.split('-')[0]) || 0;
                                                    const won = pts > ops;
                                                    return (
                                                        <td key={`a-${i}`} className={`px-1 py-2 sm:py-3 text-center border-l border-white/5 font-mono text-xs sm:text-sm ${won ? 'text-white font-bold bg-white/[0.02]' : 'text-zinc-500'}`}>
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
                            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                                <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest block pl-1">Autoridades</span>
                                <div className="bg-black/30 border border-white/5 rounded-2xl p-3 sm:p-4 divide-y divide-white/5 text-[11px] sm:text-xs font-bold space-y-2 sm:space-y-3">
                                    {/* Primer Árbitro */}
                                    <div className="flex justify-between items-center pb-1.5 sm:pb-2">
                                        <span className="text-zinc-500 uppercase tracking-wider text-[9px] sm:text-[10px]">1° Árbitro</span>
                                        <span className="text-zinc-300 font-medium">{match.firstRefereeName}</span>
                                    </div>
                                    {/* Segundo Árbitro */}
                                    {match.secondRefereeName && (
                                        <div className="flex justify-between items-center pt-1.5 sm:pt-2 pb-1.5 sm:pb-2">
                                            <span className="text-zinc-500 uppercase tracking-wider text-[9px] sm:text-[10px]">2° Árbitro</span>
                                            <span className="text-zinc-300 font-medium">{match.secondRefereeName}</span>
                                        </div>
                                    )}
                                    {/* Planillero */}
                                    {match.scorerName && (
                                        <div className="flex justify-between items-center pt-1.5 sm:pt-2">
                                            <span className="text-zinc-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Planillero/a</span>
                                            <span className="text-zinc-300 font-medium">{match.scorerName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 sm:p-4 bg-zinc-950/80 border-t border-white/5 flex justify-between items-center shrink-0 relative">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl text-xs font-black transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                            
                            <button
                                type="button"
                                disabled={isSharing}
                                onClick={() => shareMatch(match)}
                                className={`px-4 py-2 bg-tdf-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/10 flex items-center gap-2 transition cursor-pointer ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Share2 size={14} /> {isSharing ? 'Capturando...' : 'Compartir'}
                            </button>
                        </div>

                        {/* Placa Deportiva Premium Oculta (Off-screen para captura) */}
                        <div
                            ref={shareCardRef}
                            className="absolute -left-[9999px] top-0 w-[600px] h-[800px] bg-zinc-950 text-white p-10 flex flex-col justify-between border border-white/10 select-none overflow-hidden"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                        >
                            {/* Cabecera */}
                            <div className="flex flex-col items-center border-b border-white/10 pb-6 shrink-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-md">
                                        <img src="/logo-fvf.png" alt="FVF Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <h1 className="text-xl font-black tracking-widest text-white uppercase">FEDERACIÓN DE VOLEIBOL FUEGUINA</h1>
                                </div>
                                <p className="text-zinc-400 font-bold tracking-widest text-xs uppercase">
                                    RESULTADO OFICIAL
                                </p>
                            </div>

                            {/* Contenido Principal (Resultado de Equipos con Alineación Perfecta Coordinada) */}
                            <div className="my-8 px-6 flex flex-col gap-6 flex-1 justify-center shrink-0">
                                {/* Fila 1: Escudos y Marcador Central (Alineación vertical garantizada) */}
                                <div className="flex items-center justify-between w-full">
                                    {/* Escudo Local */}
                                    <div className="flex flex-col items-center flex-1 justify-center">
                                        <div className="w-28 h-28 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center p-4 shadow-xl">
                                            {match.home_team?.shield_url ? (
                                                <img src={match.home_team.shield_url} alt={match.home_team.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Shield size={56} className="text-zinc-700" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Marcador Final */}
                                    <div className="flex flex-col items-center mx-6 shrink-0">
                                        <div className="text-5xl font-black text-white px-8 py-4 bg-black/40 rounded-2xl border border-white/5 shadow-2xl">
                                            {match.home_score} <span className="text-zinc-600 font-light mx-2">-</span> {match.away_score}
                                        </div>
                                    </div>

                                    {/* Escudo Visitante */}
                                    <div className="flex flex-col items-center flex-1 justify-center">
                                        <div className="w-28 h-28 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center p-4 shadow-xl">
                                            {match.away_team?.shield_url ? (
                                                <img src={match.away_team.shield_url} alt={match.away_team.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Shield size={56} className="text-zinc-700" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Fila 2: Nombres y Estados (Alineación de textos y badges al mismo nivel) */}
                                <div className="flex items-start justify-between w-full">
                                    {/* Nombre Local */}
                                    <div className="flex flex-col items-center flex-1 text-center px-2">
                                        <h2 className="text-white font-extrabold text-base leading-tight min-h-[40px] flex items-start justify-center">
                                            {match.home_team?.name}
                                        </h2>
                                        <div className="h-6 mt-1 flex items-center justify-center">
                                            {match.home_score > match.away_score && (
                                                <span className="text-[9px] uppercase font-black tracking-widest text-tdf-orange bg-tdf-orange/10 px-2.5 py-0.5 rounded-full">Ganador</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Espacio intermedio (mismo ancho exacto que el marcador y márgenes) */}
                                    <div className="w-[144px] shrink-0 mx-6"></div>

                                    {/* Nombre Visitante */}
                                    <div className="flex flex-col items-center flex-1 text-center px-2">
                                        <h2 className="text-white font-extrabold text-base leading-tight min-h-[40px] flex items-start justify-center">
                                            {match.away_team?.name}
                                        </h2>
                                        <div className="h-6 mt-1 flex items-center justify-center">
                                            {match.away_score > match.home_score && (
                                                <span className="text-[9px] uppercase font-black tracking-widest text-tdf-orange bg-tdf-orange/10 px-2.5 py-0.5 rounded-full">Ganador</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de Sets */}
                            {match.set_scores && match.set_scores.length > 0 && (
                                <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden mb-6 shrink-0">
                                    <table className="w-full text-left table-fixed">
                                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-zinc-400">
                                            <tr>
                                                <th className="px-6 py-4 font-bold w-1/2">Equipo</th>
                                                {match.set_scores.map((_: any, i: number) => (
                                                    <th key={`share-head-${i}`} className="px-2 py-4 text-center border-l border-white/5 font-bold">
                                                        Set {i + 1}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr>
                                                <td className="px-6 py-4 font-extrabold text-zinc-300 truncate">{match.home_team?.name}</td>
                                                {match.set_scores.map((set: string, i: number) => {
                                                    const pts = parseInt(set.split('-')[0]) || 0;
                                                    const ops = parseInt(set.split('-')[1]) || 0;
                                                    const won = pts > ops;
                                                    return (
                                                        <td key={`share-h-${i}`} className={`px-2 py-4 text-center border-l border-white/5 font-mono text-base ${won ? 'text-white font-black bg-white/[0.02]' : 'text-zinc-500'}`}>
                                                            {pts}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr>
                                                <td className="px-6 py-4 font-extrabold text-zinc-300 truncate">{match.away_team?.name}</td>
                                                {match.set_scores.map((set: string, i: number) => {
                                                    const pts = parseInt(set.split('-')[1]) || 0;
                                                    const ops = parseInt(set.split('-')[0]) || 0;
                                                    const won = pts > ops;
                                                    return (
                                                        <td key={`share-a-${i}`} className={`px-2 py-4 text-center border-l border-white/5 font-mono text-base ${won ? 'text-white font-black bg-white/[0.02]' : 'text-zinc-500'}`}>
                                                            {pts}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pie de Firma / Detalles */}
                            <div className="flex justify-between items-end border-t border-white/10 pt-6 shrink-0">
                                {/* Info del partido */}
                                <div className="space-y-1">
                                    <p className="text-tdf-orange text-xs font-black tracking-widest uppercase">
                                        Categoría: {match.category?.name || 'Voley'}
                                    </p>
                                    <p className="text-zinc-400 text-xs font-semibold">
                                        Sede: {match.court_name || 'Sin sede'}
                                    </p>
                                    <p className="text-zinc-500 text-[10px] font-medium">
                                        Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}
                                    </p>
                                </div>

                                {/* Autoridades */}
                                <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-bold min-w-[220px] space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 uppercase">1° Árbitro:</span>
                                        <span className="text-zinc-300">{match.firstRefereeName}</span>
                                    </div>
                                    {match.secondRefereeName && (
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 uppercase">2° Árbitro:</span>
                                            <span className="text-zinc-300">{match.secondRefereeName}</span>
                                        </div>
                                    )}
                                    {match.scorerName && (
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 uppercase">Planillero/a:</span>
                                            <span className="text-zinc-300">{match.scorerName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

