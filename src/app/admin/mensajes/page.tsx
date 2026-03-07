'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Mail, User, Clock, CheckCircle2, AlertCircle, ChevronRight, FileText, Download, Shield } from 'lucide-react'

// Simularemos que 'Solicitudes' viene de la tabla 'tickets' o 'consultas'
// Si no existe, podemos crearla o usar una estructura genérica.
// Por ahora, asumiré que queremos listar mensajes entrantes type='consulta' de la tabla 'messages'
// O si prefieren tickets, usar tickets. Usaré 'messages' con type='consulta' para unificar el sistema.

export default function InboxPage() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
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

    const markAsRead = async (msg: any) => {
        if (selectedMessage?.id === msg.id) {
            setSelectedMessage(null); // Permite contraer el acordeón (Toggle)
            return;
        }
        setSelectedMessage(msg)
        if (!msg.read) {
            await supabase.from('messages').update({ read: true }).eq('id', msg.id)
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
        }
    }

    const filteredMessages = messages.filter(m =>
        m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando bandeja de entrada...</div>

    const getPriorityBadge = (p: string) => {
        const map: any = {
            'urgente': 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-500 dark:border-red-500/50',
            'importante': 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-500 dark:border-yellow-500/50',
            'normal': 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-500 dark:border-blue-500/50'
        }
        return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${map[p] || map['normal']}`}>{p}</span>
    }

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
                            <div
                                key={msg.id}
                                onClick={() => markAsRead(msg)}
                                className={`p-4 rounded-xl cursor-pointer transition-all group border relative ${selectedMessage?.id === msg.id ? 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/5'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className={`text-sm line-clamp-1 pr-6 ${!msg.read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>{msg.sender?.full_name || 'Club Indefinido'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{new Date(msg.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className={`text-xs mb-1 truncate ${!msg.read ? 'font-black text-tdf-blue dark:text-tdf-orange' : 'font-bold text-slate-600 dark:text-slate-400'}`}>{msg.subject}</h4>
                                <p className={`text-xs text-slate-500 transition-all ${selectedMessage?.id === msg.id ? 'line-clamp-none md:line-clamp-2 mt-2 leading-relaxed' : 'line-clamp-2'}`}>
                                    {msg.body}
                                </p>
                                {!msg.read && <div className="absolute right-4 top-4 w-2 h-2 bg-tdf-orange rounded-full animate-pulse"></div>}

                                {/* ACORDEÓN MÓVIL: Visible únicamente en pantallas pequeñas cuando el mensaje está expandido */}
                                {selectedMessage?.id === msg.id && (
                                    <div className="md:hidden mt-4 pt-4 border-t border-slate-100 dark:border-zinc-700 animate-in slide-in-from-top-2 flex flex-col gap-3">
                                        <div>{getPriorityBadge(selectedMessage.priority)}</div>

                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-tdf-blue dark:text-blue-500">
                                                        <FileText size={16} />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 line-clamp-1">{msg.attachments[0].name || 'Documento'}</span>
                                                    </div>
                                                </div>
                                                <a href={msg.attachments[0].url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-700">
                                                    <Download size={14} /> Descargar Archivo
                                                </a>
                                            </div>
                                        )}

                                        <button onClick={(e) => { e.stopPropagation(); setSelectedMessage(null); }} className="mt-2 w-full py-2 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-lg text-xs font-bold text-center">
                                            Contraer Mensaje
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detail View (Placeholder for now) */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50/50 dark:bg-transparent">
                {selectedMessage ? (
                    <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-zinc-800 pb-6">
                            <div className="space-y-4">
                                {getPriorityBadge(selectedMessage.priority)}
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                    {selectedMessage.subject}
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                        <User size={18} className="text-slate-500 dark:text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            {selectedMessage.sender?.full_name || 'Desconocido'}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">
                                            {new Date(selectedMessage.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {selectedMessage.body}
                        </div>

                        {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                            <div className="mt-8 p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-lg flex items-center justify-center text-tdf-blue dark:text-blue-500">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Archivo Adjunto</p>
                                        <p className="text-xs text-slate-500">{selectedMessage.attachments[0].name || 'Documento subido por el club'}</p>
                                    </div>
                                </div>
                                <a href={selectedMessage.attachments[0].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 shadow-sm px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition">
                                    <Download size={14} />
                                    Descargar
                                </a>
                            </div>
                        )}

                        {/* Fake reply placeholder / info box for next phase */}
                        <div className="mt-8 bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 flex gap-3">
                            <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Respuesta Oficial</h4>
                                <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">Próximamente la administración podrá responder directamente a este hilo por correo electrónico o desde este panel.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-24 h-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-full flex items-center justify-center mb-4">
                            <Mail size={40} className="text-slate-300 dark:text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-400 dark:text-slate-500">Mesa de Entrada</h3>
                        <p className="text-sm">Selecciona una consulta del panel izquierdo para leerla aquí.</p>
                    </>
                )}
            </div>
        </div>
    )
}