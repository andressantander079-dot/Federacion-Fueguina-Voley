// src/components/admin/MatchSheetsTable.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, FileCheck, Calendar } from 'lucide-react';
import MatchSheetViewer from './MatchSheetViewer';

export default function MatchSheetsTable() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<any | null>(null);

  useEffect(() => {
    fetchSheets();
  }, []);

  async function fetchSheets() {
    setLoading(true);
    // Traemos solo los partidos que tienen planilla ENVIADA (submitted)
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name), away_team:away_team_id(name)')
      .eq('sheet_status', 'submitted') 
      .order('date', { ascending: false });
    
    setSheets(data || []);
    setLoading(false);
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header Tabla */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <FileCheck className="text-blue-600" size={20}/> Planillas Recibidas
            </h3>
            <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
                Total: {sheets.length}
            </span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Encuentro</th>
                        <th className="px-6 py-3 text-center">Resultado</th>
                        <th className="px-6 py-3 text-center">Categoría</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                    ) : sheets.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay planillas enviadas aún.</td></tr>
                    ) : sheets.map((match) => (
                        <tr key={match.id} className="hover:bg-slate-50 transition group">
                            <td className="px-6 py-4 font-bold text-slate-600 flex items-center gap-2">
                                <Calendar size={14} className="text-slate-300"/> 
                                {new Date(match.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-black text-slate-800 uppercase">
                                    {match.home_team?.name || 'Local'} <span className="text-slate-300 font-normal mx-1">vs</span> {match.away_team?.name || 'Visita'}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-slate-900 text-white px-3 py-1 rounded font-mono font-bold">
                                    {match.sheet_data?.final_score?.home} - {match.sheet_data?.final_score?.away}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    {match.sheet_data?.metadata?.category || 'General'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => setSelectedSheet(match.sheet_data)}
                                    className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition flex items-center gap-2 ml-auto"
                                >
                                    <Eye size={14}/> Ver Planilla
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