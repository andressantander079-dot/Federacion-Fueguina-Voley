'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, FileCheck, Calendar } from 'lucide-react';
import MatchSheetViewer from './MatchSheetViewer';

export default function MatchSheetsTable() {
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSheet, setSelectedSheet] = useState<any | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchSheets();
    }, []);

    async function fetchSheets() {
        setLoading(true);
        // Traemos solo los partidos que tienen planilla ENVIADA (submitted)
        const { data, error } = await supabase
            .from('matches')
            .select('*, home_team:home_team_id(name), away_team:away_team_id(name)')
            .eq('sheet_status', 'submitted')
            .order('scheduled_time', { ascending: false });

        if (error) {
            console.error('Error fetching sheets:', error);
        }

        setSheets(data || []);
        setLoading(false);
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Header Tabla */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <FileCheck className="text-tdf-blue" size={20} /> Planillas Recibidas
                    </h3>
                    <span className="text-xs font-bold bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                        Total: {sheets.length}
                    </span>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Encuentro</th>
                                <th className="px-6 py-3 text-center">Resultado</th>
                                <th className="px-6 py-3 text-center">Categoría</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Cargando...</td></tr>
                            ) : sheets.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay planillas enviadas aún.</td></tr>
                            ) : sheets.map((match) => (
                                <tr key={match.id} className="hover:bg-gray-50 transition group">
                                    <td className="px-6 py-4 font-bold text-gray-600 flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-300" />
                                        {new Date(match.scheduled_time).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-gray-800 uppercase">
                                            {match.home_team?.name || 'Local'} <span className="text-gray-300 font-normal mx-1">vs</span> {match.away_team?.name || 'Visita'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-900 text-white px-3 py-1 rounded font-mono font-bold">
                                            {match.sheet_data?.final_score?.home || 0} - {match.sheet_data?.final_score?.away || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {match.sheet_data?.metadata?.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedSheet(match.sheet_data)}
                                            className="text-tdf-blue hover:text-white font-bold text-xs bg-blue-50 hover:bg-tdf-blue px-3 py-2 rounded-lg transition flex items-center gap-2 ml-auto"
                                        >
                                            <Eye size={14} /> Ver Planilla
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL VISOR */}
            {selectedSheet && (
                <MatchSheetViewer
                    data={selectedSheet}
                    onClose={() => setSelectedSheet(null)}
                />
            )}
        </>
    );
}