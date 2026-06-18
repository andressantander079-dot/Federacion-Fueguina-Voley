'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, BarChart3, Clock, Trophy, CalendarDays, Loader2, Eye, Plus, Trash2 } from 'lucide-react'
import { formatArgentinaDateLiteral } from '@/lib/dateUtils'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import MatchDetailsModal from '@/components/fixture/MatchDetailsModal'

// Handler for rendering MatchDetailsModal via URL query param
function MatchDetailsHandler() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const matchId = searchParams.get('match_details')
    
    if (!matchId) return null
    return <MatchDetailsModal matchId={matchId} onClose={() => router.push(pathname, { scroll: false })} />
}

export default function RefereeReportsPage() {
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()

    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
    const [allData, setAllData] = useState<any[]>([])
    
    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [selectedGender, setSelectedGender] = useState<string>('')

    // Income module states
    const [personalIncomes, setPersonalIncomes] = useState<any[]>([])
    const [isAddingIncome, setIsAddingIncome] = useState(false)
    const [incomeAmount, setIncomeAmount] = useState('')
    const [incomeConcept, setIncomeConcept] = useState('')
    const [addingLoading, setAddingLoading] = useState(false)

    // Inline edit states
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1a. Fetch from match_officials for 1st and 2nd referee roles
        const { data: officialsData } = await supabase
            .from('match_officials')
            .select(`
                id, 
                role, 
                fee_amount, 
                status,
                match:matches (
                    id, 
                    scheduled_time,
                    status,
                    home:teams!home_team_id(name),
                    away:teams!away_team_id(name),
                    tournament:tournaments (
                        id,
                        gender,
                        category:categories(name)
                    )
                )
            `)
            .eq('user_id', user.id)
            .in('role', ['1st_referee', '2nd_referee'])

        // 1b. Fetch all completed matches to check sheet_data and referee_id fallbacks
        const { data: completedMatches } = await supabase
            .from('matches')
            .select(`
                id, 
                scheduled_time,
                status,
                referee_id,
                sheet_data,
                home:teams!home_team_id(name),
                away:teams!away_team_id(name),
                tournament:tournaments (
                    id,
                    gender,
                    category:categories(name)
                )
            `)
            .eq('status', 'finalizado')

        // 2. Fetch isolated personal incomes with match details
        const { data: incomesData } = await supabase
            .from('referee_personal_incomes')
            .select('*, match:matches(scheduled_time)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        // Combine sources to resolve referee match participation
        const matchesMap = new Map<string, any>()

        if (completedMatches) {
            completedMatches.forEach((match: any) => {
                const ref1 = match.referee_id
                const ref1Sheet = match.sheet_data?.staff?.ref1
                const ref2Sheet = match.sheet_data?.staff?.ref2

                if (ref1 === user.id || ref1Sheet === user.id) {
                    matchesMap.set(match.id, {
                        id: `match-ref1-${match.id}`,
                        role: '1st_referee',
                        fee_amount: 0,
                        status: 'assigned',
                        match: match
                    })
                } else if (ref2Sheet === user.id) {
                    matchesMap.set(match.id, {
                        id: `match-ref2-${match.id}`,
                        role: '2nd_referee',
                        fee_amount: 0,
                        status: 'assigned',
                        match: match
                    })
                }
            })
        }

        if (officialsData) {
            officialsData.forEach((item: any) => {
                if (item.match && item.match.status === 'finalizado') {
                    matchesMap.set(item.match.id, {
                        id: item.id,
                        role: item.role,
                        fee_amount: item.fee_amount || 0,
                        status: item.status,
                        match: item.match
                    })
                }
            })
        }

        const validData = Array.from(matchesMap.values())
        // Sort matches from newest to oldest (scheduled_time descending)
        validData.sort((a: any, b: any) => {
            const timeA = a.match?.scheduled_time || ''
            const timeB = b.match?.scheduled_time || ''
            return timeB.localeCompare(timeA)
        })

        setAllData(validData)

        if (incomesData) {
            setPersonalIncomes(incomesData)
        }
        setLoading(false)
    }

    // Add new manual income
    const handleAddIncome = async (e: React.FormEvent) => {
        e.preventDefault()
        const amountNum = parseFloat(incomeAmount)
        if (isNaN(amountNum) || amountNum <= 0 || !incomeConcept.trim()) return

        setAddingLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setAddingLoading(false)
            return
        }

        const { data, error } = await supabase
            .from('referee_personal_incomes')
            .insert({
                user_id: user.id,
                amount: amountNum,
                concept: incomeConcept.trim()
            })
            .select('*, match:matches(scheduled_time)')

        if (error) {
            console.error("Error adding personal income:", error)
        } else if (data) {
            setPersonalIncomes([data[0], ...personalIncomes])
            setIncomeAmount('')
            setIncomeConcept('')
            setIsAddingIncome(false)
        }
        setAddingLoading(false)
    }

    // Delete manual income
    const handleDeleteIncome = async (id: string) => {
        const { error } = await supabase
            .from('referee_personal_incomes')
            .delete()
            .eq('id', id)

        if (error) {
            console.error("Error deleting income:", error)
        } else {
            setPersonalIncomes(personalIncomes.filter(inc => inc.id !== id))
        }
    }

    const handleStartEdit = (matchId: string, currentAmount: number) => {
        setEditingMatchId(matchId)
        setEditValue(currentAmount > 0 ? currentAmount.toString() : '')
    }

    const handleSaveFee = async (matchId: string) => {
        const amountNum = parseFloat(editValue)
        if (isNaN(amountNum) || amountNum < 0) {
            setEditingMatchId(null)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Check if there's already an income for this match
        const existingIncome = personalIncomes.find(inc => inc.match_id === matchId)

        if (existingIncome) {
            if (amountNum === 0) {
                // Delete if amount is set to 0
                const { error } = await supabase
                    .from('referee_personal_incomes')
                    .delete()
                    .eq('id', existingIncome.id)

                if (!error) {
                    setPersonalIncomes(personalIncomes.filter(inc => inc.id !== existingIncome.id))
                } else {
                    console.error("Error deleting income:", error)
                }
            } else {
                // Update
                const { data, error } = await supabase
                    .from('referee_personal_incomes')
                    .update({ amount: amountNum })
                    .eq('id', existingIncome.id)
                    .select('*, match:matches(scheduled_time)')

                if (!error && data) {
                    setPersonalIncomes(personalIncomes.map(inc => inc.id === existingIncome.id ? data[0] : inc))
                } else {
                    console.error("Error updating income:", error)
                }
            }
        } else if (amountNum > 0) {
            // Create new
            const record = allData.find(r => r.match.id === matchId)
            const homeName = record?.match?.home?.name || 'Local'
            const awayName = record?.match?.away?.name || 'Visitante'
            const concept = `Honorarios: ${homeName} vs ${awayName}`

            const { data, error } = await supabase
                .from('referee_personal_incomes')
                .insert({
                    user_id: user.id,
                    match_id: matchId,
                    amount: amountNum,
                    concept: concept
                })
                .select('*, match:matches(scheduled_time)')

            if (!error && data) {
                setPersonalIncomes([data[0], ...personalIncomes])
            } else {
                console.error("Error creating income:", error)
            }
        }

        setEditingMatchId(null)
    }

    // Dynamic derivation of categories for filtering dropdown
    const categoriesList = Array.from(new Set(allData.map(item => item.match?.tournament?.category?.name).filter(Boolean)))

    // Dynamic filtration based on filters (Category and Gender)
    const filteredMatches = allData.filter(item => {
        const match = item.match
        if (!match) return false
        
        // Only include finished matches in reports
        if (match.status !== 'finalizado') return false
        
        // Category Filter
        if (selectedCategory && match.tournament?.category?.name !== selectedCategory) return false

        // Gender Filter
        if (selectedGender && match.tournament?.gender !== selectedGender) return false

        return true
    })

    // Separate matching counts for Mes / Año based on literal dates
    const currentYear = selectedMonth.split('-')[0] // YYYY

    const monthMatchesList = filteredMatches.filter(item => 
        item.match?.scheduled_time.startsWith(selectedMonth)
    )
    const yearMatchesList = filteredMatches.filter(item => 
        item.match?.scheduled_time.startsWith(currentYear)
    )

    // Calculate personal incomes sum matching month/year of the match if present, else created_at
    const monthIncomes = personalIncomes.filter(inc => {
        const dateStr = inc.match?.scheduled_time || inc.created_at
        return dateStr && dateStr.startsWith(selectedMonth)
    })
    const yearIncomes = personalIncomes.filter(inc => {
        const dateStr = inc.match?.scheduled_time || inc.created_at
        return dateStr && dateStr.startsWith(currentYear)
    })

    const monthIncomeSum = monthIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0)
    const yearIncomeSum = yearIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0)

    // AI Performance insights calculation (based on current month matches if available, else all filtered)
    const performanceDataset = monthMatchesList.length > 0 ? monthMatchesList : filteredMatches
    
    const daysCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    const categoriesCount: Record<string, number> = {}
    const clubsCount: Record<string, number> = {}

    performanceDataset.forEach((item: any) => {
        const match = item.match
        const scheduledDate = new Date(match.scheduled_time)
        daysCount[scheduledDate.getDay()] += 1

        const catName = match.tournament?.category?.name || 'General'
        categoriesCount[catName] = (categoriesCount[catName] || 0) + 1

        const homeName = match.home?.name || 'Local'
        const awayName = match.away?.name || 'Visitante'
        clubsCount[homeName] = (clubsCount[homeName] || 0) + 1
        clubsCount[awayName] = (clubsCount[awayName] || 0) + 1
    })

    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    let topDayIdx = 0; let peak = 0;
    for (let i = 0; i < 7; i++) { if (daysCount[i] > peak) { peak = daysCount[i]; topDayIdx = i; } }

    const topCatName = Object.keys(categoriesCount).sort((a, b) => categoriesCount[b] - categoriesCount[a])[0] || '-'
    const topClubs = Object.keys(clubsCount).sort((a, b) => clubsCount[b] - clubsCount[a]).slice(0, 3)

    if (loading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-tdf-orange" />
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
            <Suspense fallback={null}>
                <MatchDetailsHandler />
            </Suspense>

            {/* Header + Dropdown filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-black flex items-center gap-2 text-white">
                    <BarChart3 className="text-tdf-orange" />
                    Mis Reportes
                </h2>
                
                {/* Filters */}
                <div className="flex gap-2">
                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-tdf-orange transition"
                    >
                        <option value="">Todas las Categorías</option>
                        {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Gender Filter */}
                    <select
                        value={selectedGender}
                        onChange={e => setSelectedGender(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-tdf-orange transition"
                    >
                        <option value="">Todos los Géneros</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Mixto">Mixto</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Partidos Mes */}
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-800/50 rounded-full blur-xl -mr-6 -mt-6"></div>
                    <div className="flex justify-between items-center mb-2 relative z-10">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Partidos (Mes)</p>
                        <input 
                            type="month" 
                            className="bg-transparent text-tdf-orange text-[10px] uppercase font-bold border-b border-tdf-orange/30 outline-none w-24 cursor-pointer"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>
                    <div className="text-3xl font-black text-white relative z-10">{monthMatchesList.length}</div>
                </div>

                {/* Partidos Año */}
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Partidos (Año)</p>
                    <div className="text-3xl font-black text-zinc-400 relative z-10">{yearMatchesList.length}</div>
                </div>

                {/* Ingresos Mes */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden flex justify-between items-start">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
                    <div className="flex-grow min-w-0">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Ingresos (Mes)</p>
                        <div className="text-3xl font-black text-emerald-400 relative z-10">${monthIncomeSum.toLocaleString('es-AR')}</div>
                    </div>
                    <button
                        onClick={() => setIsAddingIncome(true)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 p-1.5 rounded-lg transition relative z-10 cursor-pointer"
                        title="Agregar Ingreso Manual"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* Ingresos Año */}
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Ingresos (Año)</p>
                    <div className="text-3xl font-black text-zinc-400 relative z-10">${yearIncomeSum.toLocaleString('es-AR')}</div>
                </div>
            </div>

            {/* Performance Insights */}
            {performanceDataset.length > 0 && (
                <div className="bg-tdf-orange/10 border border-tdf-orange/20 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-tdf-orange uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Trophy size={14} /> Tu Desempeño
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex gap-3 items-center">
                            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                                <CalendarDays className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Día Frecuente</p>
                                <p className="text-white font-bold">{peak > 0 ? daysMap[topDayIdx] : '-'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                                <Clock className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Categoría Frecuente</p>
                                <p className="text-white font-bold">{topCatName}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                                <Trophy className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Clubes más Habituales</p>
                                <p className="text-white font-bold text-xs leading-tight">
                                    {topClubs.length > 0 ? topClubs.join(', ') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Historial de Planillas (Finalizados) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white">Historial de Planillas</h3>
                    <input 
                        type="month" 
                        className="bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-tdf-orange cursor-pointer"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>
                
                {monthMatchesList.length === 0 ? (
                    <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                        Aún no tienes planillas finalizadas en {selectedMonth.split('-').reverse().join('-')}.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/60 max-h-[400px] overflow-y-auto pr-1">
                        {monthMatchesList.map((record) => {
                            const match = record.match
                            return (
                                <div key={match.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                        <img 
                                            src="/logo-fvf.png" 
                                            className="w-10 h-10 rounded-full object-cover bg-zinc-800 shrink-0" 
                                            alt="FVF" 
                                        />
                                        <div>
                                            <p className="text-white font-bold text-sm">
                                                {match.home?.name} <span className="text-zinc-600 font-normal italic mx-1">vs</span> {match.away?.name}
                                            </p>
                                            <p className="text-xs text-zinc-500 font-medium">
                                                {formatArgentinaDateLiteral(match.scheduled_time)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right flex flex-col items-end">
                                            {editingMatchId === match.id ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleSaveFee(match.id)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveFee(match.id)
                                                        if (e.key === 'Escape') setEditingMatchId(null)
                                                    }}
                                                    className="w-24 p-1 text-right bg-black/60 border border-emerald-500 rounded text-sm text-emerald-400 font-black outline-none focus:ring-1 focus:ring-emerald-500"
                                                    autoFocus
                                                />
                                            ) : (
                                                (() => {
                                                    const matchIncome = personalIncomes.find(inc => inc.match_id === match.id)
                                                    const currentFee = matchIncome ? Number(matchIncome.amount) : 0
                                                    return (
                                                        <span 
                                                            onClick={() => handleStartEdit(match.id, currentFee)}
                                                            className="text-emerald-400 font-black cursor-pointer hover:underline text-sm sm:text-base select-none"
                                                            title="Clic para ingresar/editar monto"
                                                        >
                                                            {currentFee > 0 ? `$ ${currentFee.toLocaleString('es-AR')}` : '$ 0'}
                                                        </span>
                                                    )
                                                })()
                                            )}
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 select-none">
                                                {record.role === '1st_referee' ? '1° ÁRBITRO' : '2° ÁRBITRO'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => router.push(`${pathname}?match_details=${match.id}`, { scroll: false })}
                                            className="text-zinc-400 hover:text-white transition p-2 bg-black/50 hover:bg-black border border-zinc-800 rounded-lg cursor-pointer"
                                            title="Ver Planilla y Detalles"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Historial de Ingresos Agregados (Manuales) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-white">Historial de Ingresos Agregados</h3>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Control Personal</span>
                </div>
                
                {personalIncomes.length === 0 ? (
                    <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                        No has agregado ingresos personales aún.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/60 max-h-80 overflow-y-auto pr-1">
                        {personalIncomes.map((inc) => (
                            <div key={inc.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                                <div>
                                    <p className="text-white font-bold text-sm">{inc.concept}</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">
                                        {formatArgentinaDateLiteral(inc.created_at)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-emerald-400 font-black text-sm">${Number(inc.amount).toLocaleString('es-AR')}</span>
                                    <button 
                                        onClick={() => handleDeleteIncome(inc.id)}
                                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer"
                                        title="Eliminar ingreso"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Income Modal Form */}
            {isAddingIncome && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 text-white">
                        <h3 className="text-lg font-black mb-4">Agregar Ingreso Personal</h3>
                        
                        <form onSubmit={handleAddIncome} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    placeholder="Ej: 15000"
                                    value={incomeAmount}
                                    onChange={e => setIncomeAmount(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-black/50 border border-zinc-800 outline-none focus:border-emerald-500 transition text-sm font-bold text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Concepto / Nota</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Viáticos Galicia vs Tolkeyen"
                                    value={incomeConcept}
                                    onChange={e => setIncomeConcept(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-black/50 border border-zinc-800 outline-none focus:border-emerald-500 transition text-sm font-medium text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingIncome(false)
                                        setIncomeAmount('')
                                        setIncomeConcept('')
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingLoading}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs rounded-lg transition"
                                >
                                    {addingLoading ? 'Guardando...' : 'Guardar Ingreso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
