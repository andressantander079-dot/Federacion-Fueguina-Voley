'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, MoreHorizontal, User } from 'lucide-react'

export default function SentMessagesPage() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSent()
    }, [])

    const fetchSent = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('messages')
            .select(`
                *,
                recipients:message_recipients(count)
            `)
            .eq('sender_id', user.id)
            .order('created_at', { ascending: false })

        setMessages(data || [])
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando enviados...</div>

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Mensajes Enviados</h2>

            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 text-slate-400">
                        No has enviado ningún comunicado aún.
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black border ${msg.priority === 'urgente' ? 'bg-red-50 text-red-600 border-red-100' :
                                            msg.priority === 'importante' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                        {msg.priority}
                                    </span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock size={12} /> {new Date(msg.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {/* <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal size={16}/></button> */}
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-tdf-blue transition-colors">{msg.subject}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4">{msg.body}</p>

                            <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pt-4 border-t border-slate-100 dark:border-white/5">
                                <span className="flex items-center gap-1">
                                    <User size={14} /> {msg.recipients[0]?.count || 0} Destinatarios
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600">
                                    <CheckCircle2 size={14} /> Enviado correctamente
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
