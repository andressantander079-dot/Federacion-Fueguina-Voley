'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Shield, User, Users } from 'lucide-react';

interface MatchSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
    clubId: string;
    categories: any[]; // Passed from parent or fetched
}

export default function MatchSheetModal({ isOpen, onClose, match, clubId, categories = [] }: MatchSheetModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [players, setPlayers] = useState<any[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Map<string, any>>(new Map()); // Format: playerId -> { jersey_number, is_captain, is_libero }

    // For "Playing Up" logic
    const [validCategories, setValidCategories] = useState<any[]>([]);
    const [filterCategory, setFilterCategory] = useState("ALL");

    useEffect(() => {
        if (isOpen && match && clubId) {
            loadData();
        }
    }, [isOpen, match, clubId]);

    // Calculate valid categories (Same or Younger)
    useEffect(() => {
        if (!match || categories.length === 0) return;

        const matchCat = categories.find(c => c.name === match.category?.name || c.id === match.category_id); // Match might have cat name or id
        // Fallback if match.category is just name or we need to find by ID
        // Assuming match.category_id is reliable.
        const currentCat = categories.find(c => c.id === match.category_id);

        if (currentCat) {
            // Logic: Category is valid if min_year >= currentCat.min_year (Younger means higher birth year usually for youth, wait)
            // Example: Sub 16 (2010). Sub 14 (2012). 2012 >= 2010. Correct.
            // But we also need to handle "Mayores" or categories without strict years? Assuming all have min_year.
            // If min_year is null, we can't determine.

            const valid = categories.filter(c => {
                // strict gender check? Usually categories don't have gender, squads do.
                // But we must filter SQUADS by gender later.
                if (!c.min_year || !currentCat.min_year) return c.id === currentCat.id;
                return c.min_year >= currentCat.min_year;
            });
            setValidCategories(valid);
        } else {
            // Fallback: only current category
            setValidCategories([match.category_id]); // Just ID if obj not found
        }

    }, [match, categories]);

    async function loadData() {
        setLoading(true);
        try {
            // 1. Fetch Existing Lineup
            const { data: lineup } = await supabase
                .from('match_lineups')
                .select('*')
                .eq('match_id', match.id)
                .eq('team_id', clubId);

            const currentSelection = new Map();
            if (lineup) {
                lineup.forEach((l: any) => {
                    currentSelection.set(l.player_id, {
                        jersey_number: l.jersey_number,
                        is_captain: l.is_captain,
                        is_libero: l.is_libero
                    });
                });
            }
            setSelectedPlayers(currentSelection);

            // 2. Fetch Squads & Players
            // We need ALL squads for the club to show blocked players too
            console.log("Debug Sheet:", { clubId, validCategories, matchGender: match.gender });

            // Fetch squads (No category filter to include older ones)
            const { data: squads } = await supabase
                .from('squads')
                .select('id, category_id, name, gender')
                .eq('team_id', clubId);

            if (!squads) throw new Error("No squads found");

            // Filter by gender roughly
            const genderFilteredSquads = squads.filter((s: any) => !match.gender || s.gender === match.gender || !s.gender);
            const squadIds = genderFilteredSquads.map(s => s.id);

            if (squadIds.length === 0) {
                setPlayers([]);
                console.log("No valid squads found for this match criteria");
                return;
            }

            // Fetch Players in these squads
            const { data: squadPlayers } = await supabase
                .from('players')
                .select(`id, name, dni, number, squad_id`)
                .in('squad_id', squadIds);

            // Match Category Min Year for Blocking Logic
            const matchCatObj = categories.find(c => c.id === match.category_id);
            const matchMinYear = matchCatObj?.min_year || 0;

            // Combine info
            const formattedPlayers = squadPlayers?.map((sp: any) => {
                const squad = genderFilteredSquads.find(s => s.id === sp.squad_id);
                const catObj = categories.find(c => c.id === squad?.category_id);
                const categoryName = catObj?.name;

                // Blocking Logic: Block if Squad is OLDER (min_year < match_min_year)
                // Example: Match Sub-14 (2012). Squad Sub-16 (2010). 2010 < 2012 -> Blocked.
                // Example: Match Sub-14 (2012). Squad Sub-12 (2014). 2014 >= 2012 -> Allowed.
                let isBlocked = false;
                if (catObj?.min_year && matchMinYear) {
                    isBlocked = catObj.min_year < matchMinYear;
                }

                const nameParts = (sp.name || '').split(' ');
                const lastName = nameParts.length > 1 ? nameParts[0] : sp.name;
                const firstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

                return {
                    id: sp.id,
                    first_name: firstName,
                    last_name: lastName,
                    full_name: sp.name,
                    dni: sp.dni,
                    default_number: sp.number,
                    squad_name: categoryName || 'General',
                    squad_id: sp.squad_id,
                    isBlocked: isBlocked,
                    categoryYear: catObj?.min_year
                };
            }) || [];

            // Dedup by ID
            const uniquePlayers = Array.from(new Map(formattedPlayers.map(p => [p.id, p])).values());

            // Sort by Blocked status (Allowed first), then Squad Name, then Name
            uniquePlayers.sort((a: any, b: any) => {
                if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1;
                if (a.squad_name !== b.squad_name) return a.squad_name.localeCompare(b.squad_name);
                return a.last_name.localeCompare(b.last_name);
            });

            setPlayers(uniquePlayers);

        } catch (error) {
            console.error("Error loading sheet:", error);
        } finally {
            setLoading(false);
        }
    }

    const togglePlayer = (p: any) => {
        const newMap = new Map(selectedPlayers);
        if (newMap.has(p.id)) {
            newMap.delete(p.id);
        } else {
            newMap.set(p.id, {
                jersey_number: p.default_number || '',
                is_captain: false,
                is_libero: false
            });
        }
        setSelectedPlayers(newMap);
    };

    const updateDetail = (pid: string, field: string, value: any) => {
        const newMap = new Map(selectedPlayers);
        const current = newMap.get(pid);
        if (current) {
            // Logic: Only 1 captain
            if (field === 'is_captain' && value === true) {
                // Unset others
                newMap.forEach((v, k) => { if (v.is_captain) v.is_captain = false; });
            }
            // Logic: Max 2 liberos? Just warn or allow.

            newMap.set(pid, { ...current, [field]: value });
            setSelectedPlayers(newMap);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        console.log("Saving Match Sheet via API...", { matchId: match?.id, clubId, selectedCount: selectedPlayers.size });

        if (!match?.id || !clubId) {
            console.error("Missing matchId or clubId", { match, clubId });
            alert("Error: Faltan datos del partido o club.");
            setSaving(false);
            return;
        }

        try {
            const selectedList = Array.from(selectedPlayers.entries()).map(([pid, data]) => ({
                match_id: match.id,
                team_id: clubId,
                player_id: pid,
                jersey_number: data.jersey_number ? parseInt(data.jersey_number.toString()) : null,
                is_captain: data.is_captain,
                is_libero: data.is_libero
            }));

            console.log("Payload to send to API:", selectedList);

            const response = await fetch('/api/matches/lineups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: match.id,
                    clubId: clubId,
                    lineups: selectedList
                })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error("API Error Response:", result);
                throw new Error(result.error || "Error desconocido al guardar en servidor");
            }

            console.log("API Success:", result);
            onClose();
            alert('✅ Planilla guardada correctamente (Vía Servidor)');

        } catch (error: any) {
            console.error("Error Saving Full:", error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-zinc-800 flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Armar Planilla</h2>
                        <p className="text-zinc-500 text-xs mt-1">
                            {match.home_team?.name} vs {match.away_team?.name} • {match.category?.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition text-zinc-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* LEFT: Selection */}
                    <div className="flex-1 border-r border-zinc-800 overflow-y-auto p-4 bg-zinc-900/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Users size={14} /> Jugadores
                            </h3>

                            {!loading && players.length > 0 && (
                                <select
                                    className="bg-zinc-950 text-xs text-white border border-zinc-700 rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    value={filterCategory}
                                >
                                    <option value="ALL">Todas</option>
                                    {Array.from(new Set(players.map(p => p.squad_name))).sort().map((cat: any) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {loading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-800 rounded-lg"></div>)}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Group by Squad/Category */}
                                {Object.entries(players.reduce((acc, p) => {
                                    (acc[p.squad_name] = acc[p.squad_name] || []).push(p);
                                    return acc;
                                }, {} as any))
                                    .filter(([squadName]: any) => filterCategory === 'ALL' || squadName === filterCategory)
                                    .map(([squadName, pGroup]: any) => (
                                        <div key={squadName}>
                                            <div className="bg-zinc-800/50 px-3 py-1.5 rounded-lg mb-2 text-xs font-bold text-zinc-400 uppercase inline-block border border-zinc-700/50">
                                                {squadName}
                                            </div>
                                            <div className="space-y-1">
                                                {pGroup.map((p: any) => {
                                                    const isSelected = selectedPlayers.has(p.id);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => {
                                                                if (p.isBlocked) {
                                                                    alert(`⚠️ JUGADORA BLOQUEADA DE CATEGORÍA MAYOR\n\nNom: ${p.full_name}\nCat: ${p.squad_name}\n\nNo puede jugar en una categoría menor.`);
                                                                    return;
                                                                }
                                                                togglePlayer(p);
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${p.isBlocked
                                                                ? 'bg-red-500/10 border-red-500/50 opacity-80 hover:bg-red-500/20'
                                                                : isSelected
                                                                    ? 'bg-blue-600/10 border-blue-600/50'
                                                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                                                                }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${p.isBlocked
                                                                ? 'border-red-500 text-red-500'
                                                                : isSelected
                                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                                    : 'border-zinc-600'
                                                                }`}>
                                                                {p.isBlocked ? <X size={12} /> : (isSelected && <Shield size={10} fill="currentColor" />)}
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold text-sm ${p.isBlocked
                                                                    ? 'text-red-400'
                                                                    : isSelected
                                                                        ? 'text-blue-200'
                                                                        : 'text-zinc-300'
                                                                    }`}>
                                                                    {p.last_name}, {p.first_name}
                                                                </p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] text-zinc-500">DNI: {p.dni || '-'}</p>
                                                                    {p.isBlocked && <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">Bloqueada</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                {players.length === 0 && (
                                    <div className="text-center py-10 text-zinc-500 text-xs">
                                        No se encontraron jugadores habilitados para esta categoría.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Selected Details */}
                    <div className="flex-1 overflow-y-auto p-4 bg-zinc-950">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Shield size={14} /> Convocados ({selectedPlayers.size})
                            </h3>
                            {/* Actions? */}
                        </div>

                        {selectedPlayers.size === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
                                <User size={48} className="mx-auto text-zinc-800 mb-4" />
                                <p className="text-zinc-600 text-sm">Selecciona jugadores de la izquierda</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {Array.from(selectedPlayers.entries()).map(([pid, data]) => {
                                    const p = players.find(x => x.id === pid);
                                    if (!p) return null;
                                    return (
                                        <div key={pid} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-4">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-white">{p.full_name}</p>
                                                <p className="text-[10px] text-zinc-500">{p.squad_name}</p>
                                            </div>

                                            {/* Inputs */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-center">
                                                    <label className="text-[9px] text-zinc-500 uppercase font-bold">N°</label>
                                                    <input
                                                        type="number"
                                                        className="w-10 bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-center text-sm font-bold text-white focus:border-blue-500 outline-none"
                                                        value={data.jersey_number}
                                                        onChange={(e) => updateDetail(pid, 'jersey_number', e.target.value)}
                                                    />
                                                </div>

                                                <div
                                                    onClick={() => updateDetail(pid, 'is_captain', !data.is_captain)}
                                                    className={`cursor-pointer px-2 py-1 rounded border flex flex-col items-center gap-1 transition ${data.is_captain ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
                                                    title="Capitán"
                                                >
                                                    <span className="text-[9px] font-black">C</span>
                                                </div>

                                                <div
                                                    onClick={() => updateDetail(pid, 'is_libero', !data.is_libero)}
                                                    className={`cursor-pointer px-2 py-1 rounded border flex flex-col items-center gap-1 transition ${data.is_libero ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
                                                    title="Líbero"
                                                >
                                                    <span className="text-[9px] font-black">L</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 text-zinc-400 font-bold hover:text-white transition">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                        {saving ? 'Guardando...' : <><Save size={18} /> Guardar Planilla</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
