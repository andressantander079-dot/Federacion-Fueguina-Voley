'use client'

import { Mail, Search, Paperclip } from 'lucide-react'

export default function MessagesPage() {
    return (
        <div className="p-8 h-screen flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Mensajes y Comunicados</h1>

            <div className="flex-1 grid grid-cols-12 gap-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                {/* Conversations List */}
                <div className="col-span-4 border-r border-gray-100 dark:border-white/5 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar mensaje..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tdf-orange"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {/* Mock Items */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-gray-900 dark:text-gray-200 text-sm">Club Galicia</span>
                                    <span className="text-xs text-gray-400">10:4{i} AM</span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 group-hover:text-tdf-blue transition-colors">
                                    Consulta sobre la lista de buena fe del Sub 14...
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="col-span-8 flex flex-col bg-gray-50/50 dark:bg-black/20">
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                            <Mail className="w-8 h-8 opacity-50" />
                        </div>
                        <p>Selecciona un mensaje para leer</p>
                    </div>
                </div>
            </div>
        </div>
    )
}