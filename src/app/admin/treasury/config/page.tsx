'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Trash2, Plus, Building2, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Account {
    id: string
    code: string
    name: string
    type: string
}

interface CostCenter {
    id: string
    name: string
    budget_allocated: number
}

export default function TreasuryConfigPage() {
    const supabase = createClient()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])
    const [loading, setLoading] = useState(true)

    // Form States
    const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'EGRESO' })
    const [newCostCenter, setNewCostCenter] = useState({ name: '', budget_allocated: 0 })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const { data: accData } = await supabase.from('treasury_accounts').select('*').order('code')
        const { data: ccData } = await supabase.from('treasury_cost_centers').select('*').order('name')

        if (accData) setAccounts(accData)
        if (ccData) setCostCenters(ccData)
        setLoading(false)
    }

    async function handleCreateAccount() {
        if (!newAccount.code || !newAccount.name) return
        const { error } = await supabase.from('treasury_accounts').insert([newAccount])
        if (!error) {
            setNewAccount({ code: '', name: '', type: 'EGRESO' })
            fetchData()
        }
    }

    async function handleCreateCostCenter() {
        if (!newCostCenter.name) return
        const { error } = await supabase.from('treasury_cost_centers').insert([newCostCenter])
        if (!error) {
            setNewCostCenter({ name: '', budget_allocated: 0 })
            fetchData()
        }
    }

    async function handleDeleteAccount(id: string) {
        if (!confirm('¿Seguro que desea eliminar esta cuenta?')) return
        await supabase.from('treasury_accounts').delete().eq('id', id)
        fetchData()
    }

    async function handleDeleteCostCenter(id: string) {
        if (!confirm('¿Seguro que desea eliminar este centro de costos?')) return
        await supabase.from('treasury_cost_centers').delete().eq('id', id)
        fetchData()
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black">

            {/* Header */}
            <header className="mb-8 flex items-center gap-4">
                <Link href="/admin/treasury" className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">Configuración Estructural</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Plan de Cuentas y Centros de Costos.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Plan de Cuentas */}
                <section className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm p-6 border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Plan de Cuentas</h2>
                    </div>

                    {/* Form */}
                    <div className="grid grid-cols-12 gap-2 mb-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                        <div className="col-span-3">
                            <input
                                placeholder="Código"
                                value={newAccount.code}
                                onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                                className="w-full p-2 text-sm rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                        </div>
                        <div className="col-span-5">
                            <input
                                placeholder="Nombre Cuenta"
                                value={newAccount.name}
                                onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                className="w-full p-2 text-sm rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                        </div>
                        <div className="col-span-3">
                            <select
                                value={newAccount.type}
                                onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}
                                className="w-full p-2 text-sm rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            >
                                <option value="INGRESO">Ingreso</option>
                                <option value="EGRESO">Egreso</option>
                                <option value="ACTIVO">Activo</option>
                                <option value="PASIVO">Pasivo</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <button
                                onClick={handleCreateAccount}
                                className="w-full h-full flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {accounts.map(acc => (
                            <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 group border border-transparent hover:border-gray-100 dark:hover:border-zinc-700 transition-all">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{acc.code}</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{acc.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${acc.type === 'INGRESO' ? 'bg-emerald-100 text-emerald-600' :
                                            acc.type === 'EGRESO' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {acc.type}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteAccount(acc.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Centros de Costos */}
                <section className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm p-6 border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-xl text-pink-600">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Centros de Costos</h2>
                    </div>

                    {/* Form */}
                    <div className="grid grid-cols-12 gap-2 mb-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                        <div className="col-span-7">
                            <input
                                placeholder="Nombre (ej: Selección Sub-18)"
                                value={newCostCenter.name}
                                onChange={e => setNewCostCenter({ ...newCostCenter, name: e.target.value })}
                                className="w-full p-2 text-sm rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                        </div>
                        <div className="col-span-4">
                            <input
                                type="number"
                                placeholder="Presupuesto"
                                value={newCostCenter.budget_allocated}
                                onChange={e => setNewCostCenter({ ...newCostCenter, budget_allocated: parseFloat(e.target.value) })}
                                className="w-full p-2 text-sm rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                        </div>
                        <div className="col-span-1">
                            <button
                                onClick={handleCreateCostCenter}
                                className="w-full h-full flex items-center justify-center bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {costCenters.map(cc => (
                            <div key={cc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 group border border-transparent hover:border-gray-100 dark:hover:border-zinc-700 transition-all">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cc.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-slate-500">
                                        $ {cc.budget_allocated?.toLocaleString('es-AR')}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteCostCenter(cc.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    )
}
