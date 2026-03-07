'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, BarChart3, Clock, Trophy, CalendarDays, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatArgentinaDateLiteral } from '@/lib/dateUtils'

export default function RefereeReportsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null)

    const [stats, setStats] = useState({
        totalMatches: 0,
        monthMatches: 0,
        totalIncome: 0,
        monthIncome: 0,
        favoriteDay: '-',
        favoriteCategory: '-',
        topClubs: [] as string[],
        history: [] as any[]
    })

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const { data } = await supabase
            .from('match_officials')
            .select(`
                id, 
                role, 
                fee_amount, 
                status,
                match:matches (
                    id, 
                    scheduled_time,
                    home:teams!home_team_id(name),
                    away:teams!away_team_id(name),
                    tournament:tournaments(category:categories(name))
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'completed') // Only consider paid / finalized matches
            .order('created_at', { ascending: false })

        if (data) {
            // Arrays for frequencies
            const daysCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } // Sun to Sat
            const categoriesCount: Record<string, number> = {}
            const clubsCount: Record<string, number> = {}

            const validData = data.filter((item: any) => item.match && !Array.isArray(item.match))

            validData.forEach((item: any) => {
                const match = item.match
                const scheduledDate = new Date(match.scheduled_time)

                // 1. Day Frequency
                daysCount[scheduledDate.getDay()] += 1

                // 2. Category Frequency
                const catName = match.tournament?.category?.name || 'General'
                categoriesCount[catName] = (categoriesCount[catName] || 0) + 1

                // 3. Teams Frequency
                const homeName = match.home?.name || 'Local'
                const awayName = match.away?.name || 'Visitante'
                clubsCount[homeName] = (clubsCount[homeName] || 0) + 1
                clubsCount[awayName] = (clubsCount[awayName] || 0) + 1
            })

            // Calculate Tops
            const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
            let topDayIdx = 0; let peak = 0;
            for (let i = 0; i < 7; i++) { if (daysCount[i] > peak) { peak = daysCount[i]; topDayIdx = i; } }

            const topCatName = Object.keys(categoriesCount).sort((a, b) => categoriesCount[b] - categoriesCount[a])[0] || '-'
            const sortedClubs = Object.keys(clubsCount).sort((a, b) => clubsCount[b] - clubsCount[a]).slice(0, 3)

            // Calculate Economics
            const totalMatches = validData.length
            const totalIncome = validData.reduce((sum, item) => sum + (item.fee_amount || 0), 0)

            const monthData = validData.filter((item: any) => item.match?.scheduled_time >= firstDayOfMonth)
            const monthMatches = monthData.length
            const monthIncome = monthData.reduce((sum: any, item: any) => sum + (item.fee_amount || 0), 0)

            setStats({
                totalMatches,
                totalIncome,
                monthMatches,
                monthIncome,
                favoriteDay: peak > 0 ? daysMap[topDayIdx] : '-',
                favoriteCategory: topCatName,
                topClubs: sortedClubs,
                history: validData
            })
        }
        setLoading(false)
    }

    if (loading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-tdf-orange" />
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <h2 className="text-2xl font-black flex items-center gap-2 text-white">
                <BarChart3 className="text-tdf-orange" />
                Mis Reportes
            </h2>

            {/* KPI Cards (Financial) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-800/50 rounded-full blur-xl -mr-6 -mt-6"></div>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Partidos (Mes)</p>
                    <div className="text-3xl font-black text-white relative z-10">{stats.monthMatches}</div>
                </div>
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Partidos (Año)</p>
                    <div className="text-3xl font-black text-zinc-400 relative z-10">{stats.totalMatches}</div>
                </div>
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Ingresos (Mes)</p>
                    <div className="text-3xl font-black text-emerald-400 relative z-10">${stats.monthIncome.toLocaleString('es-AR')}</div>
                </div>
                <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2 relative z-10">Ingresos (Año)</p>
                    <div className="text-3xl font-black text-zinc-400 relative z-10">${stats.totalIncome.toLocaleString('es-AR')}</div>
                </div>
            </div>

            {/* AI Insights & Metrics */}
            {stats.history.length > 0 && (
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
                                <p className="text-white font-bold">{stats.favoriteDay}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                                <Clock className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Categoría Frecuente</p>
                                <p className="text-white font-bold">{stats.favoriteCategory}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                                <Trophy className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Clubes más Habituales</p>
                                <p className="text-white font-bold text-xs leading-tight">
                                    {stats.topClubs.length > 0 ? stats.topClubs.join(', ') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline / History */}
            <div>
                <h3 className="text-lg font-black text-white mb-4">Historial de Planillas</h3>
                {stats.history.length === 0 ? (
                    <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                        Aún no tienes planillas finalizadas.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stats.history.map((record) => {
                            const isExpanded = expandedMatch === record.id;
                            const match = record.match;
                            return (
                                <div key={record.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-zinc-700">
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedMatch(isExpanded ? null : record.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center text-emerald-500">
                                                <DollarSign size={14} className="mb-0.5" />
                                            </div>
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
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-black">${record.fee_amount?.toLocaleString('es-AR') || '0'}</p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase md:hidden">Cobrado</p>
                                            </div>
                                            <button className="text-zinc-600 hover:text-white transition p-2 bg-black/20 rounded-lg hidden md:block">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-2 border-t border-zinc-800 bg-black/20">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-zinc-600">Torneo/Categoría</p>
                                                    <p className="text-xs text-zinc-300 font-medium">{match.tournament?.category?.name || 'Amistoso'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-zinc-600">Tu Rol</p>
                                                    <p className="text-xs text-tdf-orange font-bold capitalize">{record.role.replace('_', ' ')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-zinc-600">Estado de Planilla</p>
                                                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded">Cerrada</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
