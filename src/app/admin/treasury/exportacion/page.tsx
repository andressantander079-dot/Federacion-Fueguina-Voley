'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import MonthEndExport from '@/components/treasury/MonthEndExport'

export default function ExportacionPage() {
    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black text-slate-800 dark:text-white pb-24">
            <header className="mb-8 flex items-center gap-4">
                <Link href="/admin/treasury" className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <FileText className="w-8 h-8 text-fuchsia-500" />
                        Exportación Contable
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Cierre mensual y exportación de reportes fiscales.
                    </p>
                </div>
            </header>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm p-4 md:p-8 border border-gray-100 dark:border-zinc-800 max-w-3xl mx-auto">
                <MonthEndExport />
            </div>
        </div>
    )
}
