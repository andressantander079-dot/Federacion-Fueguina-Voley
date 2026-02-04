'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import ExpenseForm from '@/components/treasury/ExpenseForm'
import IncomeForm from '@/components/treasury/IncomeForm'

export default function TreasuryMovementsPage() {
    const supabase = createClient()
    const [movements, setMovements] = useState<any[]>([])
    const [view, setView] = useState<'LIST' | 'NEW_EXPENSE' | 'NEW_INCOME'>('LIST')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (view === 'LIST') fetchMovements()
    }, [view])

    async function fetchMovements() {
        setLoading(true)
        const { data } = await supabase
            .from('treasury_movements')
            .select(`
                *,
                treasury_accounts (name, code),
                treasury_cost_centers (name)
            `)
            .order('date', { ascending: false })
            .limit(50)

        if (data) setMovements(data)
        setLoading(false)
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin/treasury" className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                        <ArrowLeft className="w-6 h-6 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
                            {view === 'LIST' ? 'Movimientos' : view === 'NEW_EXPENSE' ? 'Nuevo Egreso' : 'Nuevo Ingreso'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {view === 'LIST' ? 'Historial de transacciones.' : 'Complete el formulario.'}
                        </p>
                    </div>
                </div>

                {view === 'LIST' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('NEW_INCOME')}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <TrendingUp className="w-4 h-4" /> Ingreso
                        </button>
                        <button
                            onClick={() => setView('NEW_EXPENSE')}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <TrendingDown className="w-4 h-4" /> Egreso
                        </button>
                    </div>
                )}
            </div>

            {/* Content Switcher */}
            {view === 'LIST' ? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">

                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                placeholder="Buscar movimientos..."
                                className="w-full pl-10 p-2 text-sm rounded-lg bg-gray-50 dark:bg-zinc-800/50 border-none focus:ring-0"
                            />
                        </div>
                        <button className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Descripción</th>
                                    <th className="p-4">Entidad</th>
                                    <th className="p-4 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {movements.map(mov => (
                                    <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors group">
                                        <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(mov.date).toLocaleDateString('es-AR')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${mov.type === 'INGRESO' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {mov.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{mov.description || '-'}</div>
                                            <div className="text-xs text-slate-400 font-mono">{mov.treasury_accounts?.code} - {mov.treasury_accounts?.name}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                                            {mov.entity_name}
                                            {mov.tax_id && <span className="block text-[10px] text-slate-400">{mov.tax_id}</span>}
                                        </td>
                                        <td className={`p-4 text-right font-bold font-mono ${mov.type === 'INGRESO' ? 'text-emerald-500' : 'text-red-500'
                                            }`}>
                                            {mov.type === 'EGRESO' ? '-' : '+'} $ {mov.amount.toLocaleString('es-AR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {movements.length === 0 && !loading && (
                            <div className="p-8 text-center text-slate-400 text-sm">No hay movimientos registrados.</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm p-4 md:p-8 border border-gray-100 dark:border-zinc-800 max-w-3xl mx-auto">
                    {view === 'NEW_EXPENSE' ? (
                        <ExpenseForm onSuccess={() => setView('LIST')} />
                    ) : (
                        <IncomeForm onSuccess={() => setView('LIST')} />
                    )}
                </div>
            )}
        </div>
    )
}
