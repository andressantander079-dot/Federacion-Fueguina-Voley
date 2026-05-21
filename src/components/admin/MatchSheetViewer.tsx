'use client';

import { X, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import OfficialMatchSheet from '@/components/match/OfficialMatchSheet';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface MatchSheetViewerProps {
    matchId: string;
    onClose: () => void;
}

export default function MatchSheetViewer({ matchId, onClose }: MatchSheetViewerProps) {
    if (!matchId) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm overflow-y-auto flex flex-col pt-16 print:pt-0 print:bg-white print:backdrop-blur-none print:block">
            <div className="absolute top-4 right-4 z-[70] flex gap-2 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-full font-bold shadow-lg transition"
                >
                    <Printer size={20} /> Imprimir / PDF
                </button>
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold shadow-lg transition"
                >
                    <X size={20} /> Cerrar Visor
                </button>
            </div>

            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute top-4 left-4 z-[70] flex gap-2 print:hidden bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full shadow-lg">
                            <button onClick={() => zoomOut()} className="p-2 text-white hover:bg-slate-700 rounded-full transition" title="Alejar (Zoom Out)">
                                <ZoomOut size={18} />
                            </button>
                            <button onClick={() => resetTransform()} className="p-2 text-white hover:bg-slate-700 rounded-full transition" title="Restaurar Tamaño">
                                <Maximize size={18} />
                            </button>
                            <button onClick={() => zoomIn()} className="p-2 text-white hover:bg-slate-700 rounded-full transition" title="Acercar (Zoom In)">
                                <ZoomIn size={18} />
                            </button>
                        </div>

                        <div className="flex-1 w-full bg-slate-50 relative rounded-t-3xl overflow-hidden shadow-2xl flex items-start justify-center pt-8 print:pt-0">
                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', minHeight: '100%' }}>
                                <OfficialMatchSheet redirectAfterSubmit="" readOnly={true} matchIdOverride={matchId} />
                            </TransformComponent>
                        </div>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
}
