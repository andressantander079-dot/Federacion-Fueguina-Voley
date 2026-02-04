'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronLeft, Users, Zap, AlertTriangle, CheckCircle, Plus, X,
    ChevronDown, ChevronUp, RefreshCw, ArrowRightLeft, Search, Save
} from 'lucide-react';
import { useVolleyMatch, Player, TeamSide } from '@/hooks/useVolleyMatch';

export default function MatchSheetPage() {
    const { id } = useParams();
    const router = useRouter();
    const supabase = createClient();

    // --- HOOK DE LÓGICA DE PARTIDO ---
    const matchLogic = useVolleyMatch();
    const {
        sets, currentSetIdx, posHome, posAway, benchHome, benchAway,
        servingTeam, subsCount,
        addPoint, substitutePlayer, finishSet, undo,
        setAllState, setSets, setServingTeam, setPosHome, setPosAway
    } = matchLogic;

    // --- ESTADOS DE UI & DATA ---
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'score' | 'players' | 'incidents' | 'settings'>('score');

    // Data Loading
    const [lineups, setLineups] = useState<any[]>([]);
    const [teamPlayers, setTeamPlayers] = useState<{ home: any[], away: any[] }>({ home: [], away: [] });

    // Modals
    const [selectedPlayerForAction, setSelectedPlayerForAction] = useState<{ player: Player, team: TeamSide } | null>(null);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    // Guest/Add Player
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [activeTeamForGuest, setActiveTeamForGuest] = useState<{ id: string, name: string, club_id: string } | null>(null);
    const [squadsList, setSquadsList] = useState<any[]>([]);
    const [expandedSquad, setExpandedSquad] = useState<string | null>(null);

    // Settings
    const [streamingUrl, setStreamingUrl] = useState('');

    useEffect(() => {
        if (id) {
            loadMatchData();
        }
    }, [id]);

    // --- CARGA DE DATOS ---
    async function loadMatchData() {
        setLoading(true);
        // 1. Fetch Match Info
        const { data: matchData, error } = await supabase
            .from('matches')
            .select(`
                *,
                home_team:teams!home_team_id(name, id),
                away_team:teams!away_team_id(name, id),
                category:categories(name, gender, min_year, max_year)
            `)
            .eq('id', id)
            .single();

        if (error || !matchData) {
            console.error('Error loading match:', error);
            setLoading(false);
            return;
        }

        setMatch(matchData);
        setStreamingUrl(matchData.streaming_url || '');

        // 2. Fetch Lineups (All checked-in players)
        const { data: lineupsData } = await supabase
            .from('match_lineups')
            .select('*, player:players(*)') // Join to get names
            .eq('match_id', id);

        const currentLineups = lineupsData || [];
        setLineups(currentLineups);

        // 3. Rehydrate Game State from DB if exists
        // If sheet_data exists, load it.
        if (matchData.sheet_data) {
            // Restore state logic
            // NOTE: useVolleyMatch state structure MUST match saved structure
            // For now, let's assume sheet_data has the right shape or map it
            // implementation_plan.md says: submittedAt, sets_history, final_score...
            // If the match is IN PROGRESS, we should probably save/load 'current_state' column or reuse sheet_data for partial saves.
            // For simplicity, let's load what we can from columns:
            // current_set, current_set_points_home/away, sets_results

            // Actually, to support reload, we need full position state.
            // Let's rely on `sheet_data` containing the full state if available.
            if (matchData.sheet_data?.full_state) {
                setAllState(matchData.sheet_data.full_state);
            } else {
                // Initial Load or Fallback
                // We need to Populate bench/court from lineups if state is empty!
                // This logic is tricky: Initial Starters vs Subs.
                // For now, let's put EVERYONE on the bench initially? 
                // Or require a "Set Starters" phase?
                // The prompt implies "Planillero" workflow.
                // Let's put everyone in Bench initially, and User drags/selects starters?
                // Or auto-fill first 6?
                hydrateTeamsFromLineups(currentLineups, matchData.home_team_id, matchData.away_team_id);
            }
        } else {
            hydrateTeamsFromLineups(currentLineups, matchData.home_team_id, matchData.away_team_id);
        }

        setLoading(false);
    }

    function hydrateTeamsFromLineups(lineupsData: any[], homeId: string, awayId: string) {
        // Convert DB Lineup -> Hook Player
        const homePlayers: Player[] = lineupsData
            .filter(l => l.team_id === homeId)
            .map(l => ({
                id: l.player_id,
                number: l.jersey_number,
                name: `${l.player.last_name} ${l.player.first_name[0]}.`,
                isLibero: l.is_libero
            }))
            .sort((a, b) => a.number - b.number);

        const awayPlayers: Player[] = lineupsData
            .filter(l => l.team_id === awayId)
            .map(l => ({
                id: l.player_id,
                number: l.jersey_number,
                name: `${l.player.last_name} ${l.player.first_name[0]}.`,
                isLibero: l.is_libero
            }))
            .sort((a, b) => a.number - b.number);

        // Initially, put everyone on BENCH (or distribute if we had logical positions)
        // Let's assume user must set positions. 
        // OR pop 6 to pos?
        // Let's put top 6 on court for demo speed?

        const hPos = homePlayers.slice(0, 6);
        const hBench = homePlayers.slice(6);

        const aPos = awayPlayers.slice(0, 6);
        const aBench = awayPlayers.slice(6);

        setPosHome(hPos);
        setPosAway(aPos);
        // Note: setBenchHome won't update immediately if I use setAllState.
        // I should construct the object.

        setAllState({
            posHome: hPos, benchHome: hBench,
            posAway: aPos, benchAway: aBench,
            // also load scores from match columns
            currentSetIdx: (match?.current_set || 1) - 1,
            // scores?
        });
    }

    // --- DB SYNC ---
    async function saveMatchState() {
        if (!match) return;

        // Construct Full State
        const fullState = {
            sets, currentSetIdx, posHome, posAway, benchHome, benchAway, servingTeam, subsCount
        };

        // Derived Columns for plain reading
        const currentSetScore = sets[currentSetIdx];
        const setsResults = sets.filter(s => s.finished).map(s => `${s.home}-${s.away}`);

        const { error } = await supabase.from('matches').update({
            sheet_data: {
                full_state: fullState,
                last_updated: new Date().toISOString()
            },
            current_set: currentSetIdx + 1,
            current_set_points_home: currentSetScore.home,
            current_set_points_away: currentSetScore.away,
            sets_results: setsResults,
            streaming_url: streamingUrl,
            status: match.status === 'programado' ? 'en_curso' : match.status // Auto-start
        }).eq('id', id);

        if (error) console.error('Error saving state', error);
    }

    // Auto-save on critical changes (Debounced ideally, but direct for now)
    useEffect(() => {
        if (!loading && match) {
            const timeout = setTimeout(saveMatchState, 1000);
            return () => clearTimeout(timeout);
        }
    }, [sets, posHome, posAway, servingTeam, streamingUrl]);


    // --- HELPERS UI ---

    const handleAddPoint = (team: TeamSide) => {
        addPoint(team);
    };

    const handlePlayerClick = (player: Player, team: TeamSide, isBench: boolean) => {
        // If bench, maybe quick-sub?
        // If court, open action modal (Sub, Card, Libero swap)
        setSelectedPlayerForAction({ player, team });
        setIsSubModalOpen(true); // Direct to sub for demo, or open menu
    };

    const confirmSub = (playerIn: Player) => {
        if (selectedPlayerForAction) {
            substitutePlayer(selectedPlayerForAction.team, selectedPlayerForAction.player.id, playerIn);
            setIsSubModalOpen(false);
            setSelectedPlayerForAction(null);
        }
    };

    // --- RENDER ---

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando Planilla...</div>;
    if (!match) return <div className="min-h-screen bg-black text-white p-8">Partido no encontrado</div>;

    const currentScore = sets[currentSetIdx];

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans pb-20">
            {/* HEADER */}
            <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="p-2 hover:bg-zinc-800 rounded-full"><ChevronLeft /></button>
                    <div>
                        <h1 className="text-sm font-bold leading-tight">Acta Digital</h1>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-widest">{match.category?.name} • Set {currentSetIdx + 1}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={undo} className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white" title="Deshacer"><ArrowRightLeft size={16} /></button>
                    <button onClick={saveMatchState} className="p-2 bg-blue-600 rounded-lg text-white" title="Guardar"><Save size={16} /></button>
                </div>
            </header>

            {/* TABS HEADER */}
            <div className="px-4 pt-4">
                <div className="flex bg-zinc-900 rounded-xl p-1 mb-4">
                    <button onClick={() => setActiveTab('score')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'score' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>TANTEADOR</button>
                    <button onClick={() => setActiveTab('players')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'players' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>JUGADORES</button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'settings' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>AJUSTES</button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="px-4">

                {activeTab === 'score' && (
                    <div className="space-y-6">
                        {/* SCOREBOARD */}
                        <div className="flex gap-4 items-stretch h-40">
                            {/* HOME */}
                            <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden flex flex-col items-center justify-center p-4">
                                <div className="text-4xl font-black text-blue-500 mb-2">{currentScore.home}</div>
                                <div className="text-sm font-bold text-center leading-tight mb-2">{match.home_team.name}</div>
                                <button onClick={() => handleAddPoint('home')} className="absolute inset-0 w-full h-full opacity-0">Add Point</button>
                                {servingTeam === 'home' && <div className="absolute top-2 left-2 text-blue-500"><Zap size={16} fill="currentColor" /></div>}
                            </div>

                            {/* SET INFO */}
                            <div className="w-16 flex flex-col items-center justify-center gap-1">
                                <div className="text-zinc-600 font-bold text-xs uppercase">SET</div>
                                <div className="text-2xl font-black text-white">{currentSetIdx + 1}</div>
                                <div className="h-px w-8 bg-zinc-800 my-1"></div>
                                <div className="text-[10px] text-zinc-500">{sets.filter(s => s.finished).map(s => `${s.home}-${s.away}`).join(' ')}</div>
                            </div>

                            {/* AWAY */}
                            <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden flex flex-col items-center justify-center p-4">
                                <div className="text-4xl font-black text-orange-500 mb-2">{currentScore.away}</div>
                                <div className="text-sm font-bold text-center leading-tight mb-2">{match.away_team.name}</div>
                                <button onClick={() => handleAddPoint('away')} className="absolute inset-0 w-full h-full opacity-0">Add Point</button>
                                {servingTeam === 'away' && <div className="absolute top-2 right-2 text-orange-500"><Zap size={16} fill="currentColor" /></div>}
                            </div>
                        </div>

                        {/* COURT VISUALIZATION */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* HOME COURT (Left Side - Blue) */}
                            <div className="aspect-[3/4] bg-blue-900/10 border-2 border-blue-900/30 rounded-lg relative">
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-2 gap-2">
                                    {/* Rotated Positions logic visual? 
                                        Lets just map the array posHome.
                                        Visual: 
                                        4 3
                                        5 2
                                        6 1
                                        Standard indices: 0->Pos1, 1->Pos6...
                                        Grid:
                                        Row1: P4(3), P3(4)
                                        Row2: P5(2), P2(5)
                                        Row3: P6(1), P1(0)
                                     */}
                                    <PlayerChip player={posHome[3]} posName="4" onClick={() => handlePlayerClick(posHome[3], 'home', false)} />
                                    <PlayerChip player={posHome[4]} posName="3" onClick={() => handlePlayerClick(posHome[4], 'home', false)} />
                                    <PlayerChip player={posHome[2]} posName="5" onClick={() => handlePlayerClick(posHome[2], 'home', false)} />
                                    <PlayerChip player={posHome[5]} posName="2" onClick={() => handlePlayerClick(posHome[5], 'home', false)} />
                                    <PlayerChip player={posHome[1]} posName="6" onClick={() => handlePlayerClick(posHome[1], 'home', false)} />
                                    <PlayerChip player={posHome[0]} posName="1" onClick={() => handlePlayerClick(posHome[0], 'home', false)} isServing={servingTeam === 'home'} />
                                </div>
                            </div>

                            {/* AWAY COURT (Right Side - Orange) */}
                            <div className="aspect-[3/4] bg-orange-900/10 border-2 border-orange-900/30 rounded-lg relative">
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-2 gap-2">
                                    {/* Mirror for Away? 
                                        2 5
                                        3 4
                                        1 6 ? No, net is top.
                                        Net is Top. 
                                        Home (Bottom field): 4 3 2 (Front) / 5 6 1 (Back) ? 
                                        Usually standard diagram:
                                        Net
                                        4 3 2
                                        5 6 1
                                        
                                        If we split L/R: 
                                        Left (Home): Right side is net? 
                                        Let's assume Vertical View: Net in Middle? 
                                        Or Side-by-Side?
                                        Side-by-Side usually implies one team L, one R.
                                        Net is the vertical line between them.
                                        
                                        Home (Left):
                                        4 3 (Net)
                                        5 2 (Net)
                                        6 1 (Serve)
                                        
                                        Away (Right):
                                        (Net) 2 5
                                        (Net) 3 6
                                        (Serve) 1 ?
                                        
                                        Let's stick to Grid indices for simplicity.
                                     */}
                                    <PlayerChip player={posAway[3]} posName="4" onClick={() => handlePlayerClick(posAway[3], 'away', false)} />
                                    <PlayerChip player={posAway[4]} posName="3" onClick={() => handlePlayerClick(posAway[4], 'away', false)} />
                                    <PlayerChip player={posAway[2]} posName="5" onClick={() => handlePlayerClick(posAway[2], 'away', false)} />
                                    <PlayerChip player={posAway[5]} posName="2" onClick={() => handlePlayerClick(posAway[5], 'away', false)} />
                                    <PlayerChip player={posAway[1]} posName="6" onClick={() => handlePlayerClick(posAway[1], 'away', false)} />
                                    <PlayerChip player={posAway[0]} posName="1" onClick={() => handlePlayerClick(posAway[0], 'away', false)} isServing={servingTeam === 'away'} />
                                </div>
                            </div>
                        </div>

                        {/* CONTROLS */}
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => finishSet()} className="col-span-2 py-4 bg-zinc-800 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-zinc-700">
                                {currentScore.finished ? 'Iniciar Siguiente Set' : 'Cerrar Set'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'players' && (
                    <div className="space-y-6">
                        {/* JUST LIST LINEUPS for check-in management */}
                        {/* reuse logic from previous implementation for fetchTeamPlayers but simplify UI */}
                        <div className="bg-zinc-900 p-4 rounded-xl">
                            <h3 className="font-bold mb-4">{match.home_team.name}</h3>
                            {/* ... list available players ... */}
                            <p className="text-zinc-500 text-xs">Gestión en desarrollo. Usar pestaña 'Ajustes' para invitar.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-zinc-900 p-4 rounded-xl space-y-4">
                            <h3 className="font-bold text-white">Transmisión en Vivo</h3>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                                    placeholder="URL de YouTube / Twitch"
                                    value={streamingUrl}
                                    onChange={(e) => setStreamingUrl(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-zinc-500">Pegue el link completo. Se actualizará automáticamente.</p>
                        </div>
                    </div>
                )}

            </main>

            {/* SUB MODAL */}
            {isSubModalOpen && selectedPlayerForAction && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 border border-zinc-800">
                        <h3 className="text-xl font-black mb-1">#{selectedPlayerForAction.player.number} {selectedPlayerForAction.player.name}</h3>
                        <p className="text-zinc-500 text-sm mb-6 uppercase font-bold">Seleccionar sustituto</p>

                        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                            {(selectedPlayerForAction.team === 'home' ? benchHome : benchAway)
                                .map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => confirmSub(sub)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-black border border-zinc-800 hover:bg-zinc-800"
                                    >
                                        <span className="font-black text-lg w-8">{sub.number}</span>
                                        <span className="text-sm font-medium">{sub.name}</span>
                                    </button>
                                ))
                            }
                            {(selectedPlayerForAction.team === 'home' ? benchHome : benchAway).length === 0 && (
                                <p className="text-zinc-500 text-center text-sm">No hay suplentes disponibles.</p>
                            )}
                        </div>

                        <button onClick={() => setIsSubModalOpen(false)} className="w-full py-3 bg-zinc-800 rounded-xl font-bold">Cancelar</button>
                    </div>
                </div>
            )}

        </div>
    );
}

function PlayerChip({ player, posName, onClick, isServing }: { player?: Player, posName: string, onClick?: () => void, isServing?: boolean }) {
    if (!player) return (
        <div className="w-full h-full bg-black/20 rounded border border-white/5 flex items-center justify-center">
            <span className="text-white/20 font-black text-xl">{posName}</span>
        </div>
    );

    return (
        <button onClick={onClick} className={`w-full h-full rounded border flex flex-col items-center justify-center relative transition-transform active:scale-95
            ${player.isLibero ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-zinc-800 border-zinc-700 text-white'}
        `}>
            {isServing && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>}
            <span className="font-black text-xl leading-none">{player.number}</span>
            <span className="text-[10px] font-medium truncate max-w-full px-1">{player.name}</span>
        </button>
    );
}
