'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancelarPaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    clubOrigenNombre: string;
    isPending: boolean;
}

export function CancelarPaseModal({
    isOpen,
    onClose,
    onConfirm,
    clubOrigenNombre,
    isPending
}: CancelarPaseModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Icono de Alerta */}
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                </div>
                
                {/* Título */}
                <h3 className="text-lg font-black text-white mb-2">
                    ¿Seguro desea cancelar el pase por falta de firmas?
                </h3>
                
                {/* Descripción */}
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                    El jugador volverá a <strong className="text-white">{clubOrigenNombre || 'su club de origen'}</strong> y deberá iniciar un nuevo trámite desde cero.
                </p>
                
                {/* Botones */}
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition"
                    >
                        Volver
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isPending}
                        className="flex-[2] py-3 bg-red-650 hover:bg-red-600 text-white font-black rounded-xl transition flex justify-center items-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                <span>Cancelando...</span>
                            </>
                        ) : (
                            <span>Confirmar Cancelación</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
export default CancelarPaseModal;
