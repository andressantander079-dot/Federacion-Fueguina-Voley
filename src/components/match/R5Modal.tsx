'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Player, TeamSide } from '@/types/match';
import { getContrastColor } from '@/lib/colorUtils';

interface R5ModalProps {
    team: TeamSide;
    isOpen: boolean;
    onClose: () => void;
    bench: Player[];
    teamsInfo: any;
    currentSetNumber: number;
    confirmR5Lineup: (team: TeamSide, courtPlayers: (Player | null)[], liberos: Player[]) => void;
    teamColors?: {
        home: string[];
        away: string[];
    };
}

export function R5Modal({
    team,
    isOpen,
    onClose,
    bench,
    teamsInfo,
    currentSetNumber,
    confirmR5Lineup,
    teamColors
}: R5ModalProps) {
    const [r5Form, setR5Form] = useState<(Player | null)[]>([null, null, null, null, null, null]);
    const [r5Libero, setR5Libero] = useState<Player | null>(null);
    const [r5Libero2, setR5Libero2] = useState<Player | null>(null);
    const [activeR5Box, setActiveR5Box] = useState<number>(0);
    const [duplicateNumberWarning, setDuplicateNumberWarning] = useState<string | null>(null);

    const teamName = team === 'home' ? teamsInfo?.home.name : teamsInfo?.away.name;
    const currentColors = teamColors?.[team] || (team === 'home' ? ["#E11D48", "#FDA4AF"] : ["#2563EB", "#93C5FD"]);
    const primaryColor = currentColors[0];
    const secondaryColor = currentColors[1];
    const contrastColor = getContrastColor(primaryColor);

    // Resetear formulario al abrir
    useEffect(() => {
        if (isOpen) {
            setR5Form([null, null, null, null, null, null]);
            setR5Libero(null);
            setR5Libero2(null);
            setActiveR5Box(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const availablePlayers = bench.filter(
        p => !r5Form.find(r => r?.id === p.id) && r5Libero?.id !== p.id && r5Libero2?.id !== p.id
    );

    const formationNumbers = [...r5Form, r5Libero, r5Libero2].filter((p): p is Player => p !== null).map(p => p.number);
    const availableNumbers = availablePlayers.map(p => p.number);
    const duplicateAvailableNumbers = availableNumbers.filter((item, index) => availableNumbers.indexOf(item) !== index);
    const blinkingNumbers = new Set([...formationNumbers, ...duplicateAvailableNumbers]);

    const handleSelectPlayer = (player: Player) => {
        if (activeR5Box === 6) {
            setR5Libero(player);
        } else if (activeR5Box === 7) {
            setR5Libero2(player);
        } else {
            const newForm = [...r5Form];
            newForm[activeR5Box] = player;
            setR5Form(newForm);
            const nextEmpty = newForm.findIndex((p, idx) => idx > activeR5Box && p === null);
            if (nextEmpty !== -1) setActiveR5Box(nextEmpty);
            else if (newForm.every(p => p !== null)) setActiveR5Box(6);
        }
    };

    const confirmR5 = () => {
        const liberos = [r5Libero, r5Libero2].filter((p): p is Player => p !== null);

        // Reordenar las jugadoras del R5 para que coincidan con la lógica de celdas físicas de la cancha
        const orderedForm = [
            r5Form[0], // Posición I   -> posicion_cancha = 1
            r5Form[5], // Posición VI  -> posicion_cancha = 2
            r5Form[4], // Posición V   -> posicion_cancha = 3
            r5Form[3], // Posición IV  -> posicion_cancha = 4
            r5Form[2], // Posición III -> posicion_cancha = 5
            r5Form[1], // Posición II  -> posicion_cancha = 6
        ];

        try {
            confirmR5Lineup(team, orderedForm, liberos);
            onClose();
        } catch (err: any) {
            setDuplicateNumberWarning(err.message || "Error en la formación.");
            setTimeout(() => setDuplicateNumberWarning(null), 3000);
        }
    };

    const isComplete = r5Form.every(p => p !== null);

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-full md:max-h-[85vh]">
                <div 
                    className="p-4 flex justify-between items-center relative shrink-0 transition-all duration-300"
                    style={{ backgroundColor: primaryColor, color: contrastColor }}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md p-1 overflow-hidden shrink-0">
                            {teamsInfo?.[team]?.shield ? (
                                <img src={teamsInfo[team].shield} alt={teamName || 'Club'} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-800 font-black text-xl">
                                    {teamName ? teamName.substring(0, 2).toUpperCase() : 'C'}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-xl md:text-3xl font-black tracking-widest leading-none">R5 DIGITAL - SET {currentSetNumber}</div>
                            <div className="text-xs md:text-sm font-bold opacity-90 uppercase mt-1 text-yellow-300">
                                EQUIPO {team === 'home' ? 'LOCAL' : 'VISITANTE'}: <span className="text-white">{teamName || ''}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[500px] bg-slate-50">
                    {/* COLUMNA IZQUIERDA: BANCA */}
                    <div className="w-full md:w-5/12 p-4 md:p-6 flex flex-col bg-white border-b md:border-b-0 md:border-r border-slate-200">
                        <h3 className="font-black text-slate-500 uppercase tracking-widest text-[10px] md:text-xs mb-3">
                            Plantel Disponible {activeR5Box === 6 ? '(Líbero)' : '(Formación)'}
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {availablePlayers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                    <p className="font-bold">Plantel vacío</p>
                                </div>
                            ) : (
                                availablePlayers.map(p => {
                                    const isLibSuggestion = p.isLibero && activeR5Box === 6;
                                    const isDuplicated = blinkingNumbers.has(p.number);
                                    return (
                                        <div 
                                            key={p.id} 
                                            onClick={() => handleSelectPlayer(p)} 
                                            className={`bg-white border md:text-lg border-slate-100 p-2.5 md:p-3 flex items-center gap-3 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group rounded-2xl ${
                                                isLibSuggestion ? 'ring-2 ring-purple-300 bg-purple-50/20' : ''
                                            } ${isDuplicated ? 'animate-pulse ring-2 ring-yellow-400 bg-yellow-50' : ''}`}
                                        >
                                            <span 
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all ${
                                                    isLibSuggestion ? 'bg-purple-600 text-white' : ''
                                                } ${isDuplicated ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-50 text-slate-700 border-2'}`}
                                                style={(!isLibSuggestion && !isDuplicated) ? {
                                                    borderColor: primaryColor,
                                                    color: primaryColor
                                                } : {}}
                                            >{p.number}</span>
                                            <span className="font-bold text-slate-700 flex-1 truncate">{p.name}</span>
                                            {isDuplicated && (
                                                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-md uppercase hidden md:inline-block animate-pulse">
                                                    N° Repetido
                                                </span>
                                            )}
                                            {p.isLibero && (
                                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase hidden md:inline-block">
                                                    Líbero
                                                </span>
                                            )}
                                            {p.isCaptain && (
                                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase hidden md:inline-block">
                                                    Capitán
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                             )}
                        </div>
                    </div>
                    
                    {/* COLUMNA DERECHA: EL PAPEL R5 PREMIUM */}
                    <div className="w-full md:w-7/12 p-4 md:p-8 flex flex-col items-center justify-center overflow-y-auto">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px] md:text-xs">Formación Oficial</h3>
                            <span 
                                className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase"
                                style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
                            >
                                Obligatorio
                            </span>
                        </div>
                        
                        {/* LA "HOJA" PREMIUM */}
                        <div className="bg-white p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 w-full max-w-[360px] md:max-w-[400px] rounded-[2rem] relative flex flex-col items-center">
                            {/* Grid de Cancha */}
                            <div className="w-full relative bg-slate-50/50 rounded-2xl border border-slate-100 p-3 mb-4 grid grid-cols-3 gap-2 md:gap-3">
                                <div className="absolute top-0 inset-x-4 h-[3px] bg-red-400 rounded-full shadow-sm"></div>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black bg-red-50 text-red-500 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-red-100">RED</div>
                                
                                {[
                                    { rIdx: 3, label: 'IV' },
                                    { rIdx: 2, label: 'III' },
                                    { rIdx: 1, label: 'II' },
                                    { rIdx: 4, label: 'V' },
                                    { rIdx: 5, label: 'VI' },
                                    { rIdx: 0, label: 'I' },
                                ].map(({ rIdx, label }) => {
                                    const isLocked = rIdx > 0 && r5Form[rIdx-1] === null;
                                    const isActive = activeR5Box === rIdx;
                                    const player = r5Form[rIdx];

                                    return (
                                        <div 
                                            key={rIdx} 
                                            onClick={() => !isLocked && setActiveR5Box(rIdx)}
                                            className={`aspect-[4/3] rounded-xl border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative ${
                                                isActive ? 'z-10 scale-105' : (isLocked ? 'border-dashed border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-50' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm')
                                            } ${player && !isActive ? 'bg-white border-slate-200' : ''}`}
                                            style={isActive ? {
                                                borderColor: primaryColor,
                                                backgroundColor: primaryColor + '0A',
                                                boxShadow: `0 0 0 4px ${primaryColor}20`
                                            } : {}}
                                        >
                                            {player && isActive && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); const n = [...r5Form]; n[rIdx] = null; setR5Form(n); setActiveR5Box(rIdx); }} 
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                                >
                                                    <X size={12}/>
                                                </button>
                                            )}

                                            {!player ? (
                                                <div className="flex flex-col items-center justify-center opacity-40">
                                                    <span className="text-xl md:text-2xl font-black">{label}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center w-full h-full gap-1 p-1">
                                                    <span className="text-[10px] font-black text-slate-300 mb-[-2px]">{label}</span>
                                                    <div 
                                                        className="w-full rounded-lg py-1.5 flex flex-col items-center justify-center px-1"
                                                        style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
                                                    >
                                                        <span className="font-black text-sm md:text-base leading-none">#{player.number}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Liberos */}
                            <div className="w-full flex gap-3">
                                {/* Libero 1 */}
                                <div onClick={() => setActiveR5Box(6)} className={`flex-1 border-2 aspect-[16/9] rounded-xl flex flex-col items-center justify-center cursor-pointer transition relative ${activeR5Box === 6 ? 'border-purple-500 bg-purple-50 shadow-sm ring-2 ring-purple-100 scale-105 z-10' : 'border-slate-100 bg-white hover:border-slate-200'} ${r5Libero ? 'bg-white border-slate-200' : ''}`}>
                                    {r5Libero && activeR5Box === 6 && (
                                        <button onClick={(e) => { e.stopPropagation(); setR5Libero(null); setActiveR5Box(6); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"><X size={12}/></button>
                                    )}
                                    <span className="text-[9px] font-black text-purple-400 tracking-wider mb-0.5">LÍBERO 1</span>
                                    {r5Libero ? (
                                        <span className="font-black text-base text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">#{r5Libero.number}</span>
                                    ) : (
                                        <span className="text-xs font-black text-slate-300">Vacío</span>
                                    )}
                                </div>
                                
                                {/* Libero 2 */}
                                <div onClick={() => setActiveR5Box(7)} className={`flex-1 border-2 aspect-[16/9] rounded-xl flex flex-col items-center justify-center cursor-pointer transition relative ${activeR5Box === 7 ? 'border-purple-500 bg-purple-50 shadow-sm ring-2 ring-purple-100 scale-105 z-10' : 'border-slate-100 bg-white hover:border-slate-200'} ${r5Libero2 ? 'bg-white border-slate-200' : ''}`}>
                                    {r5Libero2 && activeR5Box === 7 && (
                                        <button onClick={(e) => { e.stopPropagation(); setR5Libero2(null); setActiveR5Box(7); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"><X size={12}/></button>
                                    )}
                                    <span className="text-[9px] font-black text-purple-400 tracking-wider mb-0.5">LÍBERO 2</span>
                                    {r5Libero2 ? (
                                        <span className="font-black text-base text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">#{r5Libero2.number}</span>
                                    ) : (
                                        <span className="text-xs font-black text-slate-300">Vacío</span>
                                    )}
                                </div>
                            </div>

                            {duplicateNumberWarning && (
                                <div className="absolute inset-x-4 bottom-20 bg-red-100 border border-red-200 text-red-700 font-bold text-xs p-2 rounded-xl text-center shadow-lg transition animate-bounce">
                                    ⚠️ {duplicateNumberWarning}
                                </div>
                            )}

                            <button 
                                disabled={!isComplete} 
                                onClick={confirmR5} 
                                className={`w-full py-3.5 mt-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                                    isComplete 
                                        ? 'shadow-md active:scale-98 hover:opacity-90' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border-none'
                                }`}
                                style={isComplete ? {
                                    backgroundColor: primaryColor,
                                    color: contrastColor
                                } : {}}
                            >
                                Confirmar Formación
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
