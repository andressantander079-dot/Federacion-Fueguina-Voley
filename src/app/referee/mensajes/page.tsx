'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Send, CheckCircle, RefreshCw, MessageSquare } from 'lucide-react'

export default function RefereeMessagesPage() {
    const supabase = createClient()
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox')

    // Compose State
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)

    useEffect(() => {
        if (activeTab === 'inbox') fetchMessages()
    }, [activeTab])

    const fetchMessages = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch from message_recipients for broadcasts/messages directed to this referee
        const { data } = await supabase
            .from('message_recipients')
            .select(`
                *,
                message:messages (
                    id, subject, body, created_at, priority, type, sender_id, attachments,
                    sender:profiles!sender_id (full_name, role)
                )
            `)
            .eq('recipient_user_id', user.id)
            .order('created_at', { ascending: false })

        // Format to match the expected structure
        const formattedMessages = data?.map((item: any) => ({
            ...item.message,
            read_at: item.read_at,
            recipient_row_id: item.id
        })) || [];

        setMessages(formattedMessages)
        setLoading(false)
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!subject || !body) return

        setSending(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No autenticado")

            // Referees send 'consulta' type messages to the admin. No need for receiver_id or read column.
            const { error } = await supabase.from('messages').insert({
                sender_id: user.id,
                subject,
                body,
                type: 'consulta',
                priority: 'normal'
            })

            if (error) throw error

            setSubject('')
            setBody('')
            alert('Mensaje enviado a la Administración')
            setActiveTab('inbox')
        } catch (error: any) {
            console.error(error)
            alert('Error al enviar: ' + error.message)
        } finally {
            setSending(false)
        }
    }

    const markAsRead = async (msgId: string, currentReadAt: string | null, recipientRowId: string | undefined) => {
        if (currentReadAt || !recipientRowId) return

        // Optimistic update
        setMessages(messages.map(m => m.id === msgId ? { ...m, read_at: new Date().toISOString() } : m))
        await supabase.from('message_recipients').update({ read_at: new Date().toISOString() }).eq('id', recipientRowId)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <MessageSquare className="text-tdf-orange" />
                Mensajería
            </h2>

            {/* Tabs */}
            <div className="flex bg-zinc-900 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'inbox' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                >
                    Bandeja de Entrada
                </button>
                <button
                    onClick={() => setActiveTab('compose')}
                    className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'compose' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                >
                    Redactar Mensaje
                </button>
            </div>

            {/* Content */}
            {activeTab === 'inbox' ? (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={fetchMessages} className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs font-bold">
                            <RefreshCw size={12} /> Actualizar
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-zinc-500 animate-pulse">Cargando mensajes...</div>
                    ) : messages.length > 0 ? (
                        messages.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => markAsRead(msg.id, msg.read_at, msg.recipient_row_id)}
                                className={`p-4 rounded-xl border transition cursor-pointer ${msg.read_at
                                        ? 'bg-black border-zinc-800 text-zinc-400'
                                        : 'bg-zinc-900 border-zinc-700 text-white shadow-md shadow-orange-900/10 border-l-4 border-l-tdf-orange'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-bold text-lg ${msg.read_at ? 'text-zinc-300' : 'text-white'}`}>{msg.subject}</h4>
                                    <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-1 rounded">
                                        {new Date(msg.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm opacity-90 whitespace-pre-line leading-relaxed">{msg.body}</p>
                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-zinc-500">
                                    <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">
                                        {msg.sender?.full_name?.charAt(0) || 'A'}
                                    </div>
                                    {msg.sender?.full_name || 'Administración'}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
                            <Mail className="mx-auto w-12 h-12 text-zinc-700 mb-4" />
                            <p className="text-zinc-500">No tienes mensajes nuevos.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <form onSubmit={handleSendMessage} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Asunto</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-tdf-orange transition"
                                placeholder="Ej: Consulta sobre designación..."
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Mensaje</label>
                            <textarea
                                required
                                rows={6}
                                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-tdf-orange transition resize-none"
                                placeholder="Escribe tu mensaje aquí..."
                                value={body}
                                onChange={e => setBody(e.target.value)}
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full py-3 bg-tdf-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {sending ? 'Enviando...' : (
                                    <>
                                        <Send size={18} /> Enviar a Administración
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
