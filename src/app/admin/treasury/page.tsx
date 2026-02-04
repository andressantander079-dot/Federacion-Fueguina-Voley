'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SecurityLock from '@/components/treasury/SecurityLock'
import MonthEndExport from '@/components/treasury/MonthEndExport'
import { createClient } from '@/lib/supabase/client'
import { Landmark, TrendingUp, TrendingDown, FileText, Settings, Wallet, X } from 'lucide-react'

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
        budgetUsedPercentage: 0
    })

    useEffect(() => {
        // Check session storage on mount
        const unlocked = sessionStorage.getItem('treasury_unlocked') === 'true'
        if (unlocked) {
            setIsUnlocked(true)
            fetchStats()
        }
        setLoading(false)
    }, [isUnlocked])

    async function fetchStats() {
        // 1. Calculate Balance (All time)
        // Note: For large DBs this should be a DB function/materialized view. doing client-side for MVP.
        const { data: allMovs } = await supabase.from('treasury_movements').select('amount, type')

        // 2. Calculate Month Stats
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { data: monthMovs } = await supabase.from('treasury_movements')
            .select('amount, type')
            .gte('date', startOfMonth)

        if (allMovs) {
            const totalIn = allMovs.filter(m => m.type === 'INGRESO').reduce((sum, m) => sum + m.amount, 0)
            const totalOut = allMovs.filter(m => m.type === 'EGRESO').reduce((sum, m) => sum + m.amount, 0)

            let mIn = 0, mOut = 0, count = 0
            if (monthMovs) {
                mIn = monthMovs.filter(m => m.type === 'INGRESO').reduce((sum, m) => sum + m.amount, 0)
                mOut = monthMovs.filter(m => m.type === 'EGRESO').reduce((sum, m) => sum + m.amount, 0)
                count = monthMovs.filter(m => m.type === 'EGRESO').length
            }

            // Mock Budget Calculation (Total Budget vs Total Expenses)
            // Real implement would sum treasury_cost_centers.budget_allocated
            const { data: budgets } = await supabase.from('treasury_cost_centers').select('budget_allocated')
            const totalBudget = budgets?.reduce((sum, b) => sum + b.budget_allocated, 0) || 1
            const budgetUsed = (mOut / totalBudget) * 100

            setStats({
                balance: totalIn - totalOut,
                monthIncome: mIn,
                monthExpense: mOut,
                expenseCount: count,
                budgetUsedPercentage: Math.min(budgetUsed, 100)
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
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black relative">

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
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-tdf-orange" />
                        Tesorería <span className="text-slate-400 font-light hidden md:inline">| Dashboard Financiero</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Control de caja y reportes fiscales.
                    </p>
                </div>
                <Link href="/admin/treasury/config" className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors">
                    <Settings className="w-4 h-4" /> Configuración
                </Link>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Balance Card */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border-l-4 border-tdf-blue group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl text-tdf-blue dark:text-blue-400">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-400">Saldo en Caja</span>
                    </div>
                    <div className={`text-3xl font-black mb-1 ${stats.balance >= 0 ? 'text-slate-800 dark:text-white' : 'text-red-500'}`}>
                        $ {stats.balance.toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm font-medium text-slate-400">Total Disponible</div>
                </div>

                {/* Monthly Income */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500 group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-400">Ingresos (Mes)</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">
                        $ {stats.monthIncome.toLocaleString('es-AR')}
                    </div>
                    <div className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit">
                        + Cash Flow
                    </div>
                </div>

                {/* Monthly Expenses */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border-l-4 border-red-500 group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-400">Egresos (Mes)</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">
                        $ {stats.monthExpense.toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm font-medium text-slate-400">{stats.expenseCount} Registros</div>
                </div>
            </div>

            {/* Budget Progress */}
            <div className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex justify-between items-end mb-2">
                    <h3 className="font-bold text-slate-700 dark:text-white">Ejecución Presupuestaria Mensual</h3>
                    <span className="text-sm font-mono font-bold text-slate-500">{stats.budgetUsedPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${stats.budgetUsedPercentage > 90 ? 'bg-red-500' :
                                stats.budgetUsedPercentage > 70 ? 'bg-orange-400' : 'bg-emerald-500'
                            }`}
                        style={{ width: `${stats.budgetUsedPercentage}%` }}
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/admin/treasury/movements" className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group">
                    <TrendingUp className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Registrar Ingreso
                </Link>
                <Link href="/admin/treasury/movements" className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group">
                    <TrendingDown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Registrar Egreso
                </Link>
                <button
                    onClick={() => setShowExport(true)}
                    className="p-4 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-zinc-800 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
                >
                    <FileText className="w-6 h-6 text-tdf-blue group-hover:scale-110 transition-transform" />
                    Exportar Cierre
                </button>
                <button className="p-4 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-zinc-800 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group opacity-50 cursor-not-allowed">
                    <Landmark className="w-6 h-6 text-slate-400" />
                    Conciliación
                </button>
            </div>
        </div>
    )
}
