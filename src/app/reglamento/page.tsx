'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { FileText, Download, Shield } from 'lucide-react'

export default function ReglamentoPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDocs = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('type', 'reglamento')
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tdf-blue rounded-2xl mb-6 shadow-lg rotate-3 text-white">
            <Shield size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
            Reglamento <span className="text-tdf-orange">Oficial</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Normativas vigentes para la temporada 2026. Es responsabilidad de todos los equipos conocer y respetar estas reglas.
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando reglamentos...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No hay reglamentos cargados actualmente.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {docs.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/10 rounded-xl flex items-center justify-center text-tdf-blue dark:text-white group-hover:bg-tdf-blue group-hover:text-white transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-tdf-blue dark:group-hover:text-tdf-orange transition-colors">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Actualizado: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    className="p-3 bg-slate-50 dark:bg-black rounded-lg text-slate-400 hover:text-tdf-blue hover:scale-105 transition-all"
                    title="Descargar PDF"
                  >
                    <Download size={20} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}