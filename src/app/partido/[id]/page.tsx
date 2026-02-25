'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import {
    Zap, Calendar, MapPin,
    MonitorPlay, Activity, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PublicMatchPage() {
    const { id } = useParams();
    const supabase = createClient();

    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'lineups'>('info');

    useEffect(() => {
        if (!id) return;

        // Initial Load
        fetchMatch();

        // Realtime Subscription
        const channel = supabase
            .channel(`match-${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${id}`
            }, (payload) => {
                console.log('Realtime change:', payload);
                setMatch((prev: any) => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    async function fetchMatch() {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                home_team:teams!home_team_id(name, id, club_id, shield_url),
                away_team:teams!away_team_id(name, id, club_id, shield_url),
                category:categories(name, gender),
                court:courts(name)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching match:', error);
        } else {
            setMatch(data);
        }
        setLoading(false);
    }

    // --- HELPERS ---

    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        // Basic YouTube Parser
        let embed = url;
        try {
            if (url.includes('youtube.com/watch')) {
                const v = new URL(url).searchParams.get('v');
                if (v) embed = `https://www.youtube.com/embed/${v}?autoplay=1`;
            } else if (url.includes('youtu.be/')) {
                const v = url.split('youtu.be/')[1];
                if (v) embed = `https://www.youtube.com/embed/${v}?autoplay=1`;
            } else if (url.includes('twitch.tv/')) {
                const channel = url.split('twitch.tv/')[1];
                // Twitch embed needs parent domain
                // For now just link button or basic iframe?
                // Twitch is stricter with embeds. 
                // Let's stick to YouTube logic for embed, or direct link for others.
            }
        } catch (e) { console.error('Error parsing URL', e); }

        return embed;
    };

    const fullState = match?.sheet_data?.full_state;
    // We can use fullState to show court positions if available!

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!match) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            Partido no encontrado
        </div>
    );

    const isLive = match.status === 'en_curso';
    const isFinished = match.status === 'finalizado';
    const streamingEmbed = match.streaming_url ? getEmbedUrl(match.streaming_url) : null;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">

            {/* HERO SECTION WITH SCORE */}
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 pb-8">
                <div className="max-w-4xl mx-auto px-4 pt-6">
                    {/* Header Info */}
                    <div className="flex justify-between items-start mb-8 text-sm">
                        <div className="flex gap-2 text-zinc-400">
                            <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded">
                                <Calendar size={14} />
                                {format(new Date(match.date), "d MMM, HH:mm", { locale: es })}
                            </div>
                            {match.court && (
                                <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded">
                                    <MapPin size={14} />
                                    {match.court.name}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs">
                            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : isFinished ? 'bg-zinc-500' : 'bg-green-500'}`}></span>
                            {isLive ? 'EN VIVO' : isFinished ? 'FINALIZADO' : 'PROGRAMADO'}
                        </div>
                    </div>

                    {/* SCOREBOARD */}
                    <div className="flex items-center justify-between gap-4 md:gap-12">
                        {/* HOME */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {match.home_team.shield_url && (
                                <img src={match.home_team.shield_url} className="w-16 h-16 md:w-24 md:h-24 object-contain mb-4 drop-shadow-lg" alt="" />
                            )}
                            <h2 className="text-xl md:text-3xl font-black mb-2 text-white leading-tight">{match.home_team.name}</h2>
                            <div className="text-6xl md:text-8xl font-black text-blue-500 tabular-nums tracking-tighter">
                                {match.current_set_points_home || 0}
                            </div>
                        </div>

                        {/* SETS INFO */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-zinc-500 font-bold text-xs uppercase tracking-widest">SET {match.current_set}</div>

                            <div className="flex items-center gap-4 text-2xl md:text-4xl font-black text-zinc-700">
                                <span>{match.home_score || 0}</span>
                                <span className="w-1 h-8 bg-zinc-800 rounded-full"></span>
                                <span>{match.away_score || 0}</span>
                            </div>

                            {/* Sets History */}
                            {match.sets_results && match.sets_results.length > 0 && (
                                <div className="flex gap-1">
                                    {match.sets_results.map((res: string, i: number) => (
                                        <div key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                                            {res}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* AWAY */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {match.away_team.shield_url && (
                                <img src={match.away_team.shield_url} className="w-16 h-16 md:w-24 md:h-24 object-contain mb-4 drop-shadow-lg" alt="" />
                            )}
                            <h2 className="text-xl md:text-3xl font-black mb-2 text-white leading-tight">{match.away_team.name}</h2>
                            <div className="text-6xl md:text-8xl font-black text-orange-500 tabular-nums tracking-tighter">
                                {match.current_set_points_away || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STREAMING & CONTENT */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Visual Court / Stream Toggle could be nice, but mostly Stream first */}
                {streamingEmbed ? (
                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                        <iframe
                            src={streamingEmbed}
                            title="Live Match"
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>
                ) : match.streaming_url ? (
                    <a href={match.streaming_url} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-12 bg-zinc-900 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition">
                        <MonitorPlay size={48} className="mx-auto mb-4 text-zinc-600" />
                        <div className="font-bold text-lg">Ver Transmisión</div>
                        <div className="text-zinc-500 text-sm">Haz click para abrir el stream externo</div>
                    </a>
                ) : (
                    <div className="w-full py-12 bg-zinc-900/50 rounded-xl border border-zinc-800 text-center flex flex-col items-center justify-center gap-2">
                        <Activity size={32} className="text-zinc-700" />
                        <div className="text-zinc-500 font-medium">Sin transmisión disponible</div>
                    </div>
                )}

                {/* Court Visual (Read Only) */}
                {fullState && (
                    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <MonitorPlay size={16} className="text-red-500" />
                            Cancha en Vivo
                        </h3>

                        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                            {/* HOME SIDE */}
                            <div className="aspect-[3/4] bg-blue-900/5 border border-blue-900/20 rounded relative">
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-1 gap-1">
                                    <PlayerDot player={fullState.posHome[3]} />
                                    <PlayerDot player={fullState.posHome[4]} />
                                    <PlayerDot player={fullState.posHome[2]} />
                                    <PlayerDot player={fullState.posHome[5]} />
                                    <PlayerDot player={fullState.posHome[1]} />
                                    <PlayerDot player={fullState.posHome[0]} isServing={fullState.servingTeam === 'home'} />
                                </div>
                            </div>

                            {/* AWAY SIDE */}
                            <div className="aspect-[3/4] bg-orange-900/5 border border-orange-900/20 rounded relative">
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-1 gap-1">
                                    <PlayerDot player={fullState.posAway[3]} />
                                    <PlayerDot player={fullState.posAway[4]} />
                                    <PlayerDot player={fullState.posAway[2]} />
                                    <PlayerDot player={fullState.posAway[5]} />
                                    <PlayerDot player={fullState.posAway[1]} />
                                    <PlayerDot player={fullState.posAway[0]} isServing={fullState.servingTeam === 'away'} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
}

function PlayerDot({ player, isServing }: { player?: any, isServing?: boolean }) {
    if (!player) return <div className="rounded bg-black/20"></div>;
    return (
        <div className={`rounded flex flex-col items-center justify-center relative border 
            ${player.isLibero ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}
        `}>
            {isServing && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}
            <span className="text-lg font-black leading-none">{player.number}</span>
            <span className="text-[8px] opacity-70 truncate w-full text-center px-0.5">{player.name.split(' ')[0]}</span>
        </div>
    );
}
