
'use client'

import React from 'react'
import { Calendar } from 'lucide-react'

// TODO: Type en definitions
interface NewsItem {
    id: string
    title: string
    content?: string
    image_url: string
    created_at: string
}

const MOCK_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'Final del Torneo Apertura 2026',
        content: 'Se juega este fin de semana en el polideportivo municipal.',
        image_url: 'https://placehold.co/600x600?text=Final+Apertura',
        created_at: '2026-01-20T10:00:00Z'
    },
    {
        id: '2',
        title: 'Nuevas reglas de jugabilidad',
        content: 'La FIVB ha actualizado el reglamento para la temporada.',
        image_url: 'https://placehold.co/600x600?text=Reglamento',
        created_at: '2026-01-18T15:30:00Z'
    },
    {
        id: '3',
        title: 'Convocatoria Selección Sub-18',
        content: 'Lista de convocados para el entrenamiento del martes.',
        image_url: 'https://placehold.co/600x600?text=Seleccion',
        created_at: '2026-01-15T09:00:00Z'
    }
]

export default function NewsFeed() {
    return (
        <section className="py-24 bg-gray-50 dark:bg-zinc-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-16">
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                        Novedades
                    </h2>
                    <a href="/noticias" className="group flex items-center gap-2 text-tdf-blue hover:text-tdf-orange font-bold text-sm transition-colors border border-tdf-blue/30 px-4 py-2 rounded-full hover:bg-white">
                        Ver todas
                        <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {MOCK_NEWS.map((item) => (
                        <NewsCard key={item.id} news={item} />
                    ))}
                </div>
            </div>
        </section>
    )
}

function NewsCard({ news }: { news: NewsItem }) {
    return (
        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 group flex flex-col h-full">
            {/* Imagen Aspect Ratio 16:9 (más compacta) */}
            <div className="aspect-video overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                <img
                    src={news.image_url}
                    alt={news.title}
                    className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                />
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-[10px] text-tdf-orange font-bold uppercase tracking-wider mb-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(news.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-tdf-blue transition-colors">
                    {news.title}
                </h3>

                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-3 mb-4 flex-grow">
                    {news.content}
                </p>

                <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-gray-400 group-hover:text-tdf-orange transition-colors">Leer más</span>
                </div>
            </div>
        </div>
    )
}
