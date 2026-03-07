'use client';

import { X } from 'lucide-react';
import OfficialMatchSheet from '@/components/match/OfficialMatchSheet';

interface MatchSheetViewerProps {
    matchId: string;
    onClose: () => void;
}

export default function MatchSheetViewer({ matchId, onClose }: MatchSheetViewerProps) {
    if (!matchId) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm overflow-hidden flex flex-col pt-16">
            <div className="absolute top-4 right-4 z-[70]">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold shadow-lg transition"
                >
                    <X size={20} /> Cerrar Visor
                </button>
            </div>

            <div className="flex-1 w-full bg-slate-50 relative rounded-t-3xl overflow-hidden shadow-2xl">
                {/* 
                     Renderizamos OfficialMatchSheet pasándole el ID que nos interesa.
                     El prop "readOnly" le dirá que quite los botones de guardar, editar, expulsar, etc.
                */}
                <OfficialMatchSheet redirectAfterSubmit="" readOnly={true} matchIdOverride={matchId} />
            </div>
        </div>
    );
}
