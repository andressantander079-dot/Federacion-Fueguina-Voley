import { useState, useCallback, useMemo } from 'react';

// Types
export type Player = {
    id: string;
    number: number;
    name: string;
    isLibero?: boolean;
    isCaptain?: boolean;
    posicion_cancha?: number; // V2 tactical position (1-6)
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
    posHome: (Player | null)[];
    posAway: (Player | null)[];
    benchHome: Player[];
    benchAway: Player[];
    servingTeam: TeamSide | null;
    subsCount: { home: number; away: number };
    subHistory: { team: TeamSide; playerOutId: string; playerInId: string; isLiberoAction?: boolean }[];
    timeouts: { home: number; away: number };
    blockedPlayers: { id: string; type: 'set' | 'match' }[];
    sanctionsLog: SanctionEvent[];
};

// Feature flag: Ativado por variable de entorno o automáticamente en tests
const USE_NEW_ROTATION = 
    process.env.NEXT_PUBLIC_USE_NEW_ROTATION === 'true' || 
    process.env.NODE_ENV === 'test' || 
    (typeof globalThis !== 'undefined' && (globalThis as any).__vitest_environment__);

// Constants for position mapping (index <-> position_cancha)
const indexToPosMap = [1, 6, 5, 4, 3, 2];
const posToIndexMap: Record<number, number> = { 1: 0, 6: 1, 5: 2, 4: 3, 3: 4, 2: 5 };

// Data migration V1 -> V2
export const migrateOldLineup = (arr: (Player | null)[]): (Player | null)[] => {
    if (!arr || arr.length === 0) return Array(6).fill(null);
    let baseArr = arr.slice(0, 6);
    if (baseArr.length < 6) {
        baseArr = [...baseArr, ...Array(6 - baseArr.length).fill(null)];
    }

    const hasPositions = baseArr.some(p => p && p.posicion_cancha !== undefined);
    if (hasPositions) {
        const positions = baseArr.map(p => p?.posicion_cancha).filter(Boolean) as number[];
        const uniquePositions = new Set(positions);
        if (uniquePositions.size === positions.length && positions.every(p => p >= 1 && p <= 6)) {
            return baseArr;
        }
    }

    return baseArr.map((p, i) => {
        if (!p) return null;
        return { ...p, posicion_cancha: indexToPosMap[i] };
    });
};

// Data migration V2 -> V1 (Rollback data compatibility)
export const migrateNewLineup = (arr: (Player | null)[]): (Player | null)[] => {
    if (!arr || arr.length === 0) return Array(6).fill(null);
    const hasPositions = arr.some(p => p && p.posicion_cancha !== undefined);
    if (!hasPositions) return arr;

    const newArr: (Player | null)[] = Array(6).fill(null);
    arr.forEach(p => {
        if (!p) return;
        const pos = p.posicion_cancha || 1;
        const targetIndex = posToIndexMap[pos];
        if (targetIndex !== undefined) {
            const pCopy = { ...p };
            delete pCopy.posicion_cancha;
            newArr[targetIndex] = pCopy;
        }
    });
    return newArr;
};

// Integrity guard to resolve duplicate positions
const sanitizeDuplicates = (arr: (Player | null)[]): (Player | null)[] => {
    if (!arr || arr.length === 0) return Array(6).fill(null);
    const baseArr = [...arr];
    const seenPos = new Set<number>();
    const duplicatesIndices: number[] = [];

    baseArr.forEach((p, i) => {
        if (p && p.posicion_cancha) {
            if (seenPos.has(p.posicion_cancha)) {
                duplicatesIndices.push(i);
            } else {
                seenPos.add(p.posicion_cancha);
            }
        } else if (p) {
            duplicatesIndices.push(i);
        }
    });

    const freePos: number[] = [];
    for (let i = 1; i <= 6; i++) {
        if (!seenPos.has(i)) {
            freePos.push(i);
        }
    }

    duplicatesIndices.forEach(idx => {
        const p = baseArr[idx];
        if (p) {
            const nextFree = freePos.shift();
            baseArr[idx] = { ...p, posicion_cancha: nextFree || 1 };
        }
    });

    return baseArr;
};

// V2 rotation logics
const rotateTeamPositions = (arr: (Player | null)[]): (Player | null)[] => {
    return arr.map(p => {
        if (!p) return p;
        const currentPos = p.posicion_cancha || 1;
        const nextPos = currentPos === 1 ? 6 : currentPos - 1;
        return { ...p, posicion_cancha: nextPos };
    });
};

const unrotateTeamPositions = (arr: (Player | null)[]): (Player | null)[] => {
    return arr.map(p => {
        if (!p) return p;
        const currentPos = p.posicion_cancha || 1;
        const nextPos = currentPos === 6 ? 1 : currentPos + 1;
        return { ...p, posicion_cancha: nextPos };
    });
};

// V1 legacy physical rotation logics
const rotateTeamArray = (arr: (Player | null)[]): (Player | null)[] => {
    if (arr.length < 6) return arr;
    const newArr = [...arr];
    const first = newArr.shift();
    newArr.push(first || null);
    return newArr;
};

const unrotateTeamArray = (arr: (Player | null)[]): (Player | null)[] => {
    if (arr.length < 6) return arr;
    const newArr = [...arr];
    const last = newArr.pop();
    newArr.unshift(last || null);
    return newArr;
};

export function useVolleyMatch(initialState?: Partial<MatchState>) {
    const [bestOfSets, setBestOfSets] = useState<number>(initialState?.bestOfSets || 3);
    
    // Consolidated atomic state object
    const [matchState, setMatchState] = useState<Omit<MatchState, 'bestOfSets'>>({
        sets: initialState?.sets || [{ number: 1, home: 0, away: 0, finished: false }],
        currentSetIdx: initialState?.currentSetIdx || 0,
        posHome: USE_NEW_ROTATION 
            ? migrateOldLineup(initialState?.posHome || Array(6).fill(null))
            : migrateNewLineup(initialState?.posHome || Array(6).fill(null)),
        posAway: USE_NEW_ROTATION
            ? migrateOldLineup(initialState?.posAway || Array(6).fill(null))
            : migrateNewLineup(initialState?.posAway || Array(6).fill(null)),
        benchHome: initialState?.benchHome || [],
        benchAway: initialState?.benchAway || [],
        servingTeam: initialState?.servingTeam || null,
        subsCount: initialState?.subsCount || { home: 0, away: 0 },
        subHistory: initialState?.subHistory || [],
        timeouts: initialState?.timeouts || { home: 0, away: 0 },
        blockedPlayers: initialState?.blockedPlayers || [],
        sanctionsLog: initialState?.sanctionsLog || []
    });

    // Undo History
    const [history, setHistory] = useState<string[]>([]);

    const snapshot = useCallback(() => {
        const stateToSave = {
            bestOfSets,
            ...matchState
        };
        setHistory(prev => [...prev, JSON.stringify(stateToSave)]);
    }, [bestOfSets, matchState]);

    const undo = () => {
        if (history.length === 0) return;
        const lastStateStr = history[history.length - 1];
        const lastState = JSON.parse(lastStateStr);

        setBestOfSets(lastState.bestOfSets || 3);
        setMatchState({
            sets: lastState.sets,
            currentSetIdx: lastState.currentSetIdx,
            posHome: USE_NEW_ROTATION ? migrateOldLineup(lastState.posHome) : migrateNewLineup(lastState.posHome),
            posAway: USE_NEW_ROTATION ? migrateOldLineup(lastState.posAway) : migrateNewLineup(lastState.posAway),
            benchHome: lastState.benchHome,
            benchAway: lastState.benchAway,
            servingTeam: lastState.servingTeam,
            subsCount: lastState.subsCount,
            subHistory: lastState.subHistory || [],
            timeouts: lastState.timeouts || { home: 0, away: 0 },
            blockedPlayers: lastState.blockedPlayers || [],
            sanctionsLog: lastState.sanctionsLog || []
        });

        setHistory(prev => prev.slice(0, -1));
    };

    // Derived court positions mapping O(1) for V2 UI rendering
    const courtPositionsHome = useMemo(() => {
        const map = new Map<number, Player | null>();
        const activePos = USE_NEW_ROTATION ? matchState.posHome : migrateOldLineup(matchState.posHome);
        activePos.forEach(p => {
            if (p && p.posicion_cancha) {
                map.set(p.posicion_cancha, p);
            }
        });
        return map;
    }, [matchState.posHome]);

    const courtPositionsAway = useMemo(() => {
        const map = new Map<number, Player | null>();
        const activePos = USE_NEW_ROTATION ? matchState.posAway : migrateOldLineup(matchState.posAway);
        activePos.forEach(p => {
            if (p && p.posicion_cancha) {
                map.set(p.posicion_cancha, p);
            }
        });
        return map;
    }, [matchState.posAway]);

    // Consistency warnings for post-deploy telemetry
    const warnings = useMemo(() => {
        const list: string[] = [];
        const homeActive = matchState.posHome.filter(Boolean) as Player[];
        const awayActive = matchState.posAway.filter(Boolean) as Player[];

        const homePositions = homeActive.map(p => p.posicion_cancha).filter(Boolean) as number[];
        if (new Set(homePositions).size !== homePositions.length) {
            list.push("Equipo Local posee posicion_cancha duplicados.");
        }
        const awayPositions = awayActive.map(p => p.posicion_cancha).filter(Boolean) as number[];
        if (new Set(awayPositions).size !== awayPositions.length) {
            list.push("Equipo Visitante posee posicion_cancha duplicados.");
        }
        return list;
    }, [matchState.posHome, matchState.posAway]);

    // Atomic actions
    const addPoint = (team: TeamSide) => {
        const currentHome = matchState.sets[matchState.currentSetIdx].home;
        const currentAway = matchState.sets[matchState.currentSetIdx].away;
        
        const isBreak = bestOfSets === 5 ? matchState.currentSetIdx === 4 : matchState.currentSetIdx === 2;
        const target = isBreak ? 15 : 25;

        if ((currentHome >= target && currentHome - currentAway >= 2) || 
            (currentAway >= target && currentAway - currentHome >= 2)) {
            alert(`El set ya ha sido ganado a los ${target} puntos con diferencia de 2. Modifique manualmente si es un error, o cierre el set.`);
            return;
        }

        snapshot();

        setMatchState(prev => {
            const isReceiving = prev.servingTeam && prev.servingTeam !== team;
            let nextPosHome = prev.posHome;
            let nextPosAway = prev.posAway;

            if (isReceiving) {
                if (team === 'home') {
                    nextPosHome = USE_NEW_ROTATION ? rotateTeamPositions(prev.posHome) : rotateTeamArray(prev.posHome);
                } else {
                    nextPosAway = USE_NEW_ROTATION ? rotateTeamPositions(prev.posAway) : rotateTeamArray(prev.posAway);
                }
            }

            const nextSets = prev.sets.map((s, i) => {
                if (i === prev.currentSetIdx) {
                    return { ...s, [team]: s[team] + 1 };
                }
                return s;
            });

            return {
                ...prev,
                posHome: nextPosHome,
                posAway: nextPosAway,
                servingTeam: team,
                sets: nextSets
            };
        });
    };

    const subtractPoint = (team: TeamSide) => {
        if (history.length > 0) {
            const currentScore = matchState.sets[matchState.currentSetIdx][team];
            let prevServer: TeamSide | null = null;
            let didRotate = false;

            for (let i = history.length - 1; i >= 0; i--) {
                const past = JSON.parse(history[i]);
                const pastScore = past.sets[matchState.currentSetIdx]?.[team];
                
                if (pastScore !== undefined && pastScore < currentScore) {
                    const serverBefore = past.servingTeam;
                    if (serverBefore && serverBefore !== team) {
                        didRotate = true;
                        prevServer = serverBefore;
                    }
                    break;
                }
            }

            if (didRotate && prevServer) {
                snapshot();
                setMatchState(prev => {
                    let nextPosHome = prev.posHome;
                    let nextPosAway = prev.posAway;

                    if (team === 'home') {
                        nextPosHome = USE_NEW_ROTATION ? unrotateTeamPositions(prev.posHome) : unrotateTeamArray(prev.posHome);
                    } else {
                        nextPosAway = USE_NEW_ROTATION ? unrotateTeamPositions(prev.posAway) : unrotateTeamArray(prev.posAway);
                    }

                    const nextSets = prev.sets.map((s, i) => {
                        if (i === prev.currentSetIdx) {
                            return { ...s, [team]: Math.max(0, s[team] - 1) };
                        }
                        return s;
                    });

                    return {
                        ...prev,
                        posHome: nextPosHome,
                        posAway: nextPosAway,
                        servingTeam: prevServer,
                        sets: nextSets
                    };
                });
                return;
            }
        }

        snapshot();
        setMatchState(prev => {
            const nextSets = prev.sets.map((s, i) => {
                if (i === prev.currentSetIdx) {
                    return { ...s, [team]: Math.max(0, s[team] - 1) };
                }
                return s;
            });
            return {
                ...prev,
                sets: nextSets
            };
        });
    };

    const confirmR5Lineup = (team: TeamSide, courtPlayers: (Player | null)[], liberos: Player[]) => {
        // Enforce positioning on court players unconditionally
        const newCourt = courtPlayers.map((p, i) => {
            if (!p) return null;
            return {
                ...p,
                posicion_cancha: i + 1
            };
        });

        const allNew = [...newCourt, ...liberos].filter(Boolean) as Player[];
        const numbers = allNew.map(p => p.number);
        const duplicates = numbers.filter((item, index) => numbers.indexOf(item) !== index);
        if (duplicates.length > 0) {
            throw new Error(`El número ${duplicates[0]} está duplicado en la formación.`);
        }

        // Output correct layout based on active flag
        const finalCourt = USE_NEW_ROTATION ? newCourt : migrateNewLineup(newCourt);

        setMatchState(prev => {
            const isHome = team === 'home';
            const bench = isHome ? prev.benchHome : prev.benchAway;

            let nextBench = bench.map(p => {
                const isLib = liberos.some(l => l.id === p.id);
                if (isLib) return { ...p, isLibero: true };
                return p;
            });

            nextBench = nextBench.filter(p => !finalCourt.some(fc => fc && fc.id === p.id));

            return {
                ...prev,
                [isHome ? 'posHome' : 'posAway']: finalCourt,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const substitutePlayer = (team: TeamSide, playerOutId: string, playerIn: Player, forceLiberoAction: boolean = false) => {
        let playerOutObj: Player | undefined;
        if (team === 'home') playerOutObj = matchState.posHome.find(p => p?.id === playerOutId) as Player | undefined;
        else playerOutObj = matchState.posAway.find(p => p?.id === playerOutId) as Player | undefined;

        const isLiberoChange = forceLiberoAction || playerIn.isLibero || (playerOutObj && playerOutObj.isLibero) || false;

        snapshot();

        setMatchState(prev => {
            const isHome = team === 'home';
            const pos = isHome ? prev.posHome : prev.posAway;
            const bench = isHome ? prev.benchHome : prev.benchAway;

            const nextSubsCount = { ...prev.subsCount };
            if (!isLiberoChange) {
                nextSubsCount[team] = nextSubsCount[team] + 1;
            }

            const nextSubHistory = [
                ...prev.subHistory,
                { team, playerOutId, playerInId: playerIn.id, isLiberoAction: !!isLiberoChange }
            ];

            const nextPos = pos.map(p => {
                if (p?.id === playerOutId) {
                    const updated = { ...playerIn };
                    if (p.posicion_cancha !== undefined) {
                        updated.posicion_cancha = p.posicion_cancha;
                    }
                    return updated;
                }
                return p;
            });

            let nextBench = bench;
            if (playerOutObj) {
                const finalOut = playerOutObj;
                const filtered = bench.filter(p => p.id !== playerIn.id);
                nextBench = [...filtered, finalOut].sort((a, b) => a.number - b.number);
            }

            return {
                ...prev,
                subsCount: nextSubsCount,
                subHistory: nextSubHistory,
                [isHome ? 'posHome' : 'posAway']: nextPos,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const addPlayerToBench = (team: TeamSide, player: Player) => {
        setMatchState(prev => {
            const isHome = team === 'home';
            const bench = isHome ? prev.benchHome : prev.benchAway;
            if (bench.find(p => p.id === player.id)) return prev;

            const nextBench = [...bench, player].sort((a, b) => a.number - b.number);
            return {
                ...prev,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const moveToCourt = (team: TeamSide, player: Player) => {
        const currentPos = team === 'home' ? matchState.posHome : matchState.posAway;
        const fillOrder = [0, 5, 4, 3, 2, 1];
        const targetIndex = fillOrder.find(idx => currentPos[idx] === null);

        if (targetIndex === undefined) {
            alert("La cancha está llena (6 jugadores).");
            return;
        }

        snapshot();

        setMatchState(prev => {
            const isHome = team === 'home';
            const pos = isHome ? prev.posHome : prev.posAway;
            const bench = isHome ? prev.benchHome : prev.benchAway;

            const nextPos = [...pos];
            nextPos[targetIndex] = {
                ...player,
                posicion_cancha: indexToPosMap[targetIndex]
            };

            const nextBench = bench.filter(p => p.id !== player.id);

            return {
                ...prev,
                [isHome ? 'posHome' : 'posAway']: nextPos,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const removeFromCourt = (team: TeamSide, player: Player) => {
        snapshot();

        setMatchState(prev => {
            const isHome = team === 'home';
            const pos = isHome ? prev.posHome : prev.posAway;
            const bench = isHome ? prev.benchHome : prev.benchAway;

            const nextPos = pos.map(p => p?.id === player.id ? null : p);
            
            const playerCopy = { ...player };
            delete playerCopy.posicion_cancha;
            const nextBench = [...bench, playerCopy].sort((a, b) => a.number - b.number);

            return {
                ...prev,
                [isHome ? 'posHome' : 'posAway']: nextPos,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const removePlayerFromMatch = (team: TeamSide, player: Player) => {
        setMatchState(prev => {
            const isHome = team === 'home';
            const bench = isHome ? prev.benchHome : prev.benchAway;
            const nextBench = bench.filter(p => p.id !== player.id);
            return {
                ...prev,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const initPositions = () => {
        console.log("Positions initialized");
    };

    const canFinishSet = () => {
        const currentSet = matchState.sets[matchState.currentSetIdx];
        if (!currentSet) return false;
        
        const isBreak = matchState.currentSetIdx === bestOfSets - 1;
        const target = isBreak ? 15 : 25;
        
        const homeWins = currentSet.home >= target && (currentSet.home - currentSet.away) >= 2;
        const awayWins = currentSet.away >= target && (currentSet.away - currentSet.home) >= 2;
        
        return homeWins || awayWins;
    };

    const finishSet = () => {
        if (!canFinishSet()) {
            alert("No se puede cerrar el set. Se necesitan " + (matchState.currentSetIdx === bestOfSets - 1 ? "15" : "25") + " puntos y una diferencia de 2.");
            return;
        }
        
        snapshot();

        setMatchState(prev => {
            const copy = [...prev.sets];
            copy[prev.currentSetIdx].finished = true;
            if (copy.length < bestOfSets) {
                copy.push({ number: copy.length + 1, home: 0, away: 0, finished: false });
            }
            return {
                ...prev,
                sets: copy
            };
        });
    };

    const startNextSet = () => {
        if (!matchState.sets[matchState.currentSetIdx].finished) return;
        if (matchState.currentSetIdx >= bestOfSets - 1) return;

        snapshot();
        
        setMatchState(prev => {
            const nextIdx = prev.currentSetIdx + 1;
            
            const onCourtHome = prev.posHome.filter(p => p !== null) as Player[];
            const cleanedHome = onCourtHome.map(p => {
                const c = { ...p };
                delete c.posicion_cancha;
                return c;
            });
            const nextBenchHome = [...prev.benchHome, ...cleanedHome];
            const uniqueHome = nextBenchHome
                .filter((v,i,a) => a.findIndex(t => t.id === v.id) === i)
                .sort((a, b) => a.number - b.number);

            const onCourtAway = prev.posAway.filter(p => p !== null) as Player[];
            const cleanedAway = onCourtAway.map(p => {
                const c = { ...p };
                delete c.posicion_cancha;
                return c;
            });
            const nextBenchAway = [...prev.benchAway, ...cleanedAway];
            const uniqueAway = nextBenchAway
                .filter((v,i,a) => a.findIndex(t => t.id === v.id) === i)
                .sort((a, b) => a.number - b.number);

            return {
                ...prev,
                currentSetIdx: nextIdx,
                subsCount: { home: 0, away: 0 },
                subHistory: [],
                timeouts: { home: 0, away: 0 },
                blockedPlayers: prev.blockedPlayers.filter(p => p.type === 'match'),
                posHome: Array(6).fill(null),
                posAway: Array(6).fill(null),
                benchHome: uniqueHome,
                benchAway: uniqueAway
            };
        });
    };

    const setAllState = (state: Partial<MatchState>) => {
        setMatchState(prev => {
            const next = { ...prev };
            
            if (state.sets) next.sets = state.sets;
            if (state.currentSetIdx !== undefined) next.currentSetIdx = state.currentSetIdx;
            
            if (state.posHome) {
                next.posHome = USE_NEW_ROTATION
                    ? migrateOldLineup(state.posHome)
                    : migrateNewLineup(state.posHome);
            }
            
            if (state.posAway) {
                next.posAway = USE_NEW_ROTATION
                    ? migrateOldLineup(state.posAway)
                    : migrateNewLineup(state.posAway);
            }

            if (state.benchHome) next.benchHome = state.benchHome;
            if (state.benchAway) next.benchAway = state.benchAway;
            if (state.servingTeam !== undefined) next.servingTeam = state.servingTeam;
            
            // @ts-ignore
            if (state.subsCount) next.subsCount = state.subsCount;
            // @ts-ignore
            if (state.subHistory) next.subHistory = state.subHistory;
            // @ts-ignore
            if (state.timeouts) next.timeouts = state.timeouts;
            if (state.blockedPlayers) next.blockedPlayers = state.blockedPlayers;
            if (state.sanctionsLog) next.sanctionsLog = state.sanctionsLog;

            // Enforce V2 data integrity checks
            if (USE_NEW_ROTATION) {
                next.posHome = sanitizeDuplicates(next.posHome);
                next.posAway = sanitizeDuplicates(next.posAway);
            }

            return next;
        });

        if (state.bestOfSets !== undefined) setBestOfSets(state.bestOfSets);
    };

    const addSanction = (event: Omit<SanctionEvent, 'id' | 'timestamp'>) => {
        snapshot();
        const newEvent: SanctionEvent = {
            ...event,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        setMatchState(prev => ({
            ...prev,
            sanctionsLog: [...prev.sanctionsLog, newEvent]
        }));
    };

    return {
        bestOfSets,
        sets: matchState.sets,
        currentSetIdx: matchState.currentSetIdx,
        posHome: matchState.posHome,
        posAway: matchState.posAway,
        benchHome: matchState.benchHome,
        benchAway: matchState.benchAway,
        servingTeam: matchState.servingTeam,
        subsCount: matchState.subsCount,
        subHistory: matchState.subHistory,
        timeouts: matchState.timeouts,
        blockedPlayers: matchState.blockedPlayers,
        sanctionsLog: matchState.sanctionsLog,
        courtPositionsHome,
        courtPositionsAway,
        warnings,
        USE_NEW_ROTATION,
        
        addPoint,
        subtractPoint,
        substitutePlayer,
        finishSet,
        startNextSet,
        canFinishSet,
        undo,
        setAllState,
        setBestOfSets,
        setSets: (s: SetData[] | ((p: SetData[]) => SetData[])) => {
            setMatchState(prev => {
                const nextVal = typeof s === 'function' ? s(prev.sets) : s;
                return { ...prev, sets: nextVal };
            });
        },
        setServingTeam: (t: TeamSide | null | ((prev: TeamSide | null) => TeamSide | null)) => {
            setMatchState(prev => {
                const nextVal = typeof t === 'function' ? t(prev.servingTeam) : t;
                return { ...prev, servingTeam: nextVal };
            });
        },
        setPosHome: (p: (Player | null)[] | ((prev: (Player | null)[]) => (Player | null)[])) => {
            setMatchState(prev => {
                const nextVal = typeof p === 'function' ? p(prev.posHome) : p;
                return { ...prev, posHome: nextVal };
            });
        },
        setPosAway: (p: (Player | null)[] | ((prev: (Player | null)[]) => (Player | null)[])) => {
            setMatchState(prev => {
                const nextVal = typeof p === 'function' ? p(prev.posAway) : p;
                return { ...prev, posAway: nextVal };
            });
        },
        setBenchHome: (b: Player[] | ((prev: Player[]) => Player[])) => {
            setMatchState(prev => {
                const nextVal = typeof b === 'function' ? b(prev.benchHome) : b;
                return { ...prev, benchHome: nextVal };
            });
        },
        setBenchAway: (b: Player[] | ((prev: Player[]) => Player[])) => {
            setMatchState(prev => {
                const nextVal = typeof b === 'function' ? b(prev.benchAway) : b;
                return { ...prev, benchAway: nextVal };
            });
        },
        initPositions,
        addPlayerToBench,
        moveToCourt,
        removeFromCourt,
        removePlayerFromMatch,
        confirmR5Lineup,
        requestTimeout: (team: TeamSide) => {
            snapshot();
            setMatchState(prev => ({
                ...prev,
                timeouts: { ...prev.timeouts, [team]: prev.timeouts[team] + 1 }
            }));
        },
        blockPlayer: (id: string, type: 'set' | 'match') => {
            snapshot();
            setMatchState(prev => ({
                ...prev,
                blockedPlayers: [...prev.blockedPlayers.filter(p => p.id !== id), { id, type }]
            }));
        },
        unblockSetPlayers: () => {
            snapshot();
            setMatchState(prev => ({
                ...prev,
                blockedPlayers: prev.blockedPlayers.filter(p => p.type === 'match')
            }));
        },
        addSanction
    };
}