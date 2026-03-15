'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, AlertCircle, Check, DollarSign, Calendar, Building2, Gavel, Bell } from 'lucide-react'

export default function IncomeForm({ onSuccess }: { onSuccess: () => void }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [accounts, setAccounts] = useState<any[]>([])

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        entity_name: '', // Entidad (Gobierno/Sponsor)
        account_id: '',
        deadline_date: '' // Fecha límite rendición (Alerta)
    })

    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function fetchOptions() {
            // Cuentas de tipo INGRESO
            const { data: accData } = await supabase.from('treasury_accounts').select('*').eq('type', 'INGRESO')
            if (accData) setAccounts(accData)
        }
        fetchOptions()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (!formData.entity_name || !formData.amount || !formData.account_id) {
            setError('Faltan datos obligatorios.')
            setLoading(false)
            return
        }

        try {
            // 1. Upload Contract (Repo Legal)
            let proof_url = null
            if (file) {
                const fileExt = file.name.split('.').pop()
                const fileName = `contracts/${Math.random()}.${fileExt}`
                const filePath = `treasury/${fileName}`

                const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
                if (uploadError) throw uploadError
                proof_url = filePath
            }

            // 2. Insert Movement
            // Nota: Podríamos guardar la deadline_date en un campo de metadata o description por ahora si no hay columna
            // Asumiremos que description incluye la alerta por simplificación inicial
            const fullDescription = formData.deadline_date
                ? `${formData.description} [Rendición Límite: ${formData.deadline_date}]`
                : formData.description

            const { error: insertError } = await supabase.from('treasury_movements').insert([{
                type: 'INGRESO',
                amount: parseFloat(formData.amount.replace(/\./g, '').replace(',', '.') || '0'),
                date: formData.date,
                description: fullDescription,
                entity_name: formData.entity_name,
                account_id: formData.account_id,
                proof_url: proof_url,
                created_by: (await supabase.auth.getUser()).data.user?.id
            }])

            if (insertError) throw insertError

            onSuccess()
            setFormData({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                entity_name: '',
                account_id: '',
                deadline_date: ''
            })
            setFile(null)

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al guardar el ingreso.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Columna 1: Datos de la Entidad */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                        Origen de Fondos
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Entidad (Gobierno / Sponsor) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                required
                                value={formData.entity_name}
                                onChange={e => setFormData({ ...formData, entity_name: e.target.value })}
                                placeholder="Ej: Gobierno TDF"
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-orange outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Repositorio Legal (Contrato/Convenio)</label>
                        <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-zinc-700 border-dashed rounded-xl appearance-none cursor-pointer hover:border-tdf-orange focus:outline-none">
                            <div className="flex flex-col items-center space-y-2">
                                {file ? (
                                    <>
                                        <Gavel className="w-8 h-8 text-tdf-orange" />
                                        <span className="font-medium text-gray-600 dark:text-gray-400 text-xs">{file.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-gray-400" />
                                        <span className="font-medium text-gray-600 dark:text-gray-400 text-xs">Adjuntar Convenio (PDF)</span>
                                    </>
                                )}
                            </div>
                            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Límite Rendición (Alerta)</label>
                        <div className="relative">
                            <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={formData.deadline_date}
                                onChange={e => setFormData({ ...formData, deadline_date: e.target.value })}
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-red-400 outline-none transition-all text-xs text-red-500 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Columna 2: Datos Financieros */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                        Detalle Financiero
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Monto Ingresado <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">ARS $</div>
                            <input
                                type="text"
                                required
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0"
                                className="w-full pl-16 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-orange outline-none transition-all text-lg font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Ingreso</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-orange outline-none transition-all text-xs"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descripción / Referencia</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalles adicionales..."
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-orange outline-none transition-all text-sm h-24 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Cuenta Destino <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={formData.account_id}
                            onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-orange outline-none transition-all text-xs appearance-none"
                        >
                            <option value="">Seleccionar Cuenta...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                            ))}
                            {accounts.length === 0 && <option disabled>No hay cuentas de Ingreso configuradas</option>}
                        </select>
                    </div>
                </div>
            </div>

            <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
            >
                {loading ? 'Procesando...' : 'Registrar Ingreso'}
            </button>
        </form>
    )
}
