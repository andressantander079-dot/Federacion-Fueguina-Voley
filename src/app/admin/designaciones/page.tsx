'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, User, Shield, AlertTriangle, CheckCircle, Search, Filter, Eye, Share2, X, ClipboardCheck } from 'lucide-react'
import { formatArgentinaDateNumerical, formatArgentinaTimeLiteral } from '@/lib/dateUtils'
import MatchDetailsModal from '@/components/fixture/MatchDetailsModal'

export default function DesignationsPage() {
    const supabase = createClient()
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [referees, setReferees] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'pendientes' | 'finalizados'>('pendientes')

    // Selection state
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
    const [assignments, setAssignments] = useState({
        '1st_referee': '',
        '2nd_referee': '',
        'scorer': '',
        'line_judge': ''
    })

    // Match details state
    const [detailsMatch, setDetailsMatch] = useState<any | null>(null)

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [selectedTeam, setSelectedTeam] = useState<string>('')
    const [selectedReferee, setSelectedReferee] = useState<string>('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

    useEffect(() => {
        fetchMatches()
        fetchReferees()
    }, [activeTab]) // Added activeTab as dependency

    async function fetchMatches() {
        setLoading(true)
        
        let query = supabase
            .from('matches')
            .select(`
                *,
                home_team:teams!home_team_id(id, name, shield_url),
                away_team:teams!away_team_id(id, name, shield_url),
                category:categories(name),
                match_officials(
                    id, role, status, user_id,
                    profile:profiles(full_name)
                )
            `)

        // Server-side filtering to drastically reduce payload and load times
        if (activeTab === 'pendientes') {
            query = query.neq('status', 'finalizado')
                         .order('scheduled_time', { ascending: true }) // Upcoming first
        } else {
            query = query.eq('status', 'finalizado')
                         .order('scheduled_time', { ascending: false }) // Newest finished first
                         .limit(30) // Prevent loading all historical matches
        }

        const { data, error } = await query

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
            const restrictions = ref.referee_restrictions?.map((r: any) => r.restricted_team_id) || []
            const isRestricted = restrictions.includes(match.home_team_id) || restrictions.includes(match.away_team_id)
            return !isRestricted
        })
    }

    function openAssignmentModal(match: any) {
        setSelectedMatch(match)
        // Pre-fill existing assignments
        setAssignments({
            '1st_referee': match.match_officials.find((m: any) => m.role === '1st_referee')?.user_id || '',
            '2nd_referee': match.match_officials.find((m: any) => m.role === '2nd_referee')?.user_id || '',
            'scorer': match.match_officials.find((m: any) => m.role === 'scorer')?.user_id || '',
            'line_judge': match.match_officials.find((m: any) => m.role === 'line_judge')?.user_id || '',
        })
    }

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

    // Dynamic lists for filters based on loaded matches
    const categoriesList = Array.from(new Set(matches.map(m => m.category?.name).filter(Boolean)))
    const teamsList = Array.from(new Set(matches.flatMap(m => [m.home_team?.name, m.away_team?.name]).filter(Boolean))).sort()

    // Filtering and sorting logic
    const filteredMatches = matches
        .filter(match => {
            // Tab condition
            const matchesTab = activeTab === 'finalizados' ? match.status === 'finalizado' : match.status !== 'finalizado'
            if (!matchesTab) return false

            // Category filter
            if (selectedCategory && match.category?.name !== selectedCategory) return false

            // Team/Club filter
            if (selectedTeam && match.home_team?.name !== selectedTeam && match.away_team?.name !== selectedTeam) return false

            // Referee filter (both 1st/2nd and scorer)
            if (selectedReferee) {
                const refObj = referees.find(r => r.profile?.id === selectedReferee || r.id === selectedReferee)
                const refProfileId = refObj?.profile?.id
                const refId = refObj?.id

                const isOfficial = match.match_officials?.some((mo: any) => 
                    mo.user_id === refProfileId || mo.user_id === selectedReferee
                )
                
                // Match details for 2nd Referee and Scorer can be in sheet_data?.staff
                const ref2Val = match.sheet_data?.staff?.ref2
                const isStaff2 = ref2Val && (ref2Val === refProfileId || ref2Val === refId || ref2Val === selectedReferee)

                if (!isOfficial && !isStaff2) return false
            }

            // Date filter (literal comparison)
            if (selectedDate) {
                const matchDatePart = match.scheduled_time?.split('T')[0]
                if (matchDatePart !== selectedDate) return false
            }

            return true
        })
        .sort((a, b) => {
            const dateA = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0
            const dateB = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0
            
            if (sortOrder === 'desc') {
                return dateB - dateA
            } else {
                return dateA - dateB
            }
        })

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Shield className="w-8 h-8 text-tdf-blue" />
                    Designaciones Arbitrales
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Asignación de cuerpo arbitral para partidos programados.</p>
            </header>

            {/* TAB SYSTEM */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 mb-6 relative">
                <button
                    onClick={() => setActiveTab('pendientes')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors relative z-10 ${activeTab === 'pendientes' ? 'text-tdf-blue flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-2'}`}
                >
                    <Clock size={16} /> Pendientes
                    {activeTab === 'pendientes' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-tdf-blue rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('finalizados')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors relative z-10 ${activeTab === 'finalizados' ? 'text-green-500 flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-2'}`}
                >
                    <CheckCircle size={16} /> Finalizados
                    {activeTab === 'finalizados' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 rounded-t-full"></div>}
                </button>
            </div>

            {/* FILTROS Y ORDENAMIENTO */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300 font-bold text-sm">
                    <Filter size={16} className="text-tdf-blue" />
                    <span>Filtros de Búsqueda</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Club */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Club / Equipo</label>
                        <select
                            value={selectedTeam}
                            onChange={e => setSelectedTeam(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todos los clubes</option>
                            {teamsList.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Categoría</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todas las categorías</option>
                            {categoriesList.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Árbitro */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Árbitro</label>
                        <select
                            value={selectedReferee}
                            onChange={e => setSelectedReferee(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="">Todos los árbitros</option>
                            {referees.map(r => (
                                <option key={r.id} value={r.profile?.id}>{r.profile?.full_name || 'Sin nombre'}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha de Juego */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Fecha de Juego</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        />
                    </div>

                    {/* Ordenamiento */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Ordenar por Fecha</label>
                        <select
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
                            className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:border-tdf-blue transition"
                        >
                            <option value="desc">Más reciente a más viejo</option>
                            <option value="asc">Más viejo a más reciente</option>
                        </select>
                    </div>
                </div>

                {/* Limpiar Filtros */}
                {(selectedCategory || selectedTeam || selectedReferee || selectedDate) && (
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={() => {
                                setSelectedCategory('')
                                setSelectedTeam('')
                                setSelectedReferee('')
                                setSelectedDate('')
                            }}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition"
                        >
                            <X size={12} /> Limpiar Filtros
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredMatches.map(match => (
                    <div key={match.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">

                        {/* Match Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                                <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">{match.category?.name}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {formatArgentinaDateNumerical(match.scheduled_time)}</span>
                                <span className="flex items-center gap-1"><Clock size={12} /> {formatArgentinaTimeLiteral(match.scheduled_time)} hs</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 w-full justify-between overflow-hidden">
                                <div className="flex items-center justify-end gap-2 text-right flex-1 min-w-0">
                                    <div className="truncate font-black text-slate-800 dark:text-white text-base md:text-lg">{match.home_team.name}</div>
                                    {match.home_team.shield_url && (
                                        <img src={match.home_team.shield_url} className="w-6 h-6 object-contain shrink-0" alt="" />
                                    )}
                                </div>
                                
                                <div className="text-slate-300 font-black shrink-0 px-2">VS</div>
                                
                                <div className="flex items-center justify-start gap-2 text-left flex-1 min-w-0">
                                    {match.away_team.shield_url && (
                                        <img src={match.away_team.shield_url} className="w-6 h-6 object-contain shrink-0" alt="" />
                                    )}
                                    <div className="truncate font-black text-slate-800 dark:text-white text-base md:text-lg">{match.away_team.name}</div>
                                </div>
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
                        {match.status === 'finalizado' ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 px-4 py-2 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 rounded-lg font-bold text-sm">
                                    <CheckCircle size={16} /> Finalizado
                                </div>
                                <button
                                    onClick={() => setDetailsMatch(match)}
                                    className="p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg transition"
                                    title="Ver Detalles"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => openAssignmentModal(match)}
                                className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                            >
                                Designar
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {filteredMatches.length === 0 && !loading && (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-800">
                    <p className="text-slate-500 font-bold">No hay partidos con los filtros seleccionados.</p>
                    {(selectedCategory || selectedTeam || selectedReferee || selectedDate) && (
                        <button 
                            onClick={() => {
                                setSelectedCategory('')
                                setSelectedTeam('')
                                setSelectedReferee('')
                                setSelectedDate('')
                            }} 
                            className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            )}

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
            {/* Modal de Detalles del Partido */}
            {detailsMatch && (
                <MatchDetailsModal 
                    matchId={detailsMatch.id} 
                    onClose={() => setDetailsMatch(null)} 
                />
            )}
        </div>
    )
}
