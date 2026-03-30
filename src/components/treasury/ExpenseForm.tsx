'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, AlertCircle, Check, DollarSign, Calendar, Building, FileText, Briefcase } from 'lucide-react'

export default function ExpenseForm({ onSuccess }: { onSuccess: () => void }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [accounts, setAccounts] = useState<any[]>([])
    const [costCenters, setCostCenters] = useState<any[]>([])

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        concept: '', // Selector de concepto
        tax_id: '', // CUIT/RUT Obligatorio
        entity_name: '', // Proveedor Obligatorio
        account_id: '',
        cost_center_id: ''
    })

    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function fetchOptions() {
            const { data: accData } = await supabase.from('treasury_accounts').select('*').eq('type', 'EGRESO')
            const { data: ccData } = await supabase.from('treasury_cost_centers').select('*')
            if (accData) setAccounts(accData)
            if (ccData) setCostCenters(ccData)
        }
        fetchOptions()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // 1. Fiscal Validation Rule
        if (!formData.tax_id || !formData.entity_name || !formData.amount || !formData.account_id) {
            setError('Faltan datos fiscales obligatorios (CUIT, Proveedor, Cuenta o Monto).')
            setLoading(false)
            return
        }

        try {
            // 2. Upload File (Si existe)
            let proof_url = null
            if (file) {
                const fileExt = file.name.split('.').pop() || '';
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `treasury/${fileName}`

                const { error: uploadError } = await supabase.storage.from('private_docs').upload(filePath, file, { 
                    upsert: true,
                    contentType: file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg') 
                })
                if (uploadError) throw uploadError
                proof_url = filePath
            }

            // 3. Insert Movement
            const baseDescription = formData.concept === 'Otros'
                ? formData.description
                : `${formData.concept} - ${formData.description}`;

            const { error: insertError } = await supabase.from('treasury_movements').insert([{
                type: 'EGRESO',
                amount: parseFloat(formData.amount.replace(/\./g, '').replace(',', '.') || '0'),
                date: formData.date,
                description: baseDescription,
                tax_id: formData.tax_id,
                entity_name: formData.entity_name,
                account_id: formData.account_id,
                cost_center_id: formData.cost_center_id || null,
                proof_url: proof_url,
                created_by: (await supabase.auth.getUser()).data.user?.id
            }])

            if (insertError) throw insertError

            onSuccess()
            setFormData({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                concept: '',
                tax_id: '',
                entity_name: '',
                account_id: '',
                cost_center_id: ''
            })
            setFile(null)

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al guardar el egreso.')
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

                {/* Columna 1: Datos Fiscales */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                        Datos Fiscales
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">CUIT / RUT <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                required
                                value={formData.tax_id}
                                onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                                placeholder="20-12345678-9"
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">En concepto de... <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={formData.concept}
                            onChange={e => setFormData({ ...formData, concept: e.target.value })}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all text-sm appearance-none"
                        >
                            <option value="">Seleccione un concepto</option>
                            <option value="Honorarios Arbitrales">Honorarios Arbitrales</option>
                            <option value="Servicios/Mantenimiento">Servicios / Mantenimiento</option>
                            <option value="Equipamiento">Compra de Equipamiento</option>
                            <option value="Reintegros">Reintegros</option>
                            <option value="Otros">Otros (Especifique proveedor)</option>
                        </select>
                    </div>

                    {formData.concept === 'Otros' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Razón Social / Proveedor <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    value={formData.entity_name}
                                    onChange={e => setFormData({ ...formData, entity_name: e.target.value })}
                                    placeholder="Nombre del proveedor"
                                    className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Comprobante (PDF/Foto)</label>
                        <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-zinc-700 border-dashed rounded-xl appearance-none cursor-pointer hover:border-tdf-blue focus:outline-none">
                            <div className="flex flex-col items-center space-y-2">
                                {file ? (
                                    <>
                                        <Check className="w-8 h-8 text-emerald-500" />
                                        <span className="font-medium text-gray-600 dark:text-gray-400 text-xs">{file.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-gray-400" />
                                        <span className="font-medium text-gray-600 dark:text-gray-400 text-xs">Subir Factura</span>
                                    </>
                                )}
                            </div>
                            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>
                </div>

                {/* Columna 2: Datos Contables */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                        Imputación Contable
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Monto Total <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">ARS $</div>
                            <input
                                type="text"
                                required
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0"
                                className="w-full pl-16 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all text-lg font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all text-xs"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Centro Costos</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    value={formData.cost_center_id}
                                    onChange={e => setFormData({ ...formData, cost_center_id: e.target.value })}
                                    className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all text-xs appearance-none"
                                >
                                    <option value="">General</option>
                                    {costCenters.map(cc => (
                                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Cuenta Contable <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                required
                                value={formData.account_id}
                                onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all text-xs appearance-none"
                            >
                                <option value="">Seleccionar Cuenta...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalle del gasto..."
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 focus:ring-2 focus:ring-tdf-blue outline-none transition-all text-sm h-24 resize-none"
                        />
                    </div>
                </div>
            </div>

            <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black shadow-lg shadow-red-600/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
            >
                {loading ? 'Procesando...' : 'Registrar Egreso Fiscal'}
            </button>
        </form>
    )
}
