'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SecurityLock from '@/components/treasury/SecurityLock'
import MonthEndExport from '@/components/treasury/MonthEndExport'
import { createClient } from '@/lib/supabase/client'
import { Landmark, TrendingUp, TrendingDown, FileText, Settings, Wallet, X, ArrowUpRight, ArrowDownRight, PieChart as PieIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'

export default function TreasuryPage() {
    const supabase = createClient()
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showExport, setShowExport] = useState(false)

    // Stats State
    const [stats, setStats] = useState({
        balance: 0,
        monthIncome: 0,
        monthExpense: 0,
        expenseCount: 0,
        budgetUsedPercentage: 0,
        incomeGrowth: 0,
        expenseGrowth: 0
    })

    const [distributionData, setDistributionData] = useState<any[]>([])

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6']

    useEffect(() => {
        const unlocked = sessionStorage.getItem('treasury_unlocked') === 'true'
        if (unlocked) {
            setIsUnlocked(true)
            fetchStats()
        }
        setLoading(false)
    }, [isUnlocked])

    async function fetchStats() {
        // 1. All Movs (Balance)
        const { data: allMovs } = await supabase.from('treasury_movements').select('amount, type, date, description')

        if (allMovs) {
            const totalIn = allMovs.filter(m => m.type === 'INGRESO').reduce((sum, m) => sum + m.amount, 0)
            const totalOut = allMovs.filter(m => m.type === 'EGRESO').reduce((sum, m) => sum + m.amount, 0)

            // Current Month
            const now = new Date()
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
            // Previous Month
            const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
            const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime()

            let curIn = 0, curOut = 0, curCount = 0
            let prevIn = 0, prevOut = 0

            // Distribution Map (Category parsing from description MVP)
            const distMap: Record<string, number> = {
                'Inscripciones': 0,
                'Fichajes': 0,
                'Trámites Generales': 0,
                'Multas/Otros': 0
            }

            allMovs.forEach(m => {
                const mkTime = new Date(m.date).getTime()

                // --- Timeline Sorting ---
                if (mkTime >= currentMonthStart) {
                    if (m.type === 'INGRESO') curIn += m.amount
                    else if (m.type === 'EGRESO') { curOut += m.amount; curCount++ }
                } else if (mkTime >= prevMonthStart && mkTime <= prevMonthEnd) {
                    if (m.type === 'INGRESO') prevIn += m.amount
                    else if (m.type === 'EGRESO') prevOut += m.amount
                }

                // --- Category Distribution (Current Month Income Only) ---
                if (m.type === 'INGRESO' && mkTime >= currentMonthStart) {
                    const desc = (m.description || '').toLowerCase()
                    if (desc.includes('inscripción') || desc.includes('inscripcion')) distMap['Inscripciones'] += m.amount
                    else if (desc.includes('jugador') || desc.includes('fichaje')) distMap['Fichajes'] += m.amount
                    else if (desc.includes('trámite') || desc.includes('tramite')) distMap['Trámites Generales'] += m.amount
                    else distMap['Multas/Otros'] += m.amount
                }
            })

            // Calculate Growth %
            const calcGrowth = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : 0
                return ((current - previous) / previous) * 100
            }

            // Map chart data
            const pieData = Object.keys(distMap)
                .map(k => ({ name: k, value: distMap[k] }))
                .filter(d => d.value > 0)
                .sort((a, b) => b.value - a.value)

            setDistributionData(pieData)

            const { data: budgets } = await supabase.from('treasury_cost_centers').select('budget_allocated')
            const totalBudget = budgets?.reduce((sum, b) => sum + b.budget_allocated, 0) || 1
            const budgetUsed = (curOut / totalBudget) * 100

            setStats({
                balance: totalIn - totalOut,
                monthIncome: curIn,
                monthExpense: curOut,
                expenseCount: curCount,
                budgetUsedPercentage: Math.min(budgetUsed, 100),
                incomeGrowth: calcGrowth(curIn, prevIn),
                expenseGrowth: calcGrowth(curOut, prevOut)
            })
        }
    }

    const handleUnlock = () => {
        setIsUnlocked(true)
        sessionStorage.setItem('treasury_unlocked', 'true')
    }

    if (loading) return null

    if (!isUnlocked) {
        return <SecurityLock onUnlock={handleUnlock} />
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black relative text-slate-800 dark:text-white pb-24">

            {/* Export Modal Overlay */}
            {showExport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="relative w-full max-w-lg">
                        <button
                            onClick={() => setShowExport(false)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <MonthEndExport />
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-tdf-orange" />
                        Tesorería <span className="text-slate-400 font-light hidden md:inline">| Dashboard Financiero</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Control de caja, reportes fiscales y rendimiento (Vs Mes Anterior).
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowExport(true)}
                        className="flex-1 md:flex-none px-4 py-2 bg-slate-900 dark:bg-zinc-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <FileText size={16} /> Exportar
                    </button>
                    <Link href="/admin/treasury/config" className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                        <Settings className="w-4 h-4" /> Configuración
                    </Link>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Balance Card */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-tdf-blue/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl text-tdf-blue dark:text-blue-400">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">Global</span>
                    </div>
                    <div className="text-xs font-bold uppercase text-slate-400 mb-1">Saldo en Caja</div>
                    <div className={`text-4xl font-black tracking-tight ${stats.balance >= 0 ? '' : 'text-red-500'}`}>
                        $ {stats.balance.toLocaleString('es-AR')}
                    </div>
                </div>

                {/* Monthly Income */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">Este Mes</span>
                    </div>

                    <div className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                        Ingresos Totales
                        {stats.incomeGrowth !== 0 && (
                            <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${stats.incomeGrowth > 0 ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30'}`}>
                                {stats.incomeGrowth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {Math.abs(stats.incomeGrowth).toFixed(1)}% vs Mes Ant.
                            </span>
                        )}
                    </div>
                    <div className="text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        $ {stats.monthIncome.toLocaleString('es-AR')}
                    </div>
                </div>

                {/* Monthly Expenses */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">Este Mes</span>
                    </div>
                    <div className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                        Egresos Totales
                        {stats.expenseGrowth !== 0 && (
                            <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${stats.expenseGrowth < 0 ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30'}`}>
                                {stats.expenseGrowth < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                {Math.abs(stats.expenseGrowth).toFixed(1)}% vs Mes Ant.
                            </span>
                        )}
                    </div>
                    <div className="text-4xl font-black tracking-tight text-red-600 dark:text-red-400">
                        $ {stats.monthExpense.toLocaleString('es-AR')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* ANALÍTICA: Distribución de Ingresos */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <PieIcon size={18} className="text-tdf-orange" /> Distribución de Ingresos (Mes en Curso)
                    </h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {distributionData.length === 0 ? (
                            <div className="text-center text-slate-400 text-sm font-bold bg-slate-50 dark:bg-zinc-950 p-8 rounded-xl w-full border border-dashed border-slate-200 dark:border-zinc-800">No hay ingresos registrados este mes.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="transparent"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: any) => [`$ ${value.toLocaleString('es-AR')}`, 'Monto']}
                                        contentStyle={{ borderRadius: '12px', borderColor: '#27272a', backgroundColor: '#18181b', color: '#fff', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Presupuesto */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="font-bold">Ejecución Presupuestaria</h3>
                            <span className="text-sm font-black bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">{stats.budgetUsedPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-6 overflow-hidden mb-2">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${stats.budgetUsedPercentage > 90 ? 'bg-red-500' :
                                    stats.budgetUsedPercentage > 70 ? 'bg-orange-400' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${stats.budgetUsedPercentage}%` }}
                            />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 text-center mt-2 uppercase">Presupuesto asignado a Centro de Costos General</p>
                    </div>

                    {/* Quick Action Button Box */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <h3 className="font-bold mb-4 text-sm">Carga Rápida</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/admin/treasury/movements" className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 flex flex-col items-center gap-1 text-xs uppercase tracking-wider">
                                <TrendingUp size={16} /> Ingreso
                            </Link>
                            <Link href="/admin/treasury/movements" className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 flex flex-col items-center gap-1 text-xs uppercase tracking-wider">
                                <TrendingDown size={16} /> Egreso
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Menu Spacing Map Fix */}
            <div className="h-10 w-full hidden md:block"></div>
        </div>
    )
}

