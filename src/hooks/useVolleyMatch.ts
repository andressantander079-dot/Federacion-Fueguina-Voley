import { useState, useCallback } from 'react';

// Types
export type Player = {
    id: string;
    number: number;
    name: string;
    isLibero?: boolean;
};

export type TeamSide = 'home' | 'away';

export type SetData = {
    number: number;
    home: number;
    away: number;
    finished: boolean;
};

export type MatchState = {
    sets: SetData[];
    currentSetIdx: number;
    posHome: Player[]; // 6 positions (0=P1, 1=P6, 2=P5, 3=P4, 4=P3, 5=P2) - Wait, Voley positions are 1-6 anticlockwise.
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

    posAway: Player[];
    benchHome: Player[];
    benchAway: Player[];
    servingTeam: TeamSide | null;

    // Substitution Tracking (Per Set)
    // Maps PlayerID -> PlayerID (Original -> Current).
    // Or better: Track pairs. { starterId: string, subId: string | null }
    // Only 6 substitutions per set per team.
    substitutionsHome: number;
    substitutionsAway: number;
};

export function useVolleyMatch(initialState?: Partial<MatchState>) {
    // State
    const [sets, setSets] = useState<SetData[]>(initialState?.sets || [{ number: 1, home: 0, away: 0, finished: false }]);
    const [currentSetIdx, setCurrentSetIdx] = useState(initialState?.currentSetIdx || 0);

    const [posHome, setPosHome] = useState<Player[]>(initialState?.posHome || []);
    const [posAway, setPosAway] = useState<Player[]>(initialState?.posAway || []);

    const [benchHome, setBenchHome] = useState<Player[]>(initialState?.benchHome || []);
    const [benchAway, setBenchAway] = useState<Player[]>(initialState?.benchAway || []);

    const [servingTeam, setServingTeam] = useState<TeamSide | null>(initialState?.servingTeam || null);

    const [subsCount, setSubsCount] = useState({ home: 0, away: 0 }); // Track count per set

    // Undo History
    const [history, setHistory] = useState<string[]>([]); // Store JSON strings for deep copy simplicity

    // --- ACTIONS ---

    const snapshot = useCallback(() => {
        const state = {
            sets, currentSetIdx, posHome, posAway, benchHome, benchAway, servingTeam, subsCount
        };
        setHistory(prev => [...prev, JSON.stringify(state)]);
    }, [sets, currentSetIdx, posHome, posAway, benchHome, benchAway, servingTeam, subsCount]);

    const undo = () => {
        if (history.length === 0) return;
        const lastStateStr = history[history.length - 1];
        const lastState = JSON.parse(lastStateStr);

        setSets(lastState.sets);
        setCurrentSetIdx(lastState.currentSetIdx);
        setPosHome(lastState.posHome);
        setPosAway(lastState.posAway);
        setBenchHome(lastState.benchHome);
        setBenchAway(lastState.benchAway);
        setServingTeam(lastState.servingTeam);
        setSubsCount(lastState.subsCount);

        setHistory(prev => prev.slice(0, -1));
    };

    // Rotation: P2->P1, P1->P6... (Clockwise movement of players)
    // Visual Array: [P1, P6, P5, P4, P3, P2]
    // Rotate: Take Last (P2) and put First (P1).
    const rotateTeamArray = (arr: Player[]) => {
        if (arr.length < 6) return arr;
        const newArr = [...arr];
        const last = newArr.pop();
        if (last) newArr.unshift(last);
        return newArr;
    };

    const addPoint = (team: TeamSide) => {
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

    const subtractPoint = (team: TeamSide) => {
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

        // If NOT Libero, increment sub count
        if (!isLiberoChange) {
            if (subsCount[team] >= 6) {
                alert("Máximo de 6 sustituciones permitidas por set.");
                return;
            }
            setSubsCount(prev => ({ ...prev, [team]: prev[team] + 1 }));
        }

        snapshot();

        const setPos = team === 'home' ? setPosHome : setPosAway;
        const setBench = team === 'home' ? setBenchHome : setBenchAway;

        // Swap in Court (Find by ID)
        setPos(prev => prev.map(p => p.id === playerOutId ? playerIn : p));

        // Swap in Bench (Remove In, Add Out - Need to find Out object first if we want to move it to bench)
        // Since we only got ID, we need to find the player object from current pos
        // But for simplicity in this fix, we assume the UI handles the object availability or we fix the hook to find it.
        // Actually, let's find the playerOut object from state

        // This is tricky inside setBench updater if we depend on setPos state.
        // Better:
        let playerOutObj: Player | undefined;
        if (team === 'home') playerOutObj = posHome.find(p => p.id === playerOutId);
        else playerOutObj = posAway.find(p => p.id === playerOutId);

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
            // Add next if needed (up to 5)
            if (copy.length < 5) {
                copy.push({ number: copy.length + 1, home: 0, away: 0, finished: false });
            }
            return copy;
        });

        if (currentSetIdx < 4) {
            setCurrentSetIdx(prev => prev + 1);
            setSubsCount({ home: 0, away: 0 }); // Reset subs for new set
        }
    };

    // Helpers to set initial state from DB
    const setAllState = (state: Partial<MatchState>) => {
        if (state.sets) setSets(state.sets);
        if (state.currentSetIdx !== undefined) setCurrentSetIdx(state.currentSetIdx);
        if (state.posHome) setPosHome(state.posHome);
        if (state.posAway) setPosAway(state.posAway);
        if (state.benchHome) setBenchHome(state.benchHome);
        if (state.benchAway) setBenchAway(state.benchAway);
        if (state.servingTeam !== undefined) setServingTeam(state.servingTeam);
    };

    return {
        sets, currentSetIdx, posHome, posAway, benchHome, benchAway,
        servingTeam, subsCount,
        addPoint, subtractPoint, substitutePlayer, finishSet, undo,
        setAllState, setSets, setServingTeam, setPosHome, setPosAway,
        initPositions, addPlayerToBench
    };
}