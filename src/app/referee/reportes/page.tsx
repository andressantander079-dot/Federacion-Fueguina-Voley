'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react'

export default function RefereeReportsPage() {
    const supabase = createClient()
    const [stats, setStats] = useState({
        totalMatches: 0,
        monthMatches: 0,
        totalIncome: 0,
        monthIncome: 0,
        history: [] as any[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data } = await supabase
            .from('match_officials')
            .select('fee_amount, created_at, status, match:matches(scheduled_time)')
            .eq('user_id', user.id)
            .eq('status', 'completed') // Only count completed matches for income? Or 'confirmed'? 
        // Usually you get paid for completed matches.

        if (data) {
            const totalMatches = data.length;
            const totalIncome = data.reduce((sum, item) => sum + (item.fee_amount || 0), 0);

            const monthData = data.filter((item: any) => item.match?.scheduled_time >= firstDayOfMonth);
            const monthMatches = monthData.length;
            const monthIncome = monthData.reduce((sum: any, item: any) => sum + (item.fee_amount || 0), 0);

            setStats({
                totalMatches,
                totalIncome,
                monthMatches,
                monthIncome,
                history: data.slice(0, 10) // Last 10
            })
        }
        setLoading(false)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-2">
                <BarChart3 className="text-tdf-orange" />
                Reportes y Estadísticas
            </h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Partidos (Año)</p>
                    <div className="text-4xl font-black text-white">{stats.totalMatches}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Partidos (Mes)</p>
                    <div className="text-4xl font-black text-tdf-orange">{stats.monthMatches}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Ingresos (Año)</p>
                    <div className="text-4xl font-black text-white">${stats.totalIncome.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Ingresos (Mes)</p>
                    <div className="text-4xl font-black text-green-500">${stats.monthIncome.toLocaleString()}</div>
                </div>
            </div>

            {/* Chart / List Placeholder */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 opacity-50 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                    <p className="font-bold text-zinc-400">Próximamente: Histórico Detallado</p>
                </div>
                <div className="h-40 flex items-end gap-4">
                    {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 bg-zinc-800 rounded-t-lg" style={{ height: `${h}%` }}></div>
                    ))}
                </div>
            </div>
        </div>
    )
}
