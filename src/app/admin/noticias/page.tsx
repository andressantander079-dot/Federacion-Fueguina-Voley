'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Loader2, Image as ImageIcon, Archive, RefreshCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Tipo básico para Noticias
type News = {
    id: string
    title: string
    created_at: string
    archived: boolean
    image_url: string | null
}

export default function NewsListPage() {
    const [news, setNews] = useState<News[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchNews()
    }, [])

    const fetchNews = async () => {
        try {
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setNews(data || [])
        } catch (error) {
            console.error('Error fetching news:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta noticia para siempre?')) return

        try {
            const { error } = await supabase.from('news').delete().eq('id', id)
            if (error) throw error
            setNews(news.filter(n => n.id !== id))
        } catch (error) {
            alert('Error eliminando noticia')
            console.error(error)
        }
    }

    const handleArchive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('news')
                .update({ archived: !currentStatus })
                .eq('id', id)

            if (error) throw error

            setNews(news.map(n => n.id === id ? { ...n, archived: !currentStatus } : n))
        } catch (error) {
            alert('Error actualizando estado')
            console.error(error)
        }
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Noticias</h1>
                    <p className="text-gray-500 mt-1">Gestiona las novedades que aparecen en la portada.</p>
                </div>
                <Link
                    href="/admin/noticias/crear"
                    className="flex items-center gap-2 px-5 py-2.5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                >
                    <Plus size={20} />
                    Nueva Noticia
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-tdf-blue" />
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Imagen</th>
                                <th className="px-6 py-4">Título</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {news.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        No hay noticias cargadas.
                                    </td>
                                </tr>
                            ) : (
                                news.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400">
                                                    <ImageIcon size={20} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">
                                            {item.title}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.archived ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400">
                                                    <Archive size={12} /> Archivado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <RefreshCcw size={12} /> Publicado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleArchive(item.id, item.archived)}
                                                    title={item.archived ? "Desarchivar" : "Archivar"}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                >
                                                    {item.archived ? <RefreshCcw size={18} /> : <Archive size={18} />}
                                                </button>

                                                <Link
                                                    href={`/admin/noticias/editar/${item.id}`}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 hover:text-blue-700 transition-colors"
                                                >
                                                    <Edit size={18} />
                                                </Link>

                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    title="Eliminar para siempre"
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
