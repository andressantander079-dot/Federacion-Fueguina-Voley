import { useState, useCallback } from 'react';

// Types
export type Player = {
    id: string;
    number: number;
    name: string;
    isLibero?: boolean;
    isCaptain?: boolean;
};

export type TeamSide = 'home' | 'away';

export type SanctionEvent = {
    id: string;
    playerId: string;
    playerName: string;
    team: TeamSide;
    type: 'yellow' | 'red' | 'expulsion' | 'disqualify';
    setNum: number;
    homeScore: number;
    awayScore: number;
    timestamp: number;
};

export type SetData = {
    number: number;
    home: number;
    away: number;
    finished: boolean;
};

export type MatchState = {
    bestOfSets: number;
    sets: SetData[];
    currentSetIdx: number;
    posHome: (Player | null)[]; // 6 positions (0=P1, 1=P6, 2=P5, 3=P4, 4=P3, 5=P2)
    posAway: (Player | null)[];
    // Standard array: index 0 = Pos 1 (Serving), 1 = Pos 6, 2 = Pos 5, 3 = Pos 4, 4 = Pos 3, 5 = Pos 2.
    // Rotation is Clockwise: P2->P1, P1->P6, P6->P5...
    // So Array Shift? 
    // [P1, P6, P5, P4, P3, P2] -> Rotate -> [P2, P1, P6, P5, P4, P3]
    // Yes, Unshift (add to front) the last element? 
    // Let's verify: P2 is at index 5. P1 is at index 0.
    // New P1 should be old P2.
    // So we take index 5 and move it to index 0.
    // Array: [P1, P6, P5, P4, P3, P2]
    // Rotate: [P2, P1, P6, P5, P4, P3]
    // This is: pop (P2) and unshift (to 0).

    // So Array Shift? 
    // [P1, P6, P5, P4, P3, P2] -> Rotate -> [P2, P1, P6, P5, P4, P3]
    // Yes, Unshift (add to front) the last element? 

    benchHome: Player[];
    benchAway: Player[];
    servingTeam: TeamSide | null;

    // Substitution Tracking (Per Set)
    substitutionsHome: number;
    substitutionsAway: number;
    subHistory: { team: TeamSide, playerOutId: string, playerInId: string }[];
    timeoutsHome: number;
    timeoutsAway: number;
    blockedPlayers: { id: string, type: 'set' | 'match' }[];
    sanctionsLog: SanctionEvent[];
};

export function useVolleyMatch(initialState?: Partial<MatchState>) {
    // State
    const [bestOfSets, setBestOfSets] = useState<number>(initialState?.bestOfSets || 3);
    const [sets, setSets] = useState<SetData[]>(initialState?.sets || [{ number: 1, home: 0, away: 0, finished: false }]);
    const [currentSetIdx, setCurrentSetIdx] = useState(initialState?.currentSetIdx || 0);

    const [posHome, setPosHome] = useState<(Player | null)[]>(initialState?.posHome || Array(6).fill(null));
    const [posAway, setPosAway] = useState<(Player | null)[]>(initialState?.posAway || Array(6).fill(null));

    const [benchHome, setBenchHome] = useState<Player[]>(initialState?.benchHome || []);
    const [benchAway, setBenchAway] = useState<Player[]>(initialState?.benchAway || []);

    const [servingTeam, setServingTeam] = useState<TeamSide | null>(initialState?.servingTeam || null);

    const [subsCount, setSubsCount] = useState({ home: 0, away: 0 }); // Track count per set
    const [subHistory, setSubHistory] = useState<{ team: TeamSide, playerOutId: string, playerInId: string }[]>(initialState?.subHistory || []);
    
    // Timeouts per set
    const [timeouts, setTimeouts] = useState({ home: 0, away: 0 });

    const [blockedPlayers, setBlockedPlayers] = useState<{ id: string, type: 'set' | 'match' }[]>(initialState?.blockedPlayers || []);
    const [sanctionsLog, setSanctionsLog] = useState<SanctionEvent[]>(initialState?.sanctionsLog || []);

    // Undo History
    const [history, setHistory] = useState<string[]>([]); // Store JSON strings for deep copy simplicity

    // --- ACTIONS ---

    const snapshot = useCallback(() => {
        const state = {
            bestOfSets, sets, currentSetIdx, posHome, posAway, benchHome, benchAway, servingTeam, subsCount, subHistory, timeouts, blockedPlayers, sanctionsLog
        };
        setHistory(prev => [...prev, JSON.stringify(state)]);
    }, [bestOfSets, sets, currentSetIdx, posHome, posAway, benchHome, benchAway, servingTeam, subsCount, subHistory, timeouts, blockedPlayers, sanctionsLog]);

    const undo = () => {
        if (history.length === 0) return;
        const lastStateStr = history[history.length - 1];
        const lastState = JSON.parse(lastStateStr);

        setBestOfSets(lastState.bestOfSets || 3);
        setSets(lastState.sets);
        setCurrentSetIdx(lastState.currentSetIdx);
        setPosHome(lastState.posHome);
        setPosAway(lastState.posAway);
        setBenchHome(lastState.benchHome);
        setBenchAway(lastState.benchAway);
        setServingTeam(lastState.servingTeam);
        setSubsCount(lastState.subsCount);
        setSubHistory(lastState.subHistory || []);
        setTimeouts(lastState.timeouts || { home: 0, away: 0 });
        setBlockedPlayers(lastState.blockedPlayers || []);
        setSanctionsLog(lastState.sanctionsLog || []);

        setHistory(prev => prev.slice(0, -1));
    };

    // Rotation: P2->P1, P1->P6... (Clockwise movement of players)
    // Visual Array: [P1, P6, P5, P4, P3, P2]
    // Rotate: Take Last (P2) and put First (P1).
    // Rotation: P2->P1, P1->P6... (Clockwise movement of players)
    // Visual Array: [P1, P6, P5, P4, P3, P2]
    // Rotate: Take Last (P2) and put First (P1).
    const rotateTeamArray = (arr: (Player | null)[]) => {
        if (arr.length < 6) return arr;
        const newArr = [...arr];
        const first = newArr.shift(); // Remove First
        // @ts-ignore
        newArr.push(first); // Add to End
        return newArr;
    };

    const addPoint = (team: TeamSide) => {
        const currentHome = sets[currentSetIdx].home;
        const currentAway = sets[currentSetIdx].away;
        
        // Detectar si es un set decisivo (Tie-Break) basado en si es Mejor de 3 o 5
        const isTieBreak = bestOfSets === 5 ? currentSetIdx === 4 : currentSetIdx === 2;
        
        const targetScore = isTieBreak ? 15 : 25;

        // Validar si el set ya terminó (alcanzó el target y diferencia de 2)
        if ((currentHome >= targetScore && currentHome - currentAway >= 2) || 
            (currentAway >= targetScore && currentAway - currentHome >= 2)) {
            alert(`El set ya ha sido ganado a los ${targetScore} puntos con diferencia de 2. Modifique manualmente si es un error, o cierre el set.`);
            return;
        }

        snapshot();

        // Logic: If receiving team wins point -> They Rotate & Serve
        const isReceiving = servingTeam && servingTeam !== team;

        if (isReceiving) {
            if (team === 'home') setPosHome(prev => rotateTeamArray(prev));
            else setPosAway(prev => rotateTeamArray(prev));
        }

        setServingTeam(team);

        setSets(prev => prev.map((s, i) => {
            if (i === currentSetIdx) {
                return { ...s, [team]: s[team] + 1 };
            }
            return s;
        }));
    };

    const unrotateTeamArray = (arr: (Player | null)[]) => {
        if (arr.length < 6) return arr;
        const newArr = [...arr];
        const last = newArr.pop(); // Remove Last
        // @ts-ignore
        newArr.unshift(last); // Add to Front
        return newArr;
    };

    const subtractPoint = (team: TeamSide) => {
        if (history.length > 0) {
            // Find the state right before this team got their current score
            const currentScore = sets[currentSetIdx][team];
            let previousServer: TeamSide | null = null;
            let didRotateToGetPoint = false;

            for (let i = history.length - 1; i >= 0; i--) {
                const pastState = JSON.parse(history[i]);
                const pastScore = pastState.sets[currentSetIdx]?.[team];
                
                if (pastScore !== undefined && pastScore < currentScore) {
                    // This is the state before they won the point
                    const serverBeforePoint = pastState.servingTeam;
                    if (serverBeforePoint && serverBeforePoint !== team) {
                        // They won the serve with this point! Meaning they rotated.
                        didRotateToGetPoint = true;
                        previousServer = serverBeforePoint;
                    }
                    break;
                }
            }

            if (didRotateToGetPoint && previousServer) {
                // Reverse the rotation
                if (team === 'home') setPosHome(prev => unrotateTeamArray(prev));
                else setPosAway(prev => unrotateTeamArray(prev));
                
                // Return serve back to the other team
                setServingTeam(previousServer);
            }
        }

        snapshot();
        setSets(prev => prev.map((s, i) => {
            if (i === currentSetIdx) {
                // Prevent negative points
                return { ...s, [team]: Math.max(0, s[team] - 1) };
            }
            return s;
        }));
    };

    const substitutePlayer = (team: TeamSide, playerOutId: string, playerIn: Player) => {
        // Validation should happen in UI, but basic check here
        const isLiberoChange = playerIn.isLibero; // Simplified check

        // If NOT Libero, increment sub count and record history
        if (!isLiberoChange) {
            setSubsCount(prev => ({ ...prev, [team]: prev[team] + 1 }));
            setSubHistory(prev => [...prev, { team, playerOutId, playerInId: playerIn.id }]);
        }

        snapshot();

        const setPos = team === 'home' ? setPosHome : setPosAway;
        const setBench = team === 'home' ? setBenchHome : setBenchAway;

        // Swap in Court (Find by ID)
        setPos(prev => prev.map(p => p?.id === playerOutId ? playerIn : p));

        // Swap in Bench (Remove In, Add Out - Need to find Out object first if we want to move it to bench)
        // Since we only got ID, we need to find the player object from current pos
        // But for simplicity in this fix, we assume the UI handles the object availability or we fix the hook to find it.
        // Actually, let's find the playerOut object from state

        // This is tricky inside setBench updater if we depend on setPos state.
        // Better:
        let playerOutObj: Player | undefined;
        // @ts-ignore
        if (team === 'home') playerOutObj = posHome.find(p => p?.id === playerOutId);
        // @ts-ignore
        else playerOutObj = posAway.find(p => p?.id === playerOutId);

        if (playerOutObj) {
            const finalPlayerOut = playerOutObj; // capture
            setBench(prev => {
                const others = prev.filter(p => p.id !== playerIn.id);
                return [...others, finalPlayerOut].sort((a, b) => a.number - b.number);
            });
        }
    };

    const addPlayerToBench = (team: TeamSide, player: Player) => {
        const setBench = team === 'home' ? setBenchHome : setBenchAway;
        setBench(prev => {
            if (prev.find(p => p.id === player.id)) return prev;
            return [...prev, player].sort((a, b) => a.number - b.number);
        });
    };

    // --- NEW: STARTER SELECTION ---
    // Fills positions in standard order: I, II, III, IV, V, VI
    // Indices: 0, 5, 4, 3, 2, 1
    const moveToCourt = (team: TeamSide, player: Player) => {
        const setPos = team === 'home' ? setPosHome : setPosAway;
        const setBench = team === 'home' ? setBenchHome : setBenchAway;
        const currentPos = team === 'home' ? posHome : posAway;

        // Find first empty slot in order
        const fillOrder = [0, 5, 4, 3, 2, 1];
        const targetIndex = fillOrder.find(idx => currentPos[idx] === null);

        if (targetIndex === undefined) {
            alert("La cancha está llena (6 jugadores).");
            return;
        }

        snapshot();

        // 1. Add to Pos
        setPos(prev => {
            const copy = [...prev];
            copy[targetIndex] = player;
            return copy;
        });

        // 2. Remove from Bench
        setBench(prev => prev.filter(p => p.id !== player.id));
    };

    const removeFromCourt = (team: TeamSide, player: Player) => {
        const setPos = team === 'home' ? setPosHome : setPosAway;
        const setBench = team === 'home' ? setBenchHome : setBenchAway;

        snapshot();

        // 1. Remove from Pos (set to null)
        setPos(prev => prev.map(p => p?.id === player.id ? null : p));

        // 2. Return to Bench
        setBench(prev => [...prev, player].sort((a, b) => a.number - b.number));
    };

    const removePlayerFromMatch = (team: TeamSide, player: Player) => {
        const setBench = team === 'home' ? setBenchHome : setBenchAway;
        setBench(prev => prev.filter(p => p.id !== player.id));
    };

    const initPositions = () => {
        // Dummy implementation or logic to reset/load defaults if needed
        // For now, it seems the component calls it to ensure state is ready?
        // We can leave it empty or log.
        console.log("Positions initialized");
    };

    const finishSet = () => {
        snapshot();

        // Mark current finished
        setSets(prev => {
            const copy = [...prev];
            copy[currentSetIdx].finished = true;
            // Add next if needed (up to 5 or 3, dynamic boundary later but let sets grow as needed logic in UI)
            if (copy.length < bestOfSets) {
                copy.push({ number: copy.length + 1, home: 0, away: 0, finished: false });
            }
            return copy;
        });

        if (currentSetIdx < bestOfSets - 1) {
            setCurrentSetIdx(prev => prev + 1);
            setSubsCount({ home: 0, away: 0 }); // Reset subs for new set
            setSubHistory([]); // Clear history for new set
            setTimeouts({ home: 0, away: 0 }); // Reset timeouts
            // Unblock players blocked only for the set
            setBlockedPlayers(prev => prev.filter(p => p.type === 'match'));
        }
    };

    // Helpers to set initial state from DB
    const setAllState = (state: Partial<MatchState>) => {
        if (state.bestOfSets !== undefined) setBestOfSets(state.bestOfSets);
        if (state.sets) setSets(state.sets);
        if (state.currentSetIdx !== undefined) setCurrentSetIdx(state.currentSetIdx);
        if (state.posHome) setPosHome(state.posHome.length === 6 ? state.posHome : [...state.posHome, ...Array(6 - state.posHome.length).fill(null)] as (Player | null)[]);
        if (state.posAway) setPosAway(state.posAway.length === 6 ? state.posAway : [...state.posAway, ...Array(6 - state.posAway.length).fill(null)] as (Player | null)[]);
        if (state.benchHome) setBenchHome(state.benchHome);
        if (state.benchAway) setBenchAway(state.benchAway);
        if (state.servingTeam !== undefined) setServingTeam(state.servingTeam);
        // Rescatar nuevos campos de DB
        // @ts-ignore
        if (state.subsCount) setSubsCount(state.subsCount);
        // @ts-ignore
        if (state.subHistory) setSubHistory(state.subHistory);
        // @ts-ignore
        if (state.timeouts) setTimeouts(state.timeouts);
        
        if (state.blockedPlayers) setBlockedPlayers(state.blockedPlayers);
        if (state.sanctionsLog) setSanctionsLog(state.sanctionsLog);
    };

    const addSanction = (event: Omit<SanctionEvent, 'id' | 'timestamp'>) => {
        snapshot();
        const newEvent: SanctionEvent = {
            ...event,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        setSanctionsLog(prev => [...prev, newEvent]);
    };

    return {
        bestOfSets, sets, currentSetIdx, posHome, posAway, benchHome, benchAway,
        servingTeam, subsCount, subHistory, timeouts, blockedPlayers, sanctionsLog,
        addPoint, subtractPoint, substitutePlayer, finishSet, undo,
        setAllState, setBestOfSets, setSets, setServingTeam, setPosHome, setPosAway, setBenchHome, setBenchAway,
        initPositions, addPlayerToBench, moveToCourt, removeFromCourt, removePlayerFromMatch,
        requestTimeout: (team: TeamSide) => {
            snapshot();
            setTimeouts(prev => ({ ...prev, [team]: prev[team] + 1 }));
        },
        blockPlayer: (id: string, type: 'set' | 'match') => {
            snapshot();
            setBlockedPlayers(prev => [...prev.filter(p => p.id !== id), { id, type }]);
        },
        unblockSetPlayers: () => {
            snapshot();
            setBlockedPlayers(prev => prev.filter(p => p.type === 'match'));
        },
        addSanction
    };
}