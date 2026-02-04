'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Save, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

export default function EditNewsPage() {
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()

    // Form State
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [pageLoading, setPageLoading] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const { data, error } = await supabase
                    .from('news')
                    .select('*')
                    .eq('id', params.id)
                    .single()

                if (error) throw error
                if (data) {
                    setTitle(data.title)
                    setBody(data.body)
                    setImageUrl(data.image_url || '')
                }
            } catch (err) {
                console.error(err)
                setError('No se pudo cargar la noticia')
            } finally {
                setPageLoading(false)
            }
        }
        fetchNews()
    }, [params.id])

    const isValidImage = (url: string) => {
        if (!url) return true;
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !body || !imageUrl) {
            setError('Todos los campos son obligatorios.')
            return
        }

        if (!isValidImage(imageUrl)) {
            setError('La URL de la imagen debe terminar en .jpg, .png o formato válido.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: dbError } = await supabase
                .from('news')
                .update({
                    title,
                    body,
                    image_url: imageUrl
                })
                .eq('id', params.id)

            if (dbError) throw dbError

            router.push('/admin/noticias')
            router.refresh()

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al actualizar la noticia')
        } finally {
            setLoading(false)
        }
    }

    if (pageLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-tdf-blue" /></div>

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <Link href="/admin/noticias" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-6">
                <ArrowLeft size={18} className="mr-2" /> Volver al listado
            </Link>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-slate-100 dark:border-white/5 p-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
                    Editar Noticia
                </h1>

                {error && (
                    <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Título
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none transition-all font-bold text-lg"
                        />
                    </div>

                    {/* Image URL */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            URL de Portada (JPG/PNG)
                        </label>
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none transition-all font-mono text-sm"
                                />
                            </div>
                            {/* Preview */}
                            <div className="w-32 h-24 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                                {imageUrl && isValidImage(imageUrl) ? (
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-slate-300" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Contenido
                        </label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={8}
                            className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 bg-tdf-blue hover:bg-tdf-blue-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
