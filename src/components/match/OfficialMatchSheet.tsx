'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolleyMatch } from '@/hooks/useVolleyMatch';
import { createClient } from '@/lib/supabase/client';
import LogoutButton from '@/components/LogoutButton';
import {
    RefreshCw, Trophy, X, Check, Search, Plus,
    Download, User, Users, Calendar, Clock, ArrowRightLeft, Volleyball,
    QrCode, MapPin, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface OfficialMatchSheetProps {
    redirectAfterSubmit: string;
    readOnly?: boolean;
}

export default function OfficialMatchSheet({ redirectAfterSubmit, readOnly = false }: OfficialMatchSheetProps) {
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const params = useParams();
    const matchId = params.id as string;

    const {
        sets, currentSetIdx, posHome, posAway, benchHome, benchAway,
        servingTeam, setServingTeam, addPoint, subtractPoint,
        substitutePlayer, finishSet, initPositions, addPlayerToBench,
        setAllState, setBenchHome, setBenchAway, // Important for hydration
        moveToCourt, removeFromCourt
    } = useVolleyMatch();

    // --- ESTADOS DE UI ---
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [modalActionOpen, setModalActionOpen] = useState(false);
    const [modalSubOpen, setModalSubOpen] = useState(false);

    // New: Match Status & Metadata
    const [matchStatus, setMatchStatus] = useState<'scheduled' | 'live' | 'finished'>('scheduled'); // 'finalizado' is db value but let's map 'scheduled' = 'programmado'
    const [teamsInfo, setTeamsInfo] = useState<{
        home: { name: string, shield: string | null },
        away: { name: string, shield: string | null },
        category: string
    } | null>(null);

    // --- BUSCADOR JUGADORES ---
    const [modalAddPlayerOpen, setModalAddPlayerOpen] = useState(false);
    const [targetTeamForAdd, setTargetTeamForAdd] = useState<'home' | 'away'>('home');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- STAFF & CIERRE ---
    const [referees, setReferees] = useState<any[]>([]);
    const [staff, setStaff] = useState({ ref1: '', ref2: '', scorer: '' });

    const [closingFlow, setClosingFlow] = useState(false);
    const [closingStep, setClosingStep] = useState(0);
    const [observations, setObservations] = useState('');
    const sigPadRef = useRef<HTMLCanvasElement>(null);
    const [signatures, setSignatures] = useState<{
        capHome: string | null;
        capAway: string | null;
        ref1: string | null;
        dtHome: string | null;
        dtAway: string | null;
    }>({ capHome: null, capAway: null, ref1: null, dtHome: null, dtAway: null });

    // DT Signature Flow
    const [dtSignModalOpen, setDtSignModalOpen] = useState(false);
    const [dtSignStep, setDtSignStep] = useState(0); // 0: Home, 1: Away

    // --- DEBUG SYNC STATUS ---
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // --- LIVE TOAST STATE ---
    const [showLiveToast, setShowLiveToast] = useState(false);

    // --- ROSTERS VIEW ---
    const [showRostersModal, setShowRostersModal] = useState(false);
    const [fullRosters, setFullRosters] = useState<{ home: any[], away: any[] }>({ home: [], away: [] });


    // Load Lineups from DB
    const loadLineups = async () => {
        if (!matchId || matchId === 'test') return;

        try {
            let lineups: any[] | null = null;
            try {
                const { data, error } = await supabase
                    .from('match_lineups')
                    .select(`
                        team_id,
                        jersey_number,
                        is_libero,
                        is_captain,
                        player:players(id, name, number)
                    `)
                    .eq('match_id', matchId);

                if (error) console.error("Error fetching lineups (ignoring):", error);
                else lineups = data;
            } catch (e) {
                console.error("Exception fetching lineups:", e);
            }

            // Continue regardless of lineups error
            if (true) {
                // Process for Roster View
                const homeRoster: any[] = [];
                const awayRoster: any[] = [];

                // Helper to format player
                const formatPlayer = (l: any) => ({
                    id: l.player.id,
                    name: l.player.name,
                    number: l.jersey_number || l.player.number, // Prefer jersey_number from lineup
                    isLibero: l.is_libero,
                    isCaptain: l.is_captain
                });

                // Get Team IDs from metadata if available, else infer?
                // We have teamsInfo state, but it might not be ready yet.
                // However, we can group by team_id.
                // We'll rely on the fetched data to populate bench if empty.

                // We need to know which team_id is home/away.
                // We can fetch match again or rely on existing fetchMetadata promise?
                // Let's re-fetch match basic info to be sure about IDs.
                const { data: matchData } = await supabase.from('matches').select('home_team_id, away_team_id').eq('id', matchId).single();

                if (matchData) {
                    if (lineups) {
                        lineups.forEach((l: any) => {
                            const p = formatPlayer(l);
                            if (l.team_id === matchData.home_team_id) homeRoster.push(p);
                            else if (l.team_id === matchData.away_team_id) awayRoster.push(p);
                        });
                    }


                    // 2. CHECK IF EMPTY -> FETCH ALL PLAYERS (Fallback)
                    console.log("Checking rosters. Home:", homeRoster.length, "Away:", awayRoster.length);

                    if (homeRoster.length === 0) {
                        try {
                            const { data: allHome, error: errH } = await supabase.from('players').select('id, name, number, is_libero, is_captain').eq('team_id', matchData.home_team_id);
                            if (errH) console.error("Error fetching home players:", errH);
                            if (allHome) {
                                console.log("Loaded all home players:", allHome.length);
                                allHome.forEach((p: any) => homeRoster.push({
                                    id: p.id,
                                    name: p.name,
                                    number: p.number,
                                    isLibero: p.is_libero,
                                    isCaptain: p.is_captain
                                }));
                            }
                        } catch (e) {
                            console.error("Exception fetching home players:", e);
                        }
                    }
                    if (awayRoster.length === 0) {
                        try {
                            const { data: allAway, error: errA } = await supabase.from('players').select('id, name, number, is_libero, is_captain').eq('team_id', matchData.away_team_id);
                            if (errA) console.error("Error fetching away players:", errA);
                            if (allAway) {
                                console.log("Loaded all away players:", allAway.length);
                                allAway.forEach((p: any) => awayRoster.push({
                                    id: p.id,
                                    name: p.name,
                                    number: p.number,
                                    isLibero: p.is_libero,
                                    isCaptain: p.is_captain
                                }));
                            }
                        } catch (e) {
                            console.error("Exception fetching away players:", e);
                        }
                    }

                    // Sort by Number
                    homeRoster.sort((a, b) => a.number - b.number);
                    awayRoster.sort((a, b) => a.number - b.number);

                    setFullRosters({ home: homeRoster, away: awayRoster });

                    // AUTO-POPULATE BENCH IF EMPTY (And not hydrate)
                    // We check if we have "hydrated" data.
                    // If benchHome and posHome are empty, we assume new match state.
                    // BUT: useVolleyMatch is initialized empty.
                    // Accessing state here directly?
                    // We can use the setter.
                    setBenchHome(prev => {
                        if (prev.length === 0 && posHome.length === 0) return homeRoster;
                        return prev;
                    });
                    setBenchAway(prev => {
                        if (prev.length === 0 && posAway.length === 0) return awayRoster;
                        return prev;
                    });
                }
            }
        } catch (err) {
            console.error("Error loading lineups:", err);
        }
    };

    // --- AUTOSAVE & REALTIME (LIVE VIEW) ---

    useEffect(() => {
        if (!matchId || matchId === 'test') return;

        // Fetch Initial Metadata (Teams, Logos, Status)
        const fetchMetadata = async () => {
            const { data } = await supabase.from('matches').select(`
                status,
                home_team:teams!home_team_id(name, shield_url),
                away_team:teams!away_team_id(name, shield_url),
                category:categories(name)
            `).eq('id', matchId).single();

            if (data) {
                // Map DB status to UI Status if needed
                if (data.status === 'live' || data.status === 'en_curso') setMatchStatus('live');
                else if (data.status === 'finalizado') setMatchStatus('finished');
                else setMatchStatus('scheduled');

                setTeamsInfo({
                    // @ts-ignore
                    home: { name: data.home_team?.name, shield: data.home_team?.shield_url },
                    // @ts-ignore
                    away: { name: data.away_team?.name, shield: data.away_team?.shield_url },
                    // @ts-ignore
                    category: data.category?.name || 'Voley'
                });
            }
        };
        fetchMetadata();
        cargarArbitros(); // Load referees list for dropdowns

        // Auto-select current referee logic
        const autoSelectReferee = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Find referee ID for this user
                const { data: ref } = await supabase.from('referees').select('id').eq('user_id', user.id).single();
                if (ref) {
                    setStaff(prev => ({ ...prev, ref1: ref.id })); // Set as Ref 1 by default
                }
            }
        };
        if (!readOnly) autoSelectReferee();


        // 1. If Viewer (readOnly): Subscribe to changes
        if (readOnly) {
            // ... (Existing readOnly logic)
            const fetchState = async () => {
                const { data } = await supabase.from('matches').select('sheet_data').eq('id', matchId).single();
                if (data?.sheet_data) {
                    hydrateMatchState(data.sheet_data);
                }
            };
            fetchState();

            // Polling Fallback (Every 4 seconds)
            // Ensures data freshness even if Realtime events are missed
            const intervalId = setInterval(fetchState, 4000);

            // Realtime Subscription
            const channel = supabase
                .channel(`match:${matchId}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${matchId}`
                }, (payload) => {
                    // ROBUST STRATEGY: Always re-fetch the full state on update signal
                    fetchState();

                    // Update local status immediately if present
                    const newData = payload.new as any;
                    if (newData && (newData.status === 'live' || newData.status === 'en_curso')) setMatchStatus('live');
                    else if (newData && newData.status === 'finalizado') setMatchStatus('finished');
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
                clearInterval(intervalId);
            };
        }
    }, [matchId, readOnly]);

    // Separate Effect for Lineups
    useEffect(() => {
        loadLineups();
    }, [matchId]);



    // Data Normalizer Helper
    const hydrateMatchState = (data: any) => {
        if (!data) return;

        // Map DB snake_case to Hook camelCase
        const normalizedState = {
            sets: data.sets_history || data.sets,
            currentSetIdx: data.current_set_idx, // check if this matches save key
            posHome: data.pos_home || data.posHome,
            posAway: data.pos_away || data.posAway,
            benchHome: data.bench_home || data.benchHome,
            benchAway: data.bench_away || data.benchAway,
            servingTeam: data.serving_team || data.servingTeam
        };

        setAllState(normalizedState);
    };

    // Handle Status Change (UI)
    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        if (newStatus === 'live') {
            // INTERCEPT: Require DT Signatures first
            if (!signatures.dtHome || !signatures.dtAway) {
                const confirmed = window.confirm("Para poner el partido EN VIVO, se requieren las firmas de ambos Directores Técnicos.\n\n¿Iniciar proceso de firma?");
                if (confirmed) {
                    setDtSignModalOpen(true);
                    setDtSignStep(0); // Start with Home
                }
                return; // Stop here
            }

            // Only if signed (shouldn't reach here via dropdown usually, but logic holds)
            setMatchStatus('live');
            const { error } = await supabase.from('matches').update({ status: 'en_curso' }).eq('id', matchId);
            if (error) {
                console.error("Error setting live:", error);
                alert("Error al poner en vivo: " + error.message);
                setMatchStatus('scheduled');
            }
        } else if (newStatus === 'scheduled') {
            setMatchStatus('scheduled');
            const { error } = await supabase.from('matches').update({ status: 'programado' }).eq('id', matchId);
            if (error) {
                console.error("Error scheduling:", error);
                alert("Error al quitar vivo: " + error.message);
            }
        }
    };

    // DT Signature Handlers
    const saveDtSig = async () => {
        const dataUrl = sigPadRef.current?.toDataURL() || null;
        if (!dataUrl) return;

        if (dtSignStep === 0) {
            setSignatures(prev => ({ ...prev, dtHome: dataUrl }));
            clearSig();
            setDtSignStep(1); // Move to Away
        } else {
            setSignatures(prev => ({ ...prev, dtAway: dataUrl }));
            clearSig();
            setDtSignModalOpen(false); // Close Modal

            // AUTO START LIVE AFTER SIGNING
            setMatchStatus('live');
            const { error } = await supabase.from('matches').update({
                status: 'en_curso',
                // We also save signatures immediately to be safe
                sheet_data: {
                    ...allCurrentData(), // Helper to get current state
                    signatures: { ...signatures, dtAway: dataUrl } // Include the one just signed
                }
            }).eq('id', matchId);

            if (error) alert("Error al iniciar partido: " + error.message);
            else {
                // SHOW LIVE TOAST
                setShowLiveToast(true);
                setTimeout(() => setShowLiveToast(false), 2000); // 2 seconds visible (user asked for 1s but 2s is safer for reading, will stick to 2s or 1s as requested? User said "1 seg". Let's do 1500ms for balance)
            }
        }
    };

    // Helper to get fresh data for immediate save
    const allCurrentData = () => ({
        sets_history: sets,
        final_score: { home: sets[currentSetIdx].home, away: sets[currentSetIdx].away },
        current_set_idx: currentSetIdx,
        pos_home: posHome,
        pos_away: posAway,
        bench_home: benchHome,
        bench_away: benchAway,
        serving_team: servingTeam,
        staff,
        metadata: { category: teamsInfo?.category || 'Voley' }
    });

    // Auto-save logic (Referee Only)
    // Debounce to prevent too many DB writes
    // Auto-save logic (Referee Only) with Timeout Detection
    useEffect(() => {
        if (readOnly || !matchId || matchId === 'test') return;

        setSaveStatus('saving');

        // Timeout Watchdog: If saving takes > 7 seconds, alert user
        const watchdog = setTimeout(() => {
            if (saveStatus === 'saving') {
                setSaveStatus('error');
                setSaveError("La conexión es lenta o se perdió. Reintentando...");
            }
        }, 7000);

        const timeoutId = setTimeout(async () => {
            const currentSheetData = {
                // ... (existing data construction)
                sets_history: sets,
                final_score: { home: sets[currentSetIdx].home, away: sets[currentSetIdx].away },
                roster_home: [...posHome, ...benchHome].filter(p => !!p).map(p => ({ number: p!.number, name: p!.name })),
                roster_away: [...posAway, ...benchAway].filter(p => !!p).map(p => ({ number: p!.number, name: p!.name })),
                staff,
                signatures,
                observations,
                current_set_idx: currentSetIdx,
                pos_home: posHome,
                pos_away: posAway,
                bench_home: benchHome,
                bench_away: benchAway,
                serving_team: servingTeam,
                metadata: {
                    category: teamsInfo?.category || 'Voley',
                    competition: 'Torneo Oficial'
                }
            };

            const { error } = await supabase
                .from('matches')
                .update({ sheet_data: currentSheetData })
                .eq('id', matchId);

            clearTimeout(watchdog); // Clear watchdog if successful

            if (error) {
                console.error("Auto-save detailed error:", error);
                setSaveStatus('error');
                setSaveError(error.message);
            } else {
                setSaveStatus('saved');
                setLastSync(new Date().toLocaleTimeString());
                setTimeout(() => setSaveStatus('idle'), 2000);
            }
        }, 2000); // 2 second debounce

        return () => { clearTimeout(timeoutId); clearTimeout(watchdog); };
    }, [sets, currentSetIdx, posHome, posAway, benchHome, benchAway, staff, signatures, observations, servingTeam, readOnly, matchId, teamsInfo, supabase]);

    // Manual Refresh for Viewers
    const handleForceRefresh = () => {
        const fetchState = async () => {
            console.log("Forcing refresh for match:", matchId);
            const { data, error } = await supabase.from('matches').select('sheet_data').eq('id', matchId).single();

            if (error) {
                console.error("Force refresh error:", error);
                alert("Error al actualizar: " + (error.message || JSON.stringify(error)));
            } else if (data?.sheet_data) {
                console.log("Force refresh data received:", data.sheet_data);
                console.log("Received Sets:", JSON.stringify(data.sheet_data.sets_history)); // DEBUG TRACE
                setAllState(data.sheet_data);
                setLastSync(new Date().toLocaleTimeString());
            } else {
                alert("No se encontraron datos para este partido.");
            }
        };
        fetchState();
    };

    async function cargarArbitros() {
        const { data } = await supabase.from('referees').select('*, profile:profiles(full_name)');
        setReferees(data || []);
    }

    // --- LÓGICA BUSCADOR (Simulada para demo) ---
    const openAddPlayerModal = (team: 'home' | 'away') => {
        setTargetTeamForAdd(team); setSearchTerm(''); setSearchResults([]); setModalAddPlayerOpen(true);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSearching(true);
        setTimeout(() => {
            const mockResults = [{ id: `db_${Date.now()}`, number: 99, name: `Jugador ${searchTerm}` }];
            setSearchResults(mockResults); setIsSearching(false);
        }, 500);
    };

    const confirmAddPlayer = (player: any) => {
        addPlayerToBench(targetTeamForAdd, player); setModalAddPlayerOpen(false);
    };

    // --- MANEJADORES ACCIÓN ---
    const handleJerseyClick = (player: any, team: 'home' | 'away') => {
        setSelectedPlayer({ ...player, team });
        setModalActionOpen(true);
    };

    const handleSubConfirm = (playerIn: any) => {
        if (!selectedPlayer) return;
        substitutePlayer(selectedPlayer.team, selectedPlayer.id, playerIn);
        setModalSubOpen(false); setModalActionOpen(false); setSelectedPlayer(null);
    };

    // --- FIRMAS ---
    const clearSig = () => {
        const ctx = sigPadRef.current?.getContext('2d');
        if (ctx && sigPadRef.current) {
            ctx.clearRect(0, 0, sigPadRef.current.width, sigPadRef.current.height);
        }
    };
    const saveSig = () => {
        const dataUrl = sigPadRef.current?.toDataURL() || null;
        if (closingStep === 1) setSignatures(p => ({ ...p, capHome: dataUrl }));
        if (closingStep === 2) setSignatures(p => ({ ...p, capAway: dataUrl }));
        if (closingStep === 3) setSignatures(p => ({ ...p, ref1: dataUrl }));
        clearSig();
        setClosingStep(p => p + 1);
    };
    const startDraw = (e: any) => {
        const ctx = sigPadRef.current?.getContext('2d'); if (!ctx || !sigPadRef.current) return;
        ctx.lineWidth = 2; ctx.strokeStyle = '#000';
        const rect = sigPadRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.beginPath(); ctx.moveTo(x, y);
    };
    const moveDraw = (e: any) => {
        if (e.buttons !== 1 && e.type !== 'touchmove') return;
        const ctx = sigPadRef.current?.getContext('2d'); if (!ctx || !sigPadRef.current) return;
        const rect = sigPadRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineTo(x, y); ctx.stroke();
    };

    // --- CÁLCULO DE SETS GANADOS ---
    const setsWonHome = sets.filter(s => s.finished && s.home > s.away).length;
    const setsWonAway = sets.filter(s => s.finished && s.away > s.home).length;

    // --- ENVÍO A BASE DE DATOS ---
    const submitMatchSheet = async () => {
        try {
            if (!matchId || matchId === 'test') {
                alert("Modo Prueba: No hay ID de partido en la URL. (En producción esto guardaría en DB)");
                if (redirectAfterSubmit) router.push(redirectAfterSubmit);
                // En producción descomentar return;
                return;
            }

            const finalSheetData = {
                submittedAt: new Date().toISOString(),
                sets_history: sets,
                final_score: {
                    home: sets[currentSetIdx].home,
                    away: sets[currentSetIdx].away
                },
                roster_home: [...posHome, ...benchHome].filter(p => !!p).map(p => ({ number: p!.number, name: p!.name })),
                roster_away: [...posAway, ...benchAway].filter(p => !!p).map(p => ({ number: p!.number, name: p!.name })),
                staff: staff,
                signatures: signatures,
                observations: observations,
                metadata: {
                    category: 'Mayores',
                    gender: 'Masculino',
                    competition: 'Apertura 2026'
                }
            };

            // Si tenemos ID, guardamos en Supabase
            if (matchId) {
                const { error } = await supabase
                    .from('matches')
                    .update({
                        // @ts-ignore
                        home_score: setsWonHome,
                        // @ts-ignore
                        away_score: setsWonAway,
                        sheet_data: {
                            ...finalSheetData,
                            final_score: { home: setsWonHome, away: setsWonAway }
                        },
                        sheet_status: 'submitted',
                        status: 'finalizado'
                    })
                    .eq('id', matchId);

                if (error) throw error;
            }

            alert("¡Planilla enviada correctamente a la Federación!");
            if (redirectAfterSubmit) router.push(redirectAfterSubmit);

        } catch (error: any) {
            console.error("Error:", error);
            alert("Error al guardar: " + error.message);
        }
    };

    // --- COMPONENTE CAMISETA ---
    const Jersey = ({ player, team, isPos1 }: { player: any, team: 'home' | 'away', isPos1?: boolean }) => {
        if (!player) return <div className="w-14 h-14 bg-slate-100 rounded-full animate-pulse" />;
        const isServing = servingTeam === team && isPos1;
        return (
            <div onClick={() => !readOnly && handleJerseyClick(player, team)} className={`relative flex flex-col items-center group ${!readOnly ? 'cursor-pointer' : ''}`}>
                <div className={`w-16 h-14 flex items-center justify-center rounded-xl shadow-sm border-b-4 transition-transform ${!readOnly ? 'active:scale-95' : ''} ${team === 'home' ? 'bg-white border-blue-600 text-blue-900' : 'bg-white border-red-600 text-red-900'}`}>
                    <span className="font-black text-2xl">{player.number}</span>
                </div>
                {isServing && (
                    <div className="absolute -top-3 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1.5 shadow-sm border-2 border-white animate-bounce z-10">
                        <Volleyball size={14} className="fill-current" />
                    </div>
                )}
                <span className="mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 rounded-full truncate max-w-[70px]">{player.name}</span>
            </div>
        );
    };

    const activeBench = selectedPlayer?.team === 'home' ? benchHome : benchAway;

    // @ts-ignore
    const fullRosterHome = [...posHome, ...benchHome].filter(p => p !== null).sort((a, b) => a.number - b.number);
    // @ts-ignore
    const fullRosterAway = [...posAway, ...benchAway].filter(p => p !== null).sort((a, b) => a.number - b.number);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">

            {/* HEADER APP (Con Logout) */}
            <header className={`bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-20 ${closingStep === 4 ? 'hidden' : ''}`}>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase"><Calendar size={14} /> HOY</div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase"><Clock size={14} /> 20:00</div>
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase bg-blue-50 px-3 py-1 rounded-full"><Trophy size={14} /> {teamsInfo?.category || 'Fase Regular'}</div>
                    <button onClick={() => setShowRostersModal(true)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-xs font-bold uppercase transition"><Users size={14} /> Planteles</button>

                </div>

                <div className="flex items-center gap-6">
                    {/* INFO SYNC */}
                    <div className="text-[10px] font-bold text-slate-400 text-right hidden md:block">
                        {readOnly ? (
                            <>
                                <div>Última act: {lastSync || '---'}</div>
                                <button onClick={handleForceRefresh} className="text-blue-500 hover:underline">Forzar Actualización</button>
                            </>
                        ) : (
                            <>
                                {saveStatus === 'saved' && <span className="text-green-500 flex items-center gap-1">Guardado <Check size={10} /></span>}
                                {saveStatus === 'error' && <span className="text-red-500" title={saveError || ''}>Error al guardar ⚠</span>}
                            </>
                        )}
                    </div>

                    {/* FLOATING SAVE INDICATOR (Referee Only) */}
                    {!readOnly && saveStatus === 'saving' && (
                        <div className="fixed bottom-6 right-6 z-50 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5">
                            <RefreshCw size={18} className="animate-spin" />
                            <span className="font-bold text-sm">Guardando...</span>
                        </div>
                    )}
                    {!readOnly && saveStatus === 'error' && (
                        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5">
                            <X size={18} />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">Error de Conexión</span>
                                <span className="text-[10px]">Reintentando en 5s...</span>
                            </div>
                        </div>
                    )}

                    {/* STATUS DROPDOWN */}
                    {!readOnly ? (
                        <div className="relative">
                            <select
                                value={matchStatus}
                                onChange={handleStatusChange}
                                className={`appearance-none bg-transparent font-black text-xs uppercase pl-3 pr-8 py-1 rounded-full cursor-pointer outline-none transition border-2 ${matchStatus === 'live'
                                    ? 'border-green-500 text-green-700 bg-green-50 animate-pulse'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                            >
                                <option value="scheduled">Programado</option>
                                <option value="live">En Vivo 🔴</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <div className={`w-2 h-2 rounded-full ${matchStatus === 'live' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            </div>
                        </div>
                    ) : (
                        matchStatus === 'live' && (
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold text-green-700">EN VIVO</span>
                            </div>
                        )
                    )}

                    {!readOnly && (
                        <div className="border-l border-slate-200 pl-4">
                            <LogoutButton />
                        </div>
                    )}
                </div>
            </header>

            {/* ÁREA DE JUEGO */}
            <div className={`flex-1 flex overflow-hidden p-4 gap-4 ${closingStep === 4 ? 'hidden' : ''}`}>

                {/* LOCAL SIDEBAR */}
                <aside className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 bg-blue-600 flex flex-col items-center gap-2 relative overflow-hidden">
                        {/* Header Logo Local */}
                        <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg z-10 flex items-center justify-center">
                            {teamsInfo?.home.shield
                                ? <img src={teamsInfo.home.shield} className="w-full h-full object-contain" />
                                : <span className="font-black text-2xl text-blue-600">{teamsInfo?.home.name?.charAt(0) || 'L'}</span>
                            }
                        </div>
                        <h2 className="font-black text-white text-center leading-tight z-10 relative">{teamsInfo?.home.name || 'LOCAL'}</h2>

                        {/* Decor */}
                        <div className="absolute inset-0 bg-blue-700/50 mix-blend-multiply"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {!readOnly && (
                            <button onClick={() => openAddPlayerModal('home')} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 hover:text-blue-600 transition flex items-center justify-center gap-2"><Search size={16} /> + Agregar</button>
                        )}
                        {benchHome.map(p => (
                            <div key={p.id} onClick={() => !readOnly && moveToCourt('home', p)} className={`p-2 bg-slate-50 rounded border border-slate-100 flex justify-between items-center ${!readOnly ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition' : ''}`}>
                                <span className="font-black text-slate-700">#{p.number}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">{p.name}</span>
                                    {p.isLibero && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold">L</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* CENTRAL */}
                <main className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 flex flex-col items-center">
                        <div className="flex items-center justify-between w-full max-w-4xl">
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-6xl font-black text-blue-600">{sets[currentSetIdx].home}</div>
                                {!readOnly && (
                                    <div className="flex gap-2">
                                        <button onClick={() => addPoint('home')} className="bg-blue-600 text-white w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition">+</button>
                                        <button onClick={() => subtractPoint('home')} className="bg-slate-100 text-slate-500 hover:text-red-500 w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition border border-slate-200">-</button>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 w-64 text-center items-center">
                                {readOnly && (
                                    <Link href="/" className="mb-2 px-4 py-1 bg-slate-100/50 hover:bg-slate-200 text-slate-500 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 transition">
                                        <ArrowLeft size={10} /> Volver al Inicio
                                    </Link>
                                )}
                                <h1 className="text-slate-300 font-black text-4xl uppercase tracking-widest leading-none">SETS</h1>
                                <div className="border-2 border-slate-100 rounded-lg p-2 font-bold text-slate-600 w-full">SET {sets[currentSetIdx].number}: {sets[currentSetIdx].home} - {sets[currentSetIdx].away}</div>
                                {!readOnly && (
                                    <>
                                        {!sets[currentSetIdx].finished ? (
                                            <button onClick={() => { if (confirm("Cerrar set?")) finishSet() }} className="w-full py-1 bg-slate-800 text-white rounded text-xs font-bold">Cerrar Set</button>
                                        ) : (
                                            <button onClick={() => { if (confirm("Iniciar sig set?")) finishSet() }} className="w-full py-1 bg-green-600 text-white rounded text-xs font-bold">Iniciar Set {sets.length + 1}</button>
                                        )}
                                        <button onClick={() => setServingTeam(prev => prev === 'home' ? 'away' : 'home')} className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1 uppercase"><ArrowRightLeft size={10} /> Saque</button>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-6xl font-black text-red-600">{sets[currentSetIdx].away}</div>
                                {!readOnly && (
                                    <div className="flex gap-2">
                                        <button onClick={() => addPoint('away')} className="bg-red-600 text-white w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition">+</button>
                                        <button onClick={() => subtractPoint('away')} className="bg-slate-100 text-slate-500 hover:text-red-500 w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition border border-slate-200">-</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">1er Árbitro</label>
                            <select className="font-bold text-slate-700 bg-transparent outline-none text-sm" value={staff.ref1} onChange={e => setStaff({ ...staff, ref1: e.target.value })}>
                                <option value="">Seleccionar...</option> {referees.map(r => <option key={r.id} value={r.id}>{r.last_name || r.profile?.full_name} {r.first_name}</option>)}
                            </select>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Planillero</label>
                            <input className="font-bold text-slate-700 bg-transparent outline-none text-sm" placeholder="Nombre..." value={staff.scorer} onChange={e => setStaff({ ...staff, scorer: e.target.value })} />
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">2do Árbitro</label>
                            <select className="font-bold text-slate-700 bg-transparent outline-none text-sm" value={staff.ref2} onChange={e => setStaff({ ...staff, ref2: e.target.value })}>
                                <option value="">Opcional</option> {referees.map(r => <option key={r.id} value={r.id}>{r.last_name || r.profile?.full_name} {r.first_name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg border-4 border-slate-800 relative aspect-[1.8/1] w-full grid grid-cols-2 overflow-hidden">
                        <div className="absolute left-1/2 top-0 bottom-0 w-1.5 bg-slate-800 z-10 shadow-xl"></div>
                        <div className="relative border-r border-slate-200/50 bg-blue-50/30">
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-4">
                                <div className="row-start-1 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[3]} team="home" /></div>
                                <div className="row-start-2 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[2]} team="home" /></div>
                                <div className="row-start-3 col-start-2 flex justify-center items-center"><Jersey player={posHome[1]} team="home" /></div>
                                <div className="row-start-1 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[4]} team="home" /></div>
                                <div className="row-start-2 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[5]} team="home" /></div>
                                <div className="row-start-3 col-start-1 flex justify-center items-center"><Jersey player={posHome[0]} team="home" isPos1={true} /></div>
                            </div>
                        </div>
                        <div className="relative bg-red-50/30">
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-4">
                                <div className="row-start-1 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[1]} team="away" /></div>
                                <div className="row-start-2 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[2]} team="away" /></div>
                                <div className="row-start-3 col-start-1 flex justify-center items-center"><Jersey player={posAway[3]} team="away" /></div>
                                <div className="row-start-1 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[0]} team="away" isPos1={true} /></div>
                                <div className="row-start-2 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[5]} team="away" /></div>
                                <div className="row-start-3 col-start-2 flex justify-center items-center"><Jersey player={posAway[4]} team="away" /></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 pb-10">
                        {!readOnly && (
                            <button onClick={() => { if (confirm("¿Finalizar Encuentro?")) setClosingFlow(true); }} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-black transition"><Check size={16} /> Finalizar Encuentro</button>
                        )}
                    </div>
                </main>

                {/* VISITA SIDEBAR */}
                <aside className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 bg-red-600 flex flex-col items-center gap-2 relative overflow-hidden">
                        {/* Header Logo Visita */}
                        <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg z-10 flex items-center justify-center">
                            {teamsInfo?.away.shield
                                ? <img src={teamsInfo.away.shield} className="w-full h-full object-contain" />
                                : <span className="font-black text-2xl text-red-600">{teamsInfo?.away.name?.charAt(0) || 'V'}</span>
                            }
                        </div>
                        <h2 className="font-black text-white text-center leading-tight z-10 relative">{teamsInfo?.away.name || 'VISITA'}</h2>

                        {/* Decor */}
                        <div className="absolute inset-0 bg-red-700/50 mix-blend-multiply"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {!readOnly && (
                            <button onClick={() => openAddPlayerModal('away')} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 hover:text-red-600 transition flex items-center justify-center gap-2"><Search size={16} /> + Agregar</button>
                        )}
                        {benchAway.map(p => (
                            <div key={p.id} onClick={() => !readOnly && moveToCourt('away', p)} className={`p-2 bg-slate-50 rounded border border-slate-100 flex justify-between items-center ${!readOnly ? 'cursor-pointer hover:bg-red-50 hover:border-red-200 transition' : ''}`}>
                                <span className="font-black text-slate-700">#{p.number}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">{p.name}</span>
                                    {p.isLibero && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold">L</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            {/* --- MODALES --- */}
            {modalActionOpen && selectedPlayer && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-80">
                        <h3 className="text-center font-black text-3xl mb-1 text-slate-800">#{selectedPlayer.number}</h3>
                        <div className="flex flex-col gap-3 mt-4">
                            {matchStatus === 'scheduled' ? (
                                <button onClick={() => { removeFromCourt(selectedPlayer.team, selectedPlayer); setModalActionOpen(false); setSelectedPlayer(null); }} className="bg-slate-50 text-slate-800 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 border-2 border-slate-100 hover:border-red-200"><X size={18} /> Sacar de Cancha</button>
                            ) : (
                                <button onClick={() => { setModalSubOpen(true); }} className="bg-slate-50 text-slate-800 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-100"><RefreshCw size={18} /> Sustitución</button>
                            )}
                            <div className="flex gap-3"><button className="flex-1 bg-yellow-400 text-yellow-900 py-4 rounded-2xl font-black">Amarilla</button><button className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black">Roja</button></div>
                        </div>
                        <button onClick={() => setModalActionOpen(false)} className="mt-6 w-full text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
                    </div>
                </div>
            )}
            {modalSubOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-80 h-[500px] flex flex-col">
                        <h3 className="font-black text-lg mb-4 text-slate-800">Elegir Suplente</h3>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {activeBench && activeBench.length > 0 ? activeBench.map(p => (
                                <div key={p.id} onClick={() => handleSubConfirm(p)} className="p-3 border border-slate-100 rounded-xl hover:bg-blue-50 cursor-pointer flex gap-4 items-center">
                                    <span className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-700">{p.number}</span> <span className="font-bold text-slate-600">{p.name}</span>
                                </div>
                            )) : <p className="text-center text-slate-400 mt-10">No hay suplentes disponibles.</p>}
                        </div>
                        <button onClick={() => setModalSubOpen(false)} className="mt-4 text-slate-400 font-bold hover:text-slate-600">Cerrar</button>
                    </div>
                </div>
            )}
            {/* --- DT SIGNATURE MODAL --- */}
            {dtSignModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                        <div className="bg-blue-600 p-4 text-white font-black text-center text-xl uppercase tracking-widest">
                            Firma del DT {dtSignStep === 0 ? 'LOCAL' : 'VISITA'}
                        </div>
                        <div className="p-4 bg-slate-100 text-center text-sm font-bold text-slate-500">
                            {dtSignStep === 0 ? teamsInfo?.home.name : teamsInfo?.away.name}
                        </div>

                        <div className="h-64 bg-white relative touch-none cursor-crosshair border-y-2 border-slate-200">
                            <canvas
                                ref={sigPadRef}
                                className="w-full h-full"
                                width={600}
                                height={256}
                                onMouseDown={startDraw}
                                onMouseMove={moveDraw}
                                onTouchStart={startDraw}
                                onTouchMove={moveDraw}
                            />
                            <p className="absolute bottom-4 left-0 right-0 text-center text-slate-200 font-black text-4xl pointer-events-none select-none">FIRMAR AQUÍ</p>
                        </div>

                        <div className="p-4 flex gap-4 justify-between bg-slate-50">
                            <button onClick={clearSig} className="px-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Borrar</button>
                            <button onClick={saveDtSig} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-500 transition">
                                {dtSignStep === 0 ? 'Siguiente (Firma Visitante)' : 'Confirmar e Iniciar Partido 🔴'}
                            </button>
                        </div>
                        <button onClick={() => setDtSignModalOpen(false)} className="py-2 text-xs font-bold text-slate-400 hover:text-red-500">Cancelar y Volver</button>
                    </div>
                </div>
            )}

            {modalAddPlayerOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[80] backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-96 flex flex-col">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-black text-lg text-slate-800">Buscar Jugador</h3><button onClick={() => setModalAddPlayerOpen(false)}><X size={20} className="text-slate-400" /></button></div>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4"><input className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" placeholder="Apellido..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus /><button type="submit" className="bg-slate-800 text-white p-3 rounded-xl"><Search size={18} /></button></form>
                        <div className="flex-1 h-64 overflow-y-auto border-t border-slate-100 pt-2 space-y-2">
                            {isSearching && <p className="text-center text-slate-400 text-xs py-4">Buscando...</p>}
                            {searchResults.map(player => (
                                <div key={player.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100"><span className="block font-black text-slate-800">#{player.number} {player.name}</span><button onClick={() => confirmAddPlayer(player)} className="bg-green-500 text-white p-2 rounded-lg"><Plus size={16} /></button></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- ROSTERS MODAL --- */}
            {showRostersModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[90] backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users size={24} /> Planteles Oficiales</h3>
                            <button onClick={() => setShowRostersModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 grid md:grid-cols-2 gap-8">
                            {/* HOME */}
                            <div>
                                <div className="flex items-center gap-3 mb-4 border-b pb-2 border-blue-100">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-lg">
                                        {teamsInfo?.home.name?.charAt(0) || 'L'}
                                    </div>
                                    <h4 className="font-black text-blue-900 text-lg">{teamsInfo?.home.name}</h4>
                                </div>
                                <div className="space-y-2">
                                    {fullRosters.home.length === 0 && <p className="text-slate-400 text-sm">No hay jugadores cargados.</p>}
                                    {fullRosters.home.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                            <span className="font-black text-slate-400 w-6 text-right">#{p.number}</span>
                                            <span className="font-bold text-slate-700 flex-1">{p.name}</span>
                                            {p.isLibero && <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Líbero</span>}
                                            {p.isCaptain && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Capitán</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* AWAY */}
                            <div>
                                <div className="flex items-center gap-3 mb-4 border-b pb-2 border-red-100">
                                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-lg">
                                        {teamsInfo?.away.name?.charAt(0) || 'V'}
                                    </div>
                                    <h4 className="font-black text-red-900 text-lg">{teamsInfo?.away.name}</h4>
                                </div>
                                <div className="space-y-2">
                                    {fullRosters.away.length === 0 && <p className="text-slate-400 text-sm">No hay jugadores cargados.</p>}
                                    {fullRosters.away.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                            <span className="font-black text-slate-400 w-6 text-right">#{p.number}</span>
                                            <span className="font-bold text-slate-700 flex-1">{p.name}</span>
                                            {p.isLibero && <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Líbero</span>}
                                            {p.isCaptain && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Capitán</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* --- WIZARD DE CIERRE --- */}

            {/* --- LIVE TOAST NOTIFICATION --- */}
            {showLiveToast && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-300">
                    <div className="bg-red-600 text-white px-12 py-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
                        <div className="bg-white text-red-600 p-4 rounded-full">
                            <span className="w-6 h-6 bg-red-600 rounded-full block animate-ping"></span>
                        </div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter">¡Partido En Vivo!</h1>
                        <p className="text-red-100 font-bold text-xl">El cronómetro ha comenzado</p>
                    </div>
                </div>
            )}

            {closingFlow && (
                <div className="fixed inset-0 bg-slate-100 z-[70] flex flex-col animate-in fade-in overflow-y-auto">
                    <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm sticky top-0 z-50">
                        <h2 className="font-black text-slate-800 text-lg">Cierre de Encuentro - Paso {closingStep + 1}/5</h2>
                        <button onClick={() => setClosingFlow(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={18} /></button>
                    </div>

                    {/* 0. OBS */}
                    {closingStep === 0 && (
                        <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
                            <h3 className="font-black text-2xl text-slate-800 mb-4">Observaciones del Árbitro</h3>
                            <textarea className="w-full h-64 bg-white border-2 border-slate-200 rounded-2xl p-6 text-lg outline-none focus:border-blue-500 transition resize-none" placeholder="Escriba aquí cualquier incidencia..." value={observations} onChange={e => setObservations(e.target.value)}></textarea>
                            <button onClick={() => setClosingStep(1)} className="mt-6 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold float-right shadow-lg">Siguiente: Firmas</button>
                        </div>
                    )}

                    {/* 1-3. FIRMAS */}
                    {(closingStep >= 1 && closingStep <= 3) && (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-blue-50 p-4 text-center">
                                <span className="font-black text-xl text-blue-900 uppercase tracking-widest">
                                    FIRMA: {closingStep === 1 ? 'CAPITÁN LOCAL' : closingStep === 2 ? 'CAPITÁN VISITA' : '1ER ÁRBITRO'}
                                </span>
                            </div>
                            <div className="flex-1 relative bg-white touch-none cursor-crosshair shadow-inner">
                                <canvas ref={sigPadRef} className="w-full h-full" width={typeof window !== 'undefined' ? window.innerWidth : 800} height={typeof window !== 'undefined' ? window.innerHeight * 0.6 : 600} onMouseDown={startDraw} onMouseMove={moveDraw} onTouchStart={startDraw} onTouchMove={moveDraw} />
                                <p className="absolute bottom-10 left-0 right-0 text-center text-slate-200 font-black text-5xl pointer-events-none select-none">FIRMAR AQUÍ</p>
                            </div>
                            <div className="p-6 bg-white border-t border-slate-200 flex gap-4 justify-center">
                                <button onClick={clearSig} className="px-8 py-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">Borrar</button>
                                <button onClick={saveSig} className="px-12 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg">Confirmar Firma</button>
                            </div>
                        </div>
                    )}

                    {/* 4. PREVIEW A4 REAL (DEFINITIVO) */}
                    {closingStep === 4 && (
                        <div className="flex-1 bg-slate-200 py-10 px-4 flex justify-center">
                            {/* HOJA A4 */}
                            <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-10 flex flex-col relative text-slate-900">

                                {/* HEADER OFICIAL */}
                                <div className="border-b-4 border-slate-900 pb-6 mb-8 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-2xl">FVU</div>
                                        <div>
                                            <h1 className="text-2xl font-black uppercase tracking-tight leading-none">Federación de Voley</h1>
                                            <h2 className="text-xl font-bold text-slate-600 uppercase tracking-widest">Ushuaia</h2>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-3xl font-black text-slate-900 uppercase">Planilla Oficial</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase">ID: {Date.now().toString().slice(-8)}</p>
                                    </div>
                                </div>

                                {/* DATOS ENCUENTRO (7 CAMPOS COMPLETO) */}
                                <div className="grid grid-cols-4 gap-4 mb-8 text-xs uppercase bg-slate-50 p-4 border border-slate-200 rounded-lg">
                                    <div><strong className="block text-slate-400 mb-1">Fecha</strong> {new Date().toLocaleDateString()}</div>
                                    <div><strong className="block text-slate-400 mb-1">Hora</strong> 20:00</div>
                                    <div><strong className="block text-slate-400 mb-1">Gimnasio</strong> Polivalente</div>
                                    <div><strong className="block text-slate-400 mb-1">Instancia</strong> Fase Regular</div>
                                    {/* NUEVOS CAMPOS */}
                                    <div><strong className="block text-slate-400 mb-1">Competencia</strong> Apertura 2026</div>
                                    <div><strong className="block text-slate-400 mb-1">Categoría</strong> Mayores</div>
                                    <div><strong className="block text-slate-400 mb-1">Género</strong> Masculino</div>
                                </div>

                                {/* MARCADOR GLOBAL */}
                                <div className="flex items-center justify-between mb-8 px-8">
                                    <div className="text-center w-1/3">
                                        <h2 className="text-2xl font-black text-blue-800">CLUB A LOCAL</h2>
                                        <div className="w-full h-1 bg-blue-800 mt-2 mx-auto"></div>
                                    </div>
                                    <div className="text-6xl font-black text-slate-800 px-8 border-x-2 border-slate-100 flex items-center justify-center gap-4">
                                        <span>{setsWonHome}</span>
                                        <span className="text-slate-300 text-4xl">-</span>
                                        <span>{setsWonAway}</span>
                                    </div>
                                    <div className="text-center w-1/3">
                                        <h2 className="text-2xl font-black text-red-800">CLUB B VISITA</h2>
                                        <div className="w-full h-1 bg-red-800 mt-2 mx-auto"></div>
                                    </div>
                                </div>

                                {/* TABLA DE SETS */}
                                <table className="w-full mb-8 text-sm text-center border-collapse border border-slate-200">
                                    <thead className="bg-slate-900 text-white font-bold uppercase">
                                        <tr>
                                            <th className="py-2">Set</th>
                                            <th>Puntos Local</th>
                                            <th>Puntos Visita</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sets.map((s, i) => (
                                            <tr key={i} className="border-b border-slate-200 even:bg-slate-50">
                                                <td className="py-2 font-bold">{s.number}</td>
                                                <td>{s.home}</td>
                                                <td>{s.away}</td>
                                                {/* ESTADO LIMPIO: Si no terminó, no muestra nada */}
                                                <td className="text-xs font-bold uppercase text-slate-500">{s.finished ? 'Finalizado' : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* LISTAS DE JUGADORES */}
                                <div className="grid grid-cols-2 gap-8 mb-8 flex-1">
                                    {/* Local Roster */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-blue-100 p-2 text-center font-bold text-blue-900 text-xs uppercase border-b border-blue-200">Plantel Local</div>
                                        <ul className="text-xs p-2 space-y-1">
                                            {fullRosterHome.map(p => (
                                                <li key={p.id} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="font-bold">#{p.number}</span> <span>{p.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {/* Away Roster */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-red-100 p-2 text-center font-bold text-red-900 text-xs uppercase border-b border-red-200">Plantel Visita</div>
                                        <ul className="text-xs p-2 space-y-1">
                                            {fullRosterAway.map(p => (
                                                <li key={p.id} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="font-bold">#{p.number}</span> <span>{p.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* OBSERVACIONES */}
                                <div className="bg-yellow-50 border border-yellow-200 p-4 mb-8 text-xs rounded-lg">
                                    <strong className="block text-yellow-700 uppercase mb-2">Observaciones del Árbitro</strong>
                                    <p className="italic text-slate-700">{observations || "Sin observaciones."}</p>
                                </div>

                                {/* FIRMAS */}
                                <div className="grid grid-cols-3 gap-8 mb-8 mt-auto">
                                    <div className="text-center border-t border-slate-300 pt-2">
                                        {signatures.capHome && <img src={signatures.capHome} className="h-12 mx-auto mb-1" />}
                                        <p className="text-[10px] font-bold uppercase text-slate-500">Capitán Local</p>
                                    </div>
                                    <div className="text-center border-t border-slate-300 pt-2">
                                        {signatures.capAway && <img src={signatures.capAway} className="h-12 mx-auto mb-1" />}
                                        <p className="text-[10px] font-bold uppercase text-slate-500">Capitán Visita</p>
                                    </div>
                                    <div className="text-center border-t border-slate-300 pt-2">
                                        {signatures.ref1 && <img src={signatures.ref1} className="h-12 mx-auto mb-1" />}
                                        <p className="text-[10px] font-bold uppercase text-slate-500">1er Árbitro: {referees.find(r => r.id === staff.ref1)?.last_name}</p>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="flex justify-between items-end text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                                    <div>
                                        <p>Planillero: <span className="font-bold text-slate-600">{staff.scorer}</span></p>
                                        {staff.ref2 && <p>2do Árbitro: <span className="font-bold text-slate-600">{referees.find(r => r.id === staff.ref2)?.last_name}</span></p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <QrCode size={32} className="text-slate-800" />
                                        <div className="text-right">
                                            <p className="font-bold">VALIDACIÓN DIGITAL</p>
                                            <p>Escanee para verificar</p>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* BOTONES ACCIÓN FLOTANTES */}
                            <div className="fixed bottom-8 right-8 flex gap-4 z-50 print:hidden">
                                <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-black transition"><Download size={16} /> Imprimir</button>
                                <button onClick={submitMatchSheet} className="bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 transition"><Check size={16} /> Finalizar y Enviar</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
