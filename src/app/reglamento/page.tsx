'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Search } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

type Document = {
  id: string
  title: string
  file_url: string
  type: 'reglamento' | 'descarga' | 'ficha_medica'
  created_at: string
  archived: boolean
}

const DOC_TYPES = [
  { value: 'reglamento', label: 'Reglamentos Oficiales', color: 'bg-blue-100 text-blue-600' },
  { value: 'descarga', label: 'Descargas Generales', color: 'bg-orange-100 text-orange-600' },
  { value: 'ficha_medica', label: 'Fichas Médicas', color: 'bg-green-100 text-green-600' }
]

export default function PublicReglamentosPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function fetchDocs() {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('archived', false) // Only active docs
        .order('created_at', { ascending: false })

      if (data) setDocs(data as Document[])
      setLoading(false)
    }
    fetchDocs()
  }, [])

  const filteredDocs = filter === 'all' ? docs : docs.filter(d => d.type === filter)

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans text-slate-800 dark:text-slate-100">
      <Navbar />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
              Reglamentos y <span className="text-tdf-orange">Descargas</span>
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Accede a toda la documentación oficial, reglamentos de competencia y formularios necesarios para la temporada.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'all'
                ? 'bg-slate-900 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-zinc-800'
                }`}
            >
              Todos
            </button>
            {DOC_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={`px-6 py-2 rounded-full font-bold transition-all ${filter === type.value
                  ? 'bg-tdf-blue text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-zinc-800'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-20 text-gray-400">Cargando documentación...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No hay documentos disponibles en esta categoría.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredDocs.map(doc => {
                const typeInfo = DOC_TYPES.find(t => t.value === doc.type) || DOC_TYPES[0]
                return (
                  <div key={doc.id} className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${typeInfo.color}`}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1 block">
                          {typeInfo.label}
                        </span>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-tdf-blue transition-colors">
                          {doc.title}
                        </h3>
                        <span className="text-xs text-gray-400">
                          Publicado: {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:bg-tdf-orange hover:text-white transition-all transform hover:scale-110 shadow-sm"
                      title="Descargar PDF"
                    >
                      <Download size={20} />
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}