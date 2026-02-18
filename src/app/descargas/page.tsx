'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { FileText, Download } from 'lucide-react'

export default function DescargasPage() {
    const [docs, setDocs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchDocs = async () => {
            const { data } = await supabase
                .from('documents')
                .select('*')
                // Fetch everything that IS NOT strictly 'reglamento' (which has its own page), 
                // or just fetch specific types. Let's fetch 'descarga' and 'ficha_medica'.
                .in('type', ['descarga', 'ficha_medica'])
                .order('created_at', { ascending: false })

            if (data) setDocs(data)
            setLoading(false)
        }
        fetchDocs()
    }, [supabase])

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-100 flex flex-col">
            <Navbar />
            <main className="flex-grow pt-28 px-6 max-w-7xl mx-auto w-full">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                        Descargas <span className="text-tdf-blue">Oficiales</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                        Documentación, formularios y planillas para clubes y jugadores.
                    </p>
                </header>

                {loading ? (
                    <div className="text-center py-12 text-gray-500 animate-pulse">Cargando descargas...</div>
                ) : docs.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No hay documentos disponibles para descargar.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {docs.map(doc => (
                            <div key={doc.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-6 rounded-2xl hover:shadow-lg transition-all group cursor-pointer h-full flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-600 dark:text-white group-hover:bg-tdf-orange group-hover:text-white transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-white/5 rounded text-slate-500 uppercase tracking-wide">
                                        {doc.type.replace('_', ' ')}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 group-hover:text-tdf-orange transition-colors flex-grow">
                                    {doc.title}
                                </h3>

                                <a
                                    href={doc.file_url}
                                    target="_blank"
                                    className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-tdf-blue font-bold transition-colors w-full"
                                >
                                    <Download size={16} /> Descargar Archivo
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}
