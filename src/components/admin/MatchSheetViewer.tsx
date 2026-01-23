'use client';

import { X, Trophy, Users, Clock, Info } from 'lucide-react';

interface MatchSheetViewerProps {
    data: any;
    onClose: () => void;
}

export default function MatchSheetViewer({ data, onClose }: MatchSheetViewerProps) {
    if (!data) return null;

    const { final_score, sets, metadata, players, observations } = data;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-bold uppercase tracking-wider">
                            <Clock size={14} /> {metadata?.date ? new Date(metadata.date).toLocaleDateString() : 'Fecha desconocida'}
                            <span className="text-slate-600">•</span>
                            <span>{metadata?.category || 'Sin Categoría'}</span>
                        </div>
                        <h2 className="text-2xl font-black flex items-center gap-4">
                            <span>{metadata?.home_name || 'Local'}</span>
                            <span className="text-slate-500 font-medium text-lg">vs</span>
                            <span>{metadata?.away_name || 'Visita'}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Score Big Board */}
                <div className="bg-slate-100 p-6 border-b border-slate-200 flex justify-center items-center gap-8">
                    <div className="text-center">
                        <span className="block text-4xl font-black text-slate-900">{final_score?.home || 0}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase">Sets Local</span>
                    </div>
                    <div className="flex gap-2">
                        {sets && sets.map((set: string, i: number) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="bg-white px-3 py-2 rounded-lg font-mono font-bold border border-slate-300 shadow-sm text-lg text-slate-800">
                                    {set}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 mt-1">S{i + 1}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <span className="block text-4xl font-black text-slate-900">{final_score?.away || 0}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase">Sets Visita</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* OBSERVACIONES */}
                        <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                                <Info size={16} className="text-blue-500" /> Observaciones del Árbitro
                            </h3>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap">
                                {observations || 'Sin observaciones registradas.'}
                            </p>
                        </div>

                        {/* PLANTELES (Placeholder si no hay datos complejos) */}
                        {players ? (
                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2"><Users size={16} /> Plantel Local</h4>
                                    <ul className="space-y-1">
                                        {players.home?.map((p: any, i: number) => (
                                            <li key={i} className="text-sm text-slate-600 flex justify-between">
                                                <span>{p.number} - {p.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2"><Users size={16} /> Plantel Visita</h4>
                                    <ul className="space-y-1">
                                        {players.away?.map((p: any, i: number) => (
                                            <li key={i} className="text-sm text-slate-600 flex justify-between">
                                                <span>{p.number} - {p.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="col-span-1 md:col-span-2 text-center py-8 text-slate-400">
                                <Users size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No se encontraron datos detallados de los planteles en esta planilla digital.</p>
                            </div>
                        )}

                        {/* RAW DATA (For Debugging, hidden by default or toggleable, here just simplified) */}
                        <div className="col-span-1 md:col-span-2 text-xs text-slate-300 font-mono break-all">
                            ID Planilla: {metadata?.sheet_id || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition">
                        Cerrar Visor
                    </button>
                </div>
            </div>
        </div>
    );
}
