'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingDown } from 'lucide-react'

export default function EgresosPage() {
    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-black text-slate-800 dark:text-white pb-24">
            <header className="mb-8 flex items-center gap-4">
                <Link href="/admin/treasury" className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <TrendingDown className="w-8 h-8 text-red-500" />
                        Egresos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Validación fiscal obligatoria, carga de comprobantes (OCR) y control de gastos.
                    </p>
                </div>
            </header>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm p-8 border border-gray-100 dark:border-zinc-800 text-center">
                <p className="text-slate-400 font-bold">Módulo en construcción.</p>
                <p className="text-slate-500 text-sm mt-2">Aquí trabajaremos los retoques específicos de egresos y facturación.</p>
            </div>
        </div>
    )
}
