'use client'

import { useState, useEffect } from 'react'
import { Calendar, Heart, Share2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NewsItem {
    id: string
    title: string
    body: string
    image_url: string
    created_at: string
    published_at: string
    likes: number
    category: string
    pinned: boolean
}

export default function NewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function fetchNews() {
            try {
                const { data, error } = await supabase
                    .from('news')
                    .select('id, title, body, image_url, created_at, published_at, likes, category, pinned')
                    .eq('status', 'published')
                    .order('pinned', { ascending: false })
                    .order('published_at', { ascending: false })
                    .limit(6)

                if (error) throw error
                if (data) setNews(data)
            } catch (error) {
                console.error("Error fetching news:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchNews()
    }, [])

    // Actualiza el likes en el array
    const handleLikesChange = (id: string, newCount: number) => {
        setNews(prev => prev.map(n => n.id === id ? { ...n, likes: newCount } : n))
        // Si el modal está abierto con esta noticia, también actualiza
        setSelectedNews(prev => prev?.id === id ? { ...prev, likes: newCount } : prev)
    }

    if (loading) return <div className="p-8 text-center text-white">Cargando noticias...</div>;
    if (news.length === 0) return <div className="p-8 text-center text-slate-500">No hay noticias publicadas</div>;

    return (
        <section className="py-24 bg-gray-50 dark:bg-zinc-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {news.map((item) => (
                        <NewsCard
                            key={item.id}
                            news={item}
                            onClick={() => setSelectedNews(item)}
                            onLikesChange={handleLikesChange}
                        />
                    ))}
                </div>
            </div>

            {/* MODAL DE NOTICIA EXPANDIDA */}
            {selectedNews && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Botón cerrar */}
                        <button
                            onClick={() => setSelectedNews(null)}
                            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {/* Imagen */}
                        <div className="w-full md:w-1/2 h-64 md:h-auto bg-black relative shrink-0">
                            {selectedNews.image_url ? (
                                <img
                                    src={selectedNews.image_url}
                                    alt={selectedNews.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    Sin imagen
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <span className="text-xs font-bold text-white bg-tdf-blue px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                    {selectedNews.category}
                                </span>
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-zinc-900 flex flex-col">
                            <div className="mb-6 flex-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(selectedNews.published_at || selectedNews.created_at).toLocaleDateString('es-AR', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>

                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                                    {selectedNews.title}
                                </h2>

                                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                    <div dangerouslySetInnerHTML={{ __html: selectedNews.body }} />
                                </div>
                            </div>

                            {/* Botones en modal — con likes funcional */}
                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-4">
                                <LikeButton
                                    newsId={selectedNews.id}
                                    initialLikes={selectedNews.likes}
                                    onLikesChange={handleLikesChange}
                                    large
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

// ----- Botón de like reutilizable -----
function LikeButton({
    newsId,
    initialLikes,
    onLikesChange,
    large = false
}: {
    newsId: string
    initialLikes: number
    onLikesChange: (id: string, newCount: number) => void
    large?: boolean
}) {
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(initialLikes)
    const supabase = createClient()

    // Sincronizar si el padre actualiza (ej. se abre el modal con count actualizado)
    useEffect(() => {
        setLikesCount(initialLikes)
    }, [initialLikes])

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const isLiking = !liked
        const newCount = isLiking ? likesCount + 1 : Math.max(0, likesCount - 1)

        setLiked(isLiking)
        setLikesCount(newCount)
        onLikesChange(newsId, newCount)

        try {
            const rpcName = isLiking ? 'increment_likes' : 'decrement_likes'
            const { error } = await supabase.rpc(rpcName, { row_id: newsId })
            if (error) throw error
        } catch (error) {
            console.error("Error toggling like:", error)
            // Revertir
            const revertCount = isLiking ? newCount - 1 : newCount + 1
            setLiked(!isLiking)
            setLikesCount(revertCount)
            onLikesChange(newsId, revertCount)
        }
    }

    if (large) {
        return (
            <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${liked
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-red-500'
                    }`}
            >
                <Heart size={16} className={liked ? "fill-current" : ""} />
                Me gusta ({likesCount})
            </button>
        )
    }

    return (
        <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        >
            <Heart size={16} className={liked ? "fill-current" : ""} />
            {likesCount}
        </button>
    )
}

// ----- Tarjeta de noticia -----
function NewsCard({
    news,
    onClick,
    onLikesChange
}: {
    news: NewsItem
    onClick: () => void
    onLikesChange: (id: string, newCount: number) => void
}) {
    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            if (navigator.share) {
                await navigator.share({
                    title: news.title,
                    text: news.body.replace(/<[^>]+>/g, '').substring(0, 100),
                    url: `${window.location.origin}/noticias/${news.id}`
                })
            } else {
                await navigator.clipboard.writeText(`${window.location.origin}/noticias/${news.id}`)
                alert("Enlace copiado al portapapeles")
            }
        } catch (error) {
            console.error("Error sharing:", error)
        }
    }

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer bg-white dark:bg-black border ${news.pinned ? 'border-tdf-orange shadow-lg ring-1 ring-tdf-orange/20' : 'border-gray-100 dark:border-white/5'} rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col h-full relative`}
        >
            {news.pinned && (
                <div className="absolute top-0 right-0 z-30 bg-tdf-orange text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                    DESTACADO
                </div>
            )}

            <div className="aspect-video overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                <img
                    src={news.image_url || '/placeholder.png'}
                    alt={news.title}
                    className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                />
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-tdf-blue bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {news.category || 'Novedades'}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        {new Date(news.published_at || news.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-tdf-blue transition-colors line-clamp-2">
                    {news.title}
                </h3>

                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-3 mb-4 flex-grow">
                    {news.body.replace(/<[^>]+>/g, '').substring(0, 150)}...
                </p>

                <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <LikeButton
                        newsId={news.id}
                        initialLikes={news.likes}
                        onLikesChange={onLikesChange}
                    />
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-tdf-blue transition-colors"
                    >
                        <Share2 size={16} />
                        Compartir
                    </button>
                </div>
            </div>
        </div>
    )
}
