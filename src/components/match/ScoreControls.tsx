'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { TeamSide, SetData } from '@/types/match';

interface ScoreControlsProps {
    sets: SetData[];
    currentSetIdx: number;
    bestOfSets: number;
    readOnly: boolean;
    matchStatus: string;
    isSidesSwapped: boolean;
    isScoringBlocked: boolean;
    timeouts: { home: number; away: number };
    handleAddPointWrapper: (team: TeamSide) => void;
    subtractPoint: (team: TeamSide) => void;
    handleTimeout: (team: TeamSide) => void;
    canFinishSet: () => boolean;
    finishSet: () => void;
    startNextSet: () => void;
    setTimeoutModal: (modal: { isOpen: boolean; team: 'home' | 'away' | 'set_break' | null; timeLeft: number }) => void;
    setServingTeam: React.Dispatch<React.SetStateAction<TeamSide | null>>;
    setManualSideSwap: React.Dispatch<React.SetStateAction<boolean>>;
    timeLeft: number;
    intermissionStartAt: number | null;
    teamColors?: {
        home: string[];
        away: string[];
    };
}

export function ScoreControls({
    sets,
    currentSetIdx,
    bestOfSets,
    readOnly,
    matchStatus,
    isSidesSwapped,
    isScoringBlocked,
    timeouts,
    handleAddPointWrapper,
    subtractPoint,
    handleTimeout,
    canFinishSet,
    finishSet,
    startNextSet,
    setTimeoutModal,
    setServingTeam,
    setManualSideSwap,
    timeLeft,
    intermissionStartAt,
    teamColors
}: ScoreControlsProps) {
    const currentSet = sets[currentSetIdx];

    const handleFinishSetClick = () => {
        if (canFinishSet()) {
            const currentSet = sets[currentSetIdx];
            const winnerOfCurrent = currentSet.home > currentSet.away ? 'home' : 'away';
            
            const homeSetsWon = sets.filter((s, i) => i !== currentSetIdx && s.finished && s.home > s.away).length + (winnerOfCurrent === 'home' ? 1 : 0);
            const awaySetsWon = sets.filter((s, i) => i !== currentSetIdx && s.finished && s.away > s.home).length + (winnerOfCurrent === 'away' ? 1 : 0);
            const targetSets = Math.ceil(bestOfSets / 2);
            
            const isMatchOver = homeSetsWon >= targetSets || awaySetsWon >= targetSets;
            
            finishSet();
            
            if (!isMatchOver && currentSetIdx < bestOfSets - 1) {
                setTimeoutModal({ isOpen: true, team: 'set_break', timeLeft: 180 });
            }
        } else {
            alert("No se puede cerrar el set. Se necesitan " + (currentSetIdx === bestOfSets - 1 ? "15" : "25") + " puntos y una diferencia de 2.");
        }
    };

    const leftTeam: TeamSide = isSidesSwapped ? 'away' : 'home';
    const rightTeam: TeamSide = isSidesSwapped ? 'home' : 'away';

    const leftPoints = currentSet[leftTeam];
    const rightPoints = currentSet[rightTeam];

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-2 md:p-4 flex flex-col items-center w-full">
            {/* LEYENDAS DE TEMPORIZADOR DE DESCANSO */}
            {intermissionStartAt !== null && (
                <div className="mb-4 w-full text-center py-2 px-4 rounded-xl bg-slate-50 border border-slate-100 animate-in fade-in duration-300">
                    {timeLeft > 0 ? (
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Descanso en curso - Puntos bloqueados ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})
                        </span>
                    ) : (
                        <span className="text-xs font-black text-green-600 uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"></span>
                            Descanso finalizado - Puede comenzar el set
                        </span>
                    )}
                </div>
            )}

            <div className={`flex items-center justify-between w-full max-w-4xl ${isSidesSwapped ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Equipo Local (Físico Izquierda / Lado Normal) */}
                <div className="flex flex-col items-center gap-2">
                    <div 
                        className="text-6xl font-black transition-colors"
                        style={{ color: teamColors?.home[0] || '#2563EB' }}
                    >
                        {currentSet.home}
                    </div>
                    {!readOnly && (
                        <div className="flex gap-2">
                            <button 
                                disabled={isScoringBlocked || matchStatus === 'finished' || matchStatus === 'suspended'} 
                                onClick={() => handleAddPointWrapper('home')} 
                                className="outline-none text-white w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: teamColors?.home[0] || '#2563EB' }}
                            >
                                +
                            </button>
                            <button 
                                disabled={isScoringBlocked || matchStatus === 'finished' || matchStatus === 'suspended'} 
                                onClick={() => subtractPoint('home')} 
                                className="bg-slate-100 text-slate-500 hover:text-red-500 w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -
                            </button>
                        </div>
                    )}
                    <div className="flex gap-1 mt-2">
                        <div 
                            className="w-3 h-3 rounded-full transition-colors"
                            style={{ backgroundColor: timeouts.home >= 1 ? (teamColors?.home[0] || '#2563EB') : '#E2E8F0' }}
                        ></div>
                        <div 
                            className="w-3 h-3 rounded-full transition-colors"
                            style={{ backgroundColor: timeouts.home >= 2 ? (teamColors?.home[0] || '#2563EB') : '#E2E8F0' }}
                        ></div>
                    </div>
                    {!readOnly && (
                        <button 
                            onClick={() => handleTimeout('home')} 
                            className="mt-1 text-[10px] font-bold border px-3 py-1 rounded-full uppercase transition active:scale-95"
                            style={{ 
                                color: teamColors?.home[0] || '#2563EB',
                                borderColor: teamColors?.home[0] || '#2563EB'
                            }}
                        >
                            Tiempo
                        </button>
                    )}
                </div>

                {/* Info Central del Set */}
                <div className="flex flex-col gap-2 w-64 text-center items-center">
                    {readOnly && (
                        <Link href="/" className="mb-2 px-4 py-1 bg-slate-100/50 hover:bg-slate-200 text-slate-500 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 transition">
                            <ArrowLeft size={10} /> Volver al Inicio
                        </Link>
                    )}
                    <h1 className="text-slate-300 font-black text-4xl uppercase tracking-widest leading-none">SETS</h1>
                    <div className="border-2 border-slate-100 rounded-lg p-2 font-bold text-slate-600 w-full">
                        SET {currentSet.number}: {currentSet.home} - {currentSet.away}
                    </div>
                    
                    {!readOnly && (
                        <>
                            {!currentSet.finished ? (
                                <button 
                                    onClick={handleFinishSetClick} 
                                    className={`w-full py-1 text-white rounded text-xs font-bold transition ${
                                        canFinishSet() ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Cerrar Set
                                </button>
                            ) : (
                                currentSetIdx < bestOfSets - 1 && 
                                sets.filter(s => s.finished && s.home > s.away).length < Math.ceil(bestOfSets / 2) && 
                                sets.filter(s => s.finished && s.away > s.home).length < Math.ceil(bestOfSets / 2) && (
                                    <button 
                                        onClick={startNextSet} 
                                        className="w-full py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-500 transition animate-pulse"
                                    >
                                        Iniciar Set {sets.length + 1}
                                    </button>
                                )
                            )}
                            <div className="flex flex-col gap-1 items-center mt-1">
                                <button 
                                    onClick={() => setServingTeam(prev => prev === 'home' ? 'away' : 'home')} 
                                    className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase hover:text-slate-600 transition"
                                >
                                    <ArrowRightLeft size={10} /> Saque
                                </button>
                                <button 
                                    onClick={() => setManualSideSwap(prev => !prev)} 
                                    className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase hover:text-slate-600 transition"
                                >
                                    <RefreshCw size={10} /> Cambiar Lado
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Equipo Visitante (Físico Derecha / Lado Swapped) */}
                <div className="flex flex-col items-center gap-2">
                    <div 
                        className="text-6xl font-black transition-colors"
                        style={{ color: teamColors?.away[0] || '#E11D48' }}
                    >
                        {currentSet.away}
                    </div>
                    {!readOnly && (
                        <div className="flex gap-2">
                            <button 
                                disabled={isScoringBlocked || matchStatus === 'finished' || matchStatus === 'suspended'} 
                                onClick={() => handleAddPointWrapper('away')} 
                                className="text-white w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: teamColors?.away[0] || '#E11D48' }}
                            >
                                +
                            </button>
                            <button 
                                disabled={isScoringBlocked || matchStatus === 'finished' || matchStatus === 'suspended'} 
                                onClick={() => subtractPoint('away')} 
                                className="bg-slate-100 text-slate-500 hover:text-red-500 w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                -
                            </button>
                        </div>
                    )}
                    <div className="flex gap-1 mt-2">
                        <div 
                            className="w-3 h-3 rounded-full transition-colors"
                            style={{ backgroundColor: timeouts.away >= 1 ? (teamColors?.away[0] || '#E11D48') : '#E2E8F0' }}
                        ></div>
                        <div 
                            className="w-3 h-3 rounded-full transition-colors"
                            style={{ backgroundColor: timeouts.away >= 2 ? (teamColors?.away[0] || '#E11D48') : '#E2E8F0' }}
                        ></div>
                    </div>
                    {!readOnly && (
                        <button 
                            onClick={() => handleTimeout('away')} 
                            className="mt-1 text-[10px] font-bold border px-3 py-1 rounded-full uppercase transition active:scale-95"
                            style={{ 
                                color: teamColors?.away[0] || '#E11D48',
                                borderColor: teamColors?.away[0] || '#E11D48'
                            }}
                        >
                            Tiempo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
