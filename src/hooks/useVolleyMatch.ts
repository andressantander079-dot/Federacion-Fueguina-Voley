'use client';

import { useState, useCallback, useMemo } from 'react';
import { Player as MatchPlayer, TeamSide as MatchTeamSide, SetData as MatchSetData, SanctionEvent as MatchSanctionEvent, MatchState as MatchMatchState } from '@/types/match';
import { useRotationLogic } from './useRotationLogic';
import { useIntermissionTimer } from './useIntermissionTimer';

// Re-exportar tipos para mantener compatibilidad 100% con tests existentes
export type Player = MatchPlayer;
export type TeamSide = MatchTeamSide;
export type SetData = MatchSetData;
export type SanctionEvent = MatchSanctionEvent;
export type MatchState = MatchMatchState;

const sanitizeBench = (arr: Player[]): Player[] => {
    if (!arr) return [];
    return arr.filter((p, i, self) => self.findIndex(t => t.id === p.id) === i);
};

export function useVolleyMatch(initialState?: Partial<MatchState>) {
    const {
        USE_NEW_ROTATION,
        migrateOldLineup,
        migrateNewLineup,
        sanitizeDuplicates,
        rotateTeamPositions,
        unrotateTeamPositions,
        rotateTeamArray,
        unrotateTeamArray,
        indexToPosMap
    } = useRotationLogic();

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
        sanctionsLog: initialState?.sanctionsLog || [],
        intermissionStartAt: initialState?.intermissionStartAt || null,
        teamColors: initialState?.teamColors || undefined
    });

    // Delegamos la gestión del temporizador y la guardia de bloqueo al nuevo hook modular (Null-safety estricto)
    const {
        timeLeft,
        isScoringBlocked,
        beepPlayed,
        audioBlockedWarning,
        playBeep,
        clearAlarm
    } = useIntermissionTimer({
        intermissionStartAt: matchState.intermissionStartAt
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
            sanctionsLog: lastState.sanctionsLog || [],
            intermissionStartAt: lastState.intermissionStartAt || null
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
    }, [matchState.posHome, USE_NEW_ROTATION, migrateOldLineup]);

    const courtPositionsAway = useMemo(() => {
        const map = new Map<number, Player | null>();
        const activePos = USE_NEW_ROTATION ? matchState.posAway : migrateOldLineup(matchState.posAway);
        activePos.forEach(p => {
            if (p && p.posicion_cancha) {
                map.set(p.posicion_cancha, p);
            }
        });
        return map;
    }, [matchState.posAway, USE_NEW_ROTATION, migrateOldLineup]);

    // Consistency warnings for telemetry
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
        // Guardia estricta en caliente
        if (isScoringBlocked) {
            console.warn("Intento de sumar puntos rechazado: el descanso entre sets está en curso.");
            return;
        }
        
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
        // Guardia estricta en caliente
        if (isScoringBlocked) {
            console.warn("Intento de restar puntos rechazado: el descanso entre sets está en curso.");
            return;
        }

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

            const nextPos = pos.map((p, i) => {
                if (p?.id === playerOutId) {
                    const updated = { ...playerIn };
                    if (p.posicion_cancha !== undefined) {
                        updated.posicion_cancha = p.posicion_cancha;
                    } else {
                        updated.posicion_cancha = indexToPosMap[i];
                    }
                    return updated;
                }
                return p;
            });

            let nextBench = bench;
            if (playerOutObj) {
                const finalOut = { ...playerOutObj };
                delete finalOut.posicion_cancha;
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

    const removePlayerFromMatch = (team: TeamSide, playerOrId: Player | string) => {
        const playerId = typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
        snapshot();
        setMatchState(prev => {
            const isHome = team === 'home';
            const pos = isHome ? prev.posHome : prev.posAway;
            const bench = isHome ? prev.benchHome : prev.benchAway;

            const nextPos = pos.map(p => p?.id === playerId ? null : p);
            const nextBench = bench.filter(p => p.id !== playerId);

            return {
                ...prev,
                [isHome ? 'posHome' : 'posAway']: nextPos,
                [isHome ? 'benchHome' : 'benchAway']: nextBench
            };
        });
    };

    const finishSet = () => {
        snapshot();
        setMatchState(prev => {
            const nextSets = prev.sets.map((s, i) => {
                if (i === prev.currentSetIdx) {
                    return { ...s, finished: true };
                }
                return s;
            });

            const homeSetsWon = nextSets.filter(s => s.finished && s.home > s.away).length;
            const awaySetsWon = nextSets.filter(s => s.finished && s.away > s.home).length;
            const targetSets = Math.ceil(bestOfSets / 2);
            
            const isMatchOver = homeSetsWon >= targetSets || awaySetsWon >= targetSets;
            
            if (isMatchOver || prev.currentSetIdx >= bestOfSets - 1) {
                return {
                    ...prev,
                    sets: nextSets,
                    intermissionStartAt: null
                };
            }

            // Traspaso inmediato al siguiente set
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

            const updatedSets = nextSets.length <= nextIdx 
                ? [...nextSets, { number: nextIdx + 1, home: 0, away: 0, finished: false }]
                : nextSets;

            return {
                ...prev,
                sets: updatedSets,
                currentSetIdx: nextIdx,
                intermissionStartAt: Date.now(), // Iniciamos el temporizador
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

            const nextSets = prev.sets.length <= nextIdx 
                ? [...prev.sets, { number: nextIdx + 1, home: 0, away: 0, finished: false }]
                : prev.sets;

            return {
                ...prev,
                currentSetIdx: nextIdx,
                intermissionStartAt: null,
                subsCount: { home: 0, away: 0 },
                subHistory: [],
                timeouts: { home: 0, away: 0 },
                blockedPlayers: prev.blockedPlayers.filter(p => p.type === 'match'),
                posHome: Array(6).fill(null),
                posAway: Array(6).fill(null),
                benchHome: uniqueHome,
                benchAway: uniqueAway,
                sets: nextSets
            };
        });
    };

    const canFinishSet = () => {
        const currentHome = matchState.sets[matchState.currentSetIdx].home;
        const currentAway = matchState.sets[matchState.currentSetIdx].away;
        
        const isBreak = bestOfSets === 5 ? matchState.currentSetIdx === 4 : matchState.currentSetIdx === 2;
        const target = isBreak ? 15 : 25;

        return (currentHome >= target || currentAway >= target) && Math.abs(currentHome - currentAway) >= 2;
    };

    const initPositions = (team: TeamSide, courtPlayers: Player[], benchPlayers: Player[]) => {
        snapshot();
        setMatchState(prev => {
            const isHome = team === 'home';
            
            const nextPos = courtPlayers.map((p, i) => ({
                ...p,
                posicion_cancha: indexToPosMap[i]
            }));
            
            const cleanBench = benchPlayers.map(p => {
                const c = { ...p };
                delete c.posicion_cancha;
                return c;
            });

            return {
                ...prev,
                [isHome ? 'posHome' : 'posAway']: nextPos,
                [isHome ? 'benchHome' : 'benchAway']: sanitizeBench(cleanBench)
            };
        });
    };

    const addSanction = (event: Omit<SanctionEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => {
        snapshot();
        const newEvent: SanctionEvent = {
            id: event.id || Math.random().toString(36).substring(2),
            timestamp: event.timestamp || Date.now(),
            ...event
        };
        setMatchState(prev => ({
            ...prev,
            sanctionsLog: [...prev.sanctionsLog, newEvent]
        }));
    };

    return {
        bestOfSets,
        setBestOfSets,
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
        intermissionStartAt: matchState.intermissionStartAt,
        teamColors: matchState.teamColors,
        
        // Exponer lógica de temporizador del submódulo
        timeLeft,
        isScoringBlocked,
        beepPlayed,
        audioBlockedWarning,
        playBeep,
        clearAlarm,

        // Exponer lógica de rotaciones del submódulo
        USE_NEW_ROTATION,
        courtPositionsHome,
        courtPositionsAway,
        warnings,

        // Acciones
        setAllState: (state: Partial<MatchState>) => {
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

                if (state.benchHome) next.benchHome = sanitizeBench(state.benchHome);
                if (state.benchAway) next.benchAway = sanitizeBench(state.benchAway);
                if (state.servingTeam !== undefined) next.servingTeam = state.servingTeam;
                
                // @ts-ignore
                if (state.subsCount) next.subsCount = state.subsCount;
                // @ts-ignore
                if (state.subHistory) next.subHistory = state.subHistory;
                // @ts-ignore
                if (state.timeouts) next.timeouts = state.timeouts;
                // @ts-ignore
                if (state.blockedPlayers) next.blockedPlayers = state.blockedPlayers;
                if (state.sanctionsLog) next.sanctionsLog = state.sanctionsLog;
                if (state.intermissionStartAt !== undefined) next.intermissionStartAt = state.intermissionStartAt;
                if (state.teamColors) next.teamColors = state.teamColors;
                
                return next;
            });
        },
        undo,
        addPoint,
        subtractPoint,
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
                return { ...prev, benchHome: sanitizeBench(nextVal) };
            });
        },
        setBenchAway: (b: Player[] | ((prev: Player[]) => Player[])) => {
            setMatchState(prev => {
                const nextVal = typeof b === 'function' ? b(prev.benchAway) : b;
                return { ...prev, benchAway: sanitizeBench(nextVal) };
            });
        },
        initPositions,
        addPlayerToBench,
        moveToCourt,
        removeFromCourt,
        removePlayerFromMatch,
        confirmR5Lineup,
        substitutePlayer,
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
        setIntermissionStartAt: (t: number | null | ((prev: number | null) => number | null)) => {
            setMatchState(prev => {
                const nextVal = typeof t === 'function' ? t(prev.intermissionStartAt) : t;
                return { ...prev, intermissionStartAt: nextVal };
            });
        },
        addSanction,
        finishSet,
        startNextSet,
        canFinishSet,
        updateTeamColors: (team: 'home' | 'away', colors: string[]) => {
            setMatchState(prev => {
                const currentColors = prev.teamColors || {
                    home: ["#E11D48", "#FDA4AF"],
                    away: ["#2563EB", "#93C5FD"]
                };
                const updatedColors = {
                    ...currentColors,
                    [team]: colors
                };
                return {
                    ...prev,
                    teamColors: updatedColors
                };
            });
        }
    };
}