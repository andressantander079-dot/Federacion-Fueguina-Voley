'use client'

import React, { useState } from 'react'
import { Download, Loader2, FileArchive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver' // Need to check if file-saver is installed, if not use native DOM
// If file-saver not available, simple anchor approach works.

export default function MonthEndExport() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    const handleExport = async () => {
        setLoading(true)
        try {
            const [year, monthNum] = month.split('-')

            // 1. Fetch Data
            const startDate = `${month}-01`
            const endDate = `${month}-31` // Loose end date, postgres handles it or we can be precise

            const { data: movements, error } = await supabase
                .from('treasury_movements')
                .select(`
                    *,
                    treasury_accounts (code, name),
                    treasury_cost_centers (name)
                `)
                .gte('date', startDate)
                .lte('date', endDate)

            if (error) throw error
            if (!movements || movements.length === 0) {
                alert('No hay movimientos en este período.')
                setLoading(false)
                return
            }

            const zip = new JSZip()
            const folderName = `Cierre_Mes_${month}`
            const folder = zip.folder(folderName)

            // 2. Generate CSV (Libro IVA)
            const csvRows = [
                ['Fecha', 'Tipo', 'Comprobante/CUIT', 'Entidad', 'Descripcion', 'Cuenta', 'Centro Costos', 'Neto', 'IVA', 'Total']
            ]

            movements.forEach(m => {
                const total = m.amount
                const neto = m.type === 'EGRESO' ? (total / 1.21).toFixed(2) : total // Simplificación IVA 21%
                const iva = m.type === 'EGRESO' ? (total - (total / 1.21)).toFixed(2) : 0

                csvRows.push([
                    m.date.split('T')[0],
                    m.type,
                    m.tax_id || '-',
                    `"${m.entity_name}"`, // Quote to avoid CSV break
                    `"${m.description || ''}"`,
                    m.treasury_accounts?.code || 'S/C',
                    m.treasury_cost_centers?.name || 'General',
                    neto,
                    iva,
                    total
                ])
            })

            const csvContent = csvRows.map(e => e.join(',')).join('\n')
            folder?.file('Libro_IVA_Compras_Ventas.csv', csvContent)

            // 3. Generate Excel (Reporte de Caja)
            const ws = XLSX.utils.json_to_sheet(movements.map(m => ({
                Fecha: m.date.split('T')[0],
                Tipo: m.type,
                Monto: m.amount,
                Entidad: m.entity_name,
                CUIT: m.tax_id,
                Cuenta: `${m.treasury_accounts?.code} - ${m.treasury_accounts?.name}`,
                Centro_Costos: m.treasury_cost_centers?.name,
                Comprobante_URL: m.proof_url ? `VER LINK` : '' // In real XL, use hyperlinks
            })))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Movimientos")
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
            folder?.file('Reporte_Caja.xlsx', excelBuffer)

            // 4. Generate TXT (Fiscal Export Flat File)
            // Estructura ficticia para aplicativo: CUIT(11) + FECHA(8) + MONTO(15)
            let txtContent = ''
            movements.filter(m => m.type === 'EGRESO').forEach(m => {
                const cuit = (m.tax_id || '00000000000').replace(/-/g, '').padEnd(11, '0').slice(0, 11)
                const fecha = m.date.slice(0, 10).replace(/-/g, '') // YYYYMMDD
                const monto = m.amount.toFixed(2).replace('.', '').padStart(15, '0')
                txtContent += `${cuit}${fecha}${monto}\n`
            })
            folder?.file('Exportacion_Impositiva.txt', txtContent)

            // 5. Generate PDF Placeholder (Reporte Comprobantes)
            // Para el PDF consolidado real se necesitaría procesar imágenes.
            // Aquí creamos un índice de comprobantes en texto como placeholder de "Merging"
            let readmeContent = `REPORTE DE COMPROBANTES - PERIOD ${month}\n\n`
            movements.forEach(m => {
                if (m.proof_url) {
                    readmeContent += `[${m.date.slice(0, 10)}] $${m.amount} - ${m.entity_name}: ${m.proof_url}\n`
                }
            })
            folder?.file('Indice_Comprobantes.txt', readmeContent)

            // Zip Generation
            const content = await zip.generateAsync({ type: 'blob' })

            // Download (Simple Native approach to avoid 'file-saver' dependency check)
            const url = window.URL.createObjectURL(content)
            const a = document.createElement('a')
            a.href = url
            a.download = `Cierre_Tesorería_${month}.zip`
            a.click()
            window.URL.revokeObjectURL(url)

        } catch (err) {
            console.error(err)
            alert('Error generando el cierre.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-tdf-blue/10 rounded-xl text-tdf-blue">
                    <FileArchive className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Exportar Cierre Mensual</h3>
                    <p className="text-xs text-slate-500">Genera el paquete ZIP para el estudio contable.</p>
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-bold"
                />
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Generando...' : 'Descargar ZIP'}
                </button>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
                <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-slate-500 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700">Libro_IVA.csv</span>
                <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-slate-500 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700">Reporte_Caja.xlsx</span>
                <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-slate-500 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700">Fiscal.txt</span>
            </div>
        </div>
    )
}
