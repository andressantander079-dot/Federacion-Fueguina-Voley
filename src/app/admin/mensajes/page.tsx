'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Mail, User, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

// Simularemos que 'Solicitudes' viene de la tabla 'tickets' o 'consultas'
// Si no existe, podemos crearla o usar una estructura genérica.
// Por ahora, asumiré que queremos listar mensajes entrantes type='consulta' de la tabla 'messages'
// O si prefieren tickets, usar tickets. Usaré 'messages' con type='consulta' para unificar el sistema.

export default function InboxPage() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const supabase = createClient()

    useEffect(() => {
        fetchInbox()
    }, [])

    const fetchInbox = async () => {
        // En un sistema real, esto traería mensajes donde el destinatario es el Admin
        // O mensajes de tipo 'consulta' enviados por clubes.
        // Como acabamos de crear la tabla, quizás esté vacía.
        const { data } = await supabase
            .from('messages')
            .select(`
                *,
                sender:profiles(email, club_id, full_name)
            `)
            .eq('type', 'consulta') // Mensajes entrantes
            .order('created_at', { ascending: false })

        if (data) setMessages(data)
        setLoading(false)
    }

    const filteredMessages = messages.filter(m =>
        m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando bandeja...</div>

    return (
        <div className="flex h-full bg-slate-50 dark:bg-black/20">
            {/* Sidebar List */}
            <div className="w-full md:w-1/3 min-w-[320px] bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-white/5 flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar solicitud..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tdf-orange border border-transparent focus:border-transparent dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredMessages.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm p-4">
                            <Mail size={32} className="mx-auto mb-2 opacity-50" />
                            {messages.length === 0 ? "No hay solicitudes nuevas." : "No se encontraron resultados."}
                        </div>
                    ) : (
                        filteredMessages.map((msg) => (
                            <div key={msg.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors group border border-transparent hover:border-slate-100 dark:hover:border-white/5 relative">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{msg.sender?.full_name || 'Usuario'}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(msg.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-xs font-bold text-tdf-blue dark:text-tdf-orange mb-1 truncate">{msg.subject}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2">
                                    {msg.body}
                                </p>
                                {msg.read_at && <div className="absolute right-4 bottom-4 w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detail View (Placeholder for now) */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50/50 dark:bg-transparent">
                <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Mail size={40} className="opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-slate-400 dark:text-slate-500">Selecciona una solicitud</h3>
                <p className="text-sm">Para ver el detalle y responder</p>
            </div>
        </div>
    )
}