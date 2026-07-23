'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface IntermissionModalProps {
    isOpen: boolean;
    team: 'home' | 'away' | 'set_break' | null;
    timeLeft: number;
    audioBlockedWarning: boolean;
    isIntermissionMinimized: boolean;
    setIsIntermissionMinimized: (val: boolean) => void;
    onClose: () => void;
    currentSetNumber: number;
}

export function IntermissionModal({
    isOpen,
    team,
    timeLeft,
    audioBlockedWarning,
    isIntermissionMinimized,
    setIsIntermissionMinimized,
    onClose,
    currentSetNumber
}: IntermissionModalProps) {
    if (!isOpen) return null;

    const isSetBreak = team === 'set_break';

    // Contenedor padre con lógica estricta de pointer-events
    const parentClass = (isSetBreak && isIntermissionMinimized)
        ? "fixed bottom-4 right-4 z-[9999] flex items-end justify-end pointer-events-none bg-transparent backdrop-blur-none transition-all duration-300"
        : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 pointer-events-auto transition-all duration-300";

    // Tarjeta blanca interna con pointer-events-auto explícito para permitir clics internos
    const cardClass = (isSetBreak && isIntermissionMinimized)
        ? "bg-white rounded-2xl w-80 overflow-hidden shadow-2xl border border-slate-200 pointer-events-auto flex flex-col animate-in slide-in-from-bottom duration-300"
        : "bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 pointer-events-auto flex flex-col animate-in zoom-in duration-300";

    const headerBg = isSetBreak
        ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
        : team === 'home'
            ? 'bg-gradient-to-r from-blue-500 to-blue-700'
            : 'bg-gradient-to-r from-red-500 to-red-700';

    return (
        <div className={parentClass}>
            <div className={cardClass}>
                {/* Header */}
                <div className={`p-4 flex justify-between items-center text-white ${headerBg} ${isSetBreak && isIntermissionMinimized ? 'py-3 px-4' : 'p-6'}`}>
                    <div className="flex flex-col text-left">
                        <h3 className={`font-black uppercase tracking-wider ${isSetBreak && isIntermissionMinimized ? 'text-sm' : 'text-xl'}`}>
                            {isSetBreak ? 'DESCANSO ENTRE SETS' : 'TIEMPO MUERTO'}
                        </h3>
                        {!(isSetBreak && isIntermissionMinimized) && (
                            <div className="text-xs font-bold text-white/90 uppercase tracking-widest mt-1">
                                {isSetBreak ? 'Cambio de Lado / Descanso' : `Equipo ${team === 'home' ? 'Local' : 'Visitante'}`}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                        {isSetBreak && (
                            <button
                                onClick={() => setIsIntermissionMinimized(!isIntermissionMinimized)}
                                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
                                title={isIntermissionMinimized ? "Maximizar temporizador" : "Minimizar temporizador"}
                            >
                                {isIntermissionMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className={`text-center bg-slate-50 relative overflow-hidden transition-all duration-300 ${isSetBreak && isIntermissionMinimized ? 'p-4' : 'p-8'}`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-200">
                        <div
                            className={`h-full ${isSetBreak ? 'bg-indigo-500' : team === 'home' ? 'bg-blue-500' : 'bg-red-500'} transition-all duration-500 ease-linear`}
                            style={{ width: `${(timeLeft / (isSetBreak ? 180 : 30)) * 100}%` }}
                        ></div>
                    </div>

                    {timeLeft === 0 ? (
                        <div className={`animate-pulse flex flex-col items-center justify-center rounded-xl p-3 ${isSetBreak && isIntermissionMinimized ? 'bg-red-600 text-white p-2' : 'mt-2 mb-2 text-red-600'}`}>
                            <p className={`font-black uppercase tracking-widest ${isSetBreak && isIntermissionMinimized ? 'text-xs text-white' : 'text-xl mb-1'}`}>
                                ¡TIEMPO CUMPLIDO!
                            </p>
                            <p className={`font-bold uppercase ${isSetBreak && isIntermissionMinimized ? 'text-[9px] text-white/90' : 'text-sm text-slate-500'}`}>
                                DEBE COMENZAR EL SET
                            </p>
                            {audioBlockedWarning && (
                                <div className={`flex items-center gap-1.5 mt-1 bg-black/25 px-2.5 py-1 rounded-lg ${isSetBreak && isIntermissionMinimized ? 'text-[8px]' : 'text-[10px] mt-2'}`}>
                                    <span>🔔 ALERTA SILENCIADA POR EL NAVEGADOR</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-3">
                            {isSetBreak && isIntermissionMinimized && (
                                <div className="relative flex items-center justify-center w-8 h-8">
                                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            className="text-slate-200"
                                            strokeWidth="3.5"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="text-indigo-600 transition-all duration-500 ease-linear"
                                            strokeWidth="3.5"
                                            strokeDasharray={`${(timeLeft / 180) * 100}, 100`}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                </div>
                            )}
                            <div className={`font-black tabular-nums tracking-tighter drop-shadow-sm ${isSetBreak && isIntermissionMinimized ? 'text-4xl text-slate-800' : 'text-8xl md:text-9xl text-slate-800 mb-2'}`}>
                                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                            {isSetBreak && isIntermissionMinimized && (
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider animate-pulse">En curso...</span>
                            )}
                        </div>
                    )}

                    {!(isSetBreak && isIntermissionMinimized) && timeLeft > 0 && (
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Cronómetro en marcha</p>
                    )}
                </div>

                {/* Footer Actions */}
                {(!(isSetBreak && isIntermissionMinimized) || timeLeft === 0) && (
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                        {isSetBreak && timeLeft === 0 ? (
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-xl font-black text-white text-lg bg-green-600 hover:bg-green-700 shadow-lg transition active:scale-[0.98] uppercase tracking-wider"
                            >
                                Cerrar y Continuar
                            </button>
                        ) : isSetBreak ? (
                            <button
                                onClick={() => setIsIntermissionMinimized(true)}
                                className="w-full py-4 rounded-xl font-black text-slate-500 text-lg bg-slate-100 hover:bg-slate-200 transition active:scale-[0.98] uppercase tracking-wider"
                            >
                                Minimizar y Cargar R5
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
