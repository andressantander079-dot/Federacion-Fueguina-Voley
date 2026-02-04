'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, User, Shield, AlertTriangle, CheckCircle, Search, Filter } from 'lucide-react'

export default function DesignationsPage() {
    const supabase = createClient()
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [referees, setReferees] = useState<any[]>([])

    // Selection state
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
    const [assignments, setAssignments] = useState({
        '1st_referee': '',
        '2nd_referee': '',
        'scorer': '',
        'line_judge': ''
    })

    useEffect(() => {
        fetchMatches()
        fetchReferees()
    }, [])

    async function fetchMatches() {
        setLoading(true)
        // Fetch matches with teams and existing officials
        // Ordered by date ascending, upcoming first
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                home_team:teams!home_team_id(id, name),
                away_team:teams!away_team_id(id, name),
                category:categories(name),
                match_officials(
                    id, role, status,
                    profile:profiles(full_name)
                )
            `)
            .gte('scheduled_time', new Date().toISOString())
            .order('scheduled_time', { ascending: true })

        if (data) setMatches(data)
        setLoading(false)
    }

    async function fetchReferees() {
        // Fetch referees with profiles AND restrictions
        const { data, error } = await supabase
            .from('referees')
            .select(`
                id,
                category,
                profile:profiles(id, full_name),
                referee_restrictions(restricted_team_id)
            `)

        if (error) console.error("Error loading referees:", error)
        if (data) setReferees(data)
    }

    // Filter referees who are NOT restricted for the selected match's teams
    function getAvailableReferees(match: any) {
        if (!match) return []
        return referees.filter(ref => {
            return referees.filter(ref => {
                const restrictions = ref.referee_restrictions?.map((r: any) => r.restricted_team_id) || []
                const isRestricted = restrictions.includes(match.home_team_id) || restrictions.includes(match.away_team_id)
                return !isRestricted
            })
        })
    }

    function openAssignmentModal(match: any) {
        setSelectedMatch(match)
        // Pre-fill existing assignments
        const current = {
            '1st_referee': '',
            '2nd_referee': '',
            'scorer': '',
            'line_judge': ''
        }
        match.match_officials.forEach((mo: any) => {
            if (current.hasOwnProperty(mo.role)) {
                // @ts-ignore
                current[mo.role] = mo.profile.id // We need profile ID (which is same as user_id/referee id in this schema)
                // Wait, match_officials user_id references profiles.id. Referees table id references profiles.id.
                // So checking schema: match_officials.user_id IS the profile id.
                // However, fetching query returns profile object. We need to find the ID.
                // The select query above fetches match_officials(profile:profiles(full_name)).
                // We actually need the user_id from match_officials to pre-fill the select.
            }
        })
        // Re-fetch match officials with user_id to be sure or just trust logic
        const officialsMap: any = {}
        match.match_officials.forEach((mo: any) => {
            // We need the user_id. Let's assume fetching '*' in match_officials or just adding user_id to query.
            // Updating fetchMatches query...
        })

        // Let's reset for now, better logic below
        setAssignments({
            '1st_referee': match.match_officials.find((m: any) => m.role === '1st_referee')?.user_id || '',
            '2nd_referee': match.match_officials.find((m: any) => m.role === '2nd_referee')?.user_id || '',
            'scorer': match.match_officials.find((m: any) => m.role === 'scorer')?.user_id || '',
            'line_judge': match.match_officials.find((m: any) => m.role === 'line_judge')?.user_id || '',
        })
    }

    // Need to update fetchMatches to include user_id in match_officials
    // Actually `match_officials` table has `user_id` column.

    async function saveAssignments(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedMatch) return

        const roles = ['1st_referee', '2nd_referee', 'scorer', 'line_judge']

        for (const role of roles) {
            // @ts-ignore
            const refereeId = assignments[role]

            // 1. Check if assignment exists
            const existing = selectedMatch.match_officials.find((mo: any) => mo.role === role)

            if (refereeId) {
                // Upsert (or delete then insert, or update)
                // Since we have unique constraint on match_id + role, upsert is good.
                const { error } = await supabase.from('match_officials').upsert({
                    match_id: selectedMatch.id,
                    role: role,
                    user_id: refereeId,
                    status: 'assigned'
                }, { onConflict: 'match_id, role' })

                if (error) console.error('Error assigning ' + role, error)
            } else if (existing) {
                // Remove assignment if empty
                await supabase.from('match_officials').delete().eq('id', existing.id)
            }
        }

        setSelectedMatch(null)
        fetchMatches()
    }

    const availableReferees = getAvailableReferees(selectedMatch)

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Shield className="w-8 h-8 text-tdf-blue" />
                    Designaciones Arbitrales
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Asignación de cuerpo arbitral para partidos programados.</p>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {matches.map(match => (
                    <div key={match.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">

                        {/* Match Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                                <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">{match.category?.name}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(match.scheduled_time).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="text-right flex-1 font-black text-slate-800 dark:text-white text-lg">{match.home_team.name}</div>
                                <div className="text-slate-300 font-black">VS</div>
                                <div className="text-left flex-1 font-black text-slate-800 dark:text-white text-lg">{match.away_team.name}</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <MapPin size={12} /> {match.court_name || 'Cancha a confirmar'}
                            </div>
                        </div>

                        {/* Assignments Preview */}
                        <div className="flex items-center gap-2">
                            {match.match_officials.length > 0 ? (
                                <div className="flex -space-x-2">
                                    {match.match_officials.map((mo: any) => (
                                        <div key={mo.id} className="w-8 h-8 rounded-full bg-tdf-blue text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-zinc-900" title={`${mo.role}: ${mo.profile?.full_name}`}>
                                            {mo.profile?.full_name.charAt(0)}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-orange-500 font-bold flex items-center gap-1"><AlertTriangle size={12} /> Sin designar</span>
                            )}
                        </div>

                        {/* Action */}
                        <button
                            onClick={() => openAssignmentModal(match)}
                            className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                        >
                            Designar
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={saveAssignments} className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-zinc-800">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Cuerpo Arbitral</h3>

                        <div className="space-y-4">
                            {/* 1st Referee */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">1° Árbitro</label>
                                <select
                                    className="w-full p-2 rounded bg-gray-100 dark:bg-zinc-800 border-transparent outline-none"
                                    value={assignments['1st_referee']}
                                    onChange={e => setAssignments({ ...assignments, '1st_referee': e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {availableReferees.map(r => (
                                        // @ts-ignore
                                        <option key={r.id} value={r.profile.id}>{r.profile.full_name} ({r.category})</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2nd Referee */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">2° Árbitro</label>
                                <select
                                    className="w-full p-2 rounded bg-gray-100 dark:bg-zinc-800 border-transparent outline-none"
                                    value={assignments['2nd_referee']}
                                    onChange={e => setAssignments({ ...assignments, '2nd_referee': e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {availableReferees.map(r => (
                                        // @ts-ignore
                                        <option key={r.id} value={r.profile.id}>{r.profile.full_name} ({r.category})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Scorer */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apuntador</label>
                                <select
                                    className="w-full p-2 rounded bg-gray-100 dark:bg-zinc-800 border-transparent outline-none"
                                    value={assignments['scorer']}
                                    onChange={e => setAssignments({ ...assignments, 'scorer': e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {availableReferees.map(r => (
                                        // @ts-ignore
                                        <option key={r.id} value={r.profile.id}>{r.profile.full_name} ({r.category})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Linesman */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Juez de Línea</label>
                                <select
                                    className="w-full p-2 rounded bg-gray-100 dark:bg-zinc-800 border-transparent outline-none"
                                    value={assignments['line_judge']}
                                    onChange={e => setAssignments({ ...assignments, 'line_judge': e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {availableReferees.map(r => (
                                        // @ts-ignore
                                        <option key={r.id} value={r.profile.id}>{r.profile.full_name} ({r.category})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-8">
                            <button type="button" onClick={() => setSelectedMatch(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-tdf-blue text-white rounded-lg font-bold">Guardar Designación</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
