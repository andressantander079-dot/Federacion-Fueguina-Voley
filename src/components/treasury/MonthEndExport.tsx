'use client'

import React, { useState } from 'react'
import { Download, Loader2, FileArchive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'
// Removed 'file-saver' dependency from imports as we use native Blob download

export default function MonthEndExport() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    const handleExport = async () => {
        setLoading(true)
        try {
            const [year, monthNum] = month.split('-')
            const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate()

            // 1. Fetch Data
            const startDate = `${month}-01`
            const endDate = `${month}-${lastDay}`

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
                const total = Number(m.amount || 0)
                const neto = m.type === 'EGRESO' ? (total / 1.21).toFixed(2) : total.toFixed(2)
                const iva = m.type === 'EGRESO' ? (total - (total / 1.21)).toFixed(2) : "0.00"

                csvRows.push([
                    m.date.split('T')[0],
                    m.type,
                    m.tax_id || '-',
                    `"${m.entity_name}"`,
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

            // 3. Generate Excel (Reporte de Caja) using ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Movimientos');

            // Define Columns
            worksheet.columns = [
                { header: 'Fecha', key: 'fecha', width: 12 },
                { header: 'Tipo', key: 'tipo', width: 10 },
                { header: 'Monto', key: 'monto', width: 15 },
                { header: 'Entidad', key: 'entidad', width: 25 },
                { header: 'CUIT', key: 'cuit', width: 15 },
                { header: 'Cuenta', key: 'cuenta', width: 25 },
                { header: 'Centro Costos', key: 'centro', width: 20 },
                { header: 'Comprobante', key: 'comprobante', width: 30 }
            ];

            // Style Header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add Rows
            movements.forEach(m => {
                const row = worksheet.addRow({
                    fecha: m.date.split('T')[0],
                    tipo: m.type,
                    monto: m.amount,
                    entidad: m.entity_name,
                    cuit: m.tax_id,
                    cuenta: `${m.treasury_accounts?.code || ''} - ${m.treasury_accounts?.name || ''}`,
                    centro: m.treasury_cost_centers?.name,
                    comprobante: m.proof_url || ''
                });

                // Conditional Formatting for Amount
                if (m.type === 'INGRESO') {
                    row.getCell('monto').font = { color: { argb: 'FF006400' } }; // Green
                } else {
                    row.getCell('monto').font = { color: { argb: 'FF8B0000' } }; // Red
                }

                if (m.proof_url) {
                    row.getCell('comprobante').value = { text: 'Ver Comprobante', hyperlink: m.proof_url };
                    row.getCell('comprobante').font = { color: { argb: 'FF0000FF' }, underline: true };
                }
            });

            const excelBuffer = await workbook.xlsx.writeBuffer();
            folder?.file('Reporte_Caja.xlsx', excelBuffer);

            // 4. Generate TXT (Fiscal Export Flat File)
            let txtContent = ''
            movements.filter(m => m.type === 'EGRESO').forEach(m => {
                const cuit = String(m.tax_id || '00000000000').replace(/-/g, '').padEnd(11, '0').slice(0, 11)
                const fecha = m.date.slice(0, 10).replace(/-/g, '')
                const monto = Number(m.amount || 0).toFixed(2).replace('.', '').padStart(15, '0')
                txtContent += `${cuit}${fecha}${monto}\n`
            })
            folder?.file('Exportacion_Impositiva.txt', txtContent)

            // 5. Generate PDF Placeholder
            let readmeContent = `REPORTE DE COMPROBANTES - PERIODO ${month}\n\n`
            movements.forEach(m => {
                if (m.proof_url) {
                    readmeContent += `[${m.date.slice(0, 10)}] $${m.amount} - ${m.entity_name}: ${m.proof_url}\n`
                }
            })
            folder?.file('Indice_Comprobantes.txt', readmeContent)

            // Zip Generation
            const content = await zip.generateAsync({ type: 'blob' })

            // Download
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
