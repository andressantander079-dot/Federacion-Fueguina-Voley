'use client';

import { useState } from 'react';
import { ArrowRight, X, HelpCircle, Check, Ban, AlertCircle } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    dni: string;
    gender: string;
    birth_date?: string;
    category_id?: string;
}

interface Club {
    name: string;
    shield_url?: string;
}

interface Pase {
    id: string;
    player_id: string;
    origen_club_id: string;
    solicitante_club_id: string;
    estado: string;
    tipo_pase: 'definitivo' | 'prestamo';
    created_at: string;
    player?: Player;
    origen?: Club;
    solicitante?: Club;
}

interface HistorialPasesProps {
    pases: Pase[];
    selectedPase: Pase | null;
    onSelectPase: (pase: Pase) => void;
    onCancelPase: (pase: Pase) => void;
}

type SubTab = 'todos' | 'en_curso' | 'completados' | 'cancelados';

export function HistorialPases({
    pases,
    selectedPase,
    onSelectPase,
    onCancelPase
}: HistorialPasesProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('todos');

    // Helper para clasificar estados
    const isPaseEnCurso = (estado: string) => {
        return !['completado', 'cancelado', 'rechazado', 'rechazado_origen', 'cancelado_por_vencimiento'].includes(estado.toLowerCase());
    };

    const isPaseCancelado = (estado: string) => {
        return ['cancelado', 'rechazado', 'rechazado_origen', 'cancelado_por_vencimiento'].includes(estado.toLowerCase());
    };

    const isPaseCompletado = (estado: string) => {
        return estado.toLowerCase() === 'completado';
    };

    // Filtrar lista
    const filteredPases = pases.filter(pase => {
        const est = pase.estado || '';
        if (activeSubTab === 'en_curso') return isPaseEnCurso(est);
        if (activeSubTab === 'completados') return isPaseCompletado(est);
        if (activeSubTab === 'cancelados') return isPaseCancelado(est);
        return true; // 'todos'
    });

    // Contador de pases por pestaña
    const countEnCurso = pases.filter(p => isPaseEnCurso(p.estado || '')).length;
    const countCompletados = pases.filter(p => isPaseCompletado(p.estado || '')).length;
    const countCancelados = pases.filter(p => isPaseCancelado(p.estado || '')).length;

    // Helper para retornar color de estado
    const getStatusStyles = (estado: string) => {
        const est = estado.toLowerCase();
        if (isPaseCompletado(est)) {
            return {
                bg: 'bg-green-500',
                text: 'text-green-500',
                border: 'border-green-500/20',
                label: 'Completado'
            };
        }
        if (isPaseCancelado(est)) {
            return {
                bg: 'bg-red-500',
                text: 'text-red-500',
                border: 'border-red-500/20',
                label: est.replace(/_/g, ' ')
            };
        }
        return {
            bg: 'bg-tdf-blue',
            text: 'text-tdf-blue',
            border: 'border-tdf-blue/20',
            label: est.replace(/_/g, ' ')
        };
    };

    return (
        <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
            {/* SUB-TABS DE HISTORIAL */}
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 shrink-0 w-full overflow-hidden">
                <button
                    onClick={() => setActiveSubTab('todos')}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg font-bold text-[10px] transition ${
                        activeSubTab === 'todos' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <span>Todos</span>
                    <span className="text-[9px] opacity-60 font-mono">({pases.length})</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('en_curso')}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg font-bold text-[10px] transition ${
                        activeSubTab === 'en_curso' ? 'bg-zinc-800 text-tdf-blue shadow-sm' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <span>En Curso</span>
                    <span className="text-[9px] opacity-60 font-mono">({countEnCurso})</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('completados')}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg font-bold text-[10px] transition ${
                        activeSubTab === 'completados' ? 'bg-zinc-800 text-green-500 shadow-sm' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <span>Completos</span>
                    <span className="text-[9px] opacity-60 font-mono">({countCompletados})</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('cancelados')}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg font-bold text-[10px] transition ${
                        activeSubTab === 'cancelados' ? 'bg-zinc-800 text-red-500 shadow-sm' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <span>Cancelados</span>
                    <span className="text-[9px] opacity-60 font-mono">({countCancelados})</span>
                </button>
            </div>

            {/* LISTADO FILTRADO */}
            <div className="flex-1 overflow-y-auto pb-24 pr-1">
                {filteredPases.length === 0 ? (
                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-3xl p-8 text-center mt-2">
                        <HelpCircle className="mx-auto text-zinc-700 mb-3" size={28} />
                        <h3 className="text-xs font-bold text-white mb-1">Sin registros</h3>
                        <p className="text-[10px] text-zinc-500">No hay trámites históricos en este sub-estado.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredPases.map(pase => {
                            const status = getStatusStyles(pase.estado || '');
                            const isSelected = selectedPase?.id === pase.id;
                            const isEnCurso = isPaseEnCurso(pase.estado || '');

                            return (
                                <div
                                    key={pase.id}
                                    onClick={() => onSelectPase(pase)}
                                    className={`bg-zinc-950 border rounded-2xl p-4 flex flex-col gap-3 transition cursor-pointer hover:border-zinc-500 ${
                                        isSelected ? 'border-zinc-500 shadow-md bg-zinc-900/40' : 'border-zinc-800 opacity-90'
                                    }`}
                                >
                                    {/* Cabecera Tarjeta */}
                                    <div className="flex items-start justify-between gap-2 w-full">
                                        <div className="flex items-center gap-2 truncate">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${status.bg}`} />
                                            <div className="truncate">
                                                <h3 className="text-xs font-black text-white truncate leading-tight">
                                                    {pase.player?.name}
                                                </h3>
                                                <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                                    DNI: {pase.player?.dni}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${status.text} ${status.border} bg-black/40`}>
                                            {pase.tipo_pase === 'prestamo' ? 'Préstamo' : 'Definitivo'}
                                        </span>
                                    </div>

                                    {/* Ruta del Traspaso */}
                                    <div className="flex items-center gap-2 shrink-0 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <img
                                                src={pase.origen?.shield_url || '/placeholder.png'}
                                                className="w-4 h-4 bg-white rounded shrink-0 object-contain"
                                                alt="O"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                                            />
                                            <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[80px]">
                                                {pase.origen?.name}
                                            </span>
                                        </div>
                                        <ArrowRight className="text-zinc-600 shrink-0" size={12} />
                                        <div className="flex items-center gap-1.5 truncate">
                                            <img
                                                src={pase.solicitante?.shield_url || '/placeholder.png'}
                                                className="w-4 h-4 bg-white rounded shrink-0 object-contain"
                                                alt="D"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                                            />
                                            <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[80px]">
                                                {pase.solicitante?.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer Tarjeta con Estado literal */}
                                    <div className="flex items-center justify-between text-[9px] text-zinc-500 font-black uppercase mt-0.5">
                                        <span>Estado: {status.label}</span>
                                        <span className="font-mono lowercase text-[8px] opacity-60">
                                            {new Date(pase.created_at).toLocaleDateString('es-AR')}
                                        </span>
                                    </div>

                                    {/* Botón de Cancelación */}
                                    {isEnCurso && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCancelPase(pase);
                                            }}
                                            className="w-full mt-1.5 py-2 bg-red-950/20 hover:bg-red-900/30 text-red-500 hover:text-red-400 border border-red-950 rounded-xl font-black text-[9px] uppercase tracking-wider transition flex items-center justify-center gap-1"
                                        >
                                            <Ban size={10} /> Cancelar Trámite
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
