'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Save, Loader2, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CreateNewsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [imageUrl, setImageUrl] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // TODO: Implementar inserción real en Supabase
            // await supabase.from('news').insert([{ title, content, image_url: imageUrl }])

            // Simular delay
            await new Promise(resolve => setTimeout(resolve, 1000))

            router.push('/admin/noticias')
        } catch (error) {
            console.error(error)
            alert('Error al crear la noticia')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/noticias"
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <ChevronLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nueva Noticia</h1>
                    <p className="text-gray-500 mt-1">Publica información relevante para la comunidad.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 p-8 space-y-6">

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Título</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-white dark:bg-zinc-800 transition-all text-lg font-medium"
                        placeholder="Ej: Final del Torneo Apertura"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Imagen de Portada (URL)</label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-white dark:bg-zinc-800 transition-all font-mono text-sm"
                                placeholder="https://..."
                            />
                        </div>
                        {imageUrl && (
                            <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-400">Por ahora usa una URL externa (ej. Unsplash).</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Contenido</label>
                    <textarea
                        required
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-white dark:bg-zinc-800 transition-all resize-none"
                        placeholder="Escribe el cuerpo de la noticia..."
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                    <Link
                        href="/admin/noticias"
                        className="px-6 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-bold transition-colors"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Publicar Noticia
                    </button>
                </div>

            </form>
        </div>
    )
}
