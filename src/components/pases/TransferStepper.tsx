import React from 'react';
import { Check, Clock, AlertCircle, XCircle } from 'lucide-react';

interface TransferStepperProps {
    estado: string;
    motivo_rechazo?: string | null;
}

export default function TransferStepper({ estado, motivo_rechazo }: TransferStepperProps) {
    
    // Map backend states to UI Steps
    const steps = [
        { id: 1, key: 'revision_inicial_fvf', label: 'Validación de Pago' },
        { id: 2, key: 'esperando_origen', label: 'Decisión de Origen' },
        { id: 3, key: 'esperando_firma_jugador', label: 'Firma de Jugador' },
        { id: 4, key: 'auditoria_final_fvf', label: 'Auditoría FVF' },
        { id: 5, key: 'completado', label: 'Traspaso Oficial' }
    ];

    let currentStep = 0;
    let isError = false;
    let errorMessage = '';

    switch (estado) {
        case 'revision_inicial_fvf':
            currentStep = 1;
            break;
        case 'esperando_origen':
            currentStep = 2;
            break;
        case 'rechazado_origen':
            currentStep = 2;
            isError = true;
            errorMessage = 'Rechazado por el Club de Origen';
            break;
        case 'esperando_firma_jugador':
            currentStep = 3;
            break;
        case 'auditoria_final_fvf':
            currentStep = 4;
            break;
        case 'soft_reject':
            currentStep = 4;
            isError = true;
            errorMessage = 'Documentación Observada por FVF';
            break;
        case 'rechazado':
            // Rechazo total/inicial
            currentStep = 1;
            isError = true;
            errorMessage = 'Trámite Cancelado / Denegado';
            break;
        case 'completado':
        case 'aprobado': // legacy
            currentStep = 5;
            break;
        default:
            currentStep = 1; // Fallback
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center relative mb-4">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 rounded-full z-0 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ${isError ? 'bg-red-500/50' : 'bg-tdf-blue'}`}
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />
                </div>

                {steps.map((step, idx) => {
                    const isCompleted = step.id < currentStep || currentStep === 5;
                    const isCurrent = step.id === currentStep;
                    const isCurrentError = isCurrent && isError;
                    
                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                isCompleted && !isError ? 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]' :
                                isCurrentError ? 'bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                                isCurrent ? 'bg-tdf-blue border-tdf-blue text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-4 ring-tdf-blue/20' :
                                'bg-zinc-900 border-zinc-700 text-zinc-600'
                            }`}>
                                {isCompleted && !isError ? <Check size={14} strokeWidth={4} /> : 
                                 isCurrentError ? <XCircle size={16} /> :
                                 isCurrent ? <Clock size={14} className="animate-pulse" /> :
                                 <span className="text-xs font-bold">{step.id}</span>}
                            </div>
                            
                            {/* Label */}
                            <span className={`absolute top-full mt-2 w-24 text-center text-[9px] sm:text-[10px] uppercase font-bold tracking-wider hidden sm:block ${
                                isCurrentError ? 'text-red-500' :
                                isCurrent ? 'text-tdf-blue' :
                                isCompleted ? 'text-green-500' :
                                'text-zinc-600'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Mobile / Compact Label (if active step) */}
            <div className="mt-6 flex flex-col items-center justify-center text-center p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                {isError ? (
                    <div className="text-red-500">
                        <div className="flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm mb-1">
                            <AlertCircle size={18}/> {errorMessage}
                        </div>
                        {motivo_rechazo && <p className="text-xs text-red-400 max-w-sm mx-auto opacity-80">"{motivo_rechazo}"</p>}
                    </div>
                ) : currentStep === 5 ? (
                    <div className="text-green-500 font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2">
                        <Check size={18}/> Traspaso Oficial Confirmado
                    </div>
                ) : (
                    <div className="text-tdf-blue">
                        <div className="flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm">
                            <Clock size={16} className="animate-spin-slow"/> Paso {currentStep}: {steps[currentStep-1].label}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Aguardando resolución...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
