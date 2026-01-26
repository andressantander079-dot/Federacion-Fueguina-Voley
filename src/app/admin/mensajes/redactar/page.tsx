'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    Send, Eye, Users, AlertCircle, CheckCircle,
    X, Type, Shield, UserCheck
} from 'lucide-react'

// Prioridades y Colores
const PRIORITIES = [
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'importante', label: 'Importante', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' }
]

export default function ComposeMessagePage() {
    const supabase = createClient()
    const router = useRouter()

    // Data
    const [clubs, setClubs] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])

    // Form State
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [priority, setPriority] = useState('normal')
    const [selectedClubs, setSelectedClubs] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // UI State
    const [loading, setLoading] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const [{ data: teams }, { data: cats }] = await Promise.all([
                supabase.from('teams').select('id, name, logo_url').order('name'),
                supabase.from('categories').select('*').order('name')
            ])
            setClubs(teams || [])
            setCategories(cats || [])
        }
        fetchData()
    }, [supabase])

    // Filtros inteligentes
    const handleCategorySelect = async (catId: string) => {
        setSelectedCategory(catId)
        if (catId === 'all') {
            setSelectedClubs([]) // Opcional: seleccionar todos? Mejor limpiar para evitar spam masivo accidental
        } else {
            // Buscar clubes que tengan equipos en esa categoría
            // (Esto requeriría una join compleja, por simplicidad en frontend simulada o select all)
            // Simulación: Seleccionar todos. En una app real haríamos query a 'squads'
            alert("Funcionalidad de filtro por categoría en desarrollo. Por ahora selecciona manualmente.")
        }
    }

    const toggleClub = (id: string) => {
        if (selectedClubs.includes(id)) {
            setSelectedClubs(prev => prev.filter(c => c !== id))
        } else {
            setSelectedClubs(prev => [...prev, id])
        }
    }

    const handleSelectAll = () => {
        if (selectedClubs.length === clubs.length) setSelectedClubs([])
        else setSelectedClubs(clubs.map(c => c.id))
    }

    const handleSubmit = async () => {
        if (!subject || !body || selectedClubs.length === 0) return alert("Faltan datos (Asunto, Mensaje o Destinatarios)")

        setLoading(true)
        try {
            const user = (await supabase.auth.getUser()).data.user
            if (!user) throw new Error("No autenticado")

            // 1. Crear Mensaje
            const { data: msg, error: msgError } = await supabase.from('messages').insert({
                sender_id: user.id, // Assumes profile exists
                subject,
                body,
                priority,
                type: 'comunicado'
            }).select().single()

            if (msgError) throw msgError

            // 2. Crear Destinatarios
            const recipients = selectedClubs.map(clubId => ({
                message_id: msg.id,
                recipient_club_id: clubId
            }))

            const { error: recError } = await supabase.from('message_recipients').insert(recipients)
            if (recError) throw recError

            alert("Mensaje enviado con éxito")
            router.push('/admin/mensajes/enviados')

        } catch (error: any) {
            alert("Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-black/20">

            {/* LEFT: EDITOR */}
            <div className="flex-1 p-6 flex flex-col h-full overflow-y-auto">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 p-6 space-y-6">

                    {/* Header Inputs */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-lg text-slate-800 dark:text-white">Redactar Comunicado</h2>
                            <div className="flex gap-2">
                                {PRIORITIES.map(p => (
                                    <button
                                        key={p.value}
                                        onClick={() => setPriority(p.value)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border ${priority === p.value ? p.color : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800 dark:border-zinc-700'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            className="w-full text-xl font-bold p-2 border-b-2 border-slate-100 dark:border-zinc-800 focus:border-tdf-blue outline-none bg-transparent dark:text-white placeholder-slate-300"
                            placeholder="Asunto del mensaje..."
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Body Editor (Simple) */}
                    <div className="relative flex-1 min-h-[300px]">
                        <textarea
                            className="w-full h-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-white/10 dark:text-slate-200"
                            placeholder="Escribe tu mensaje aquí..."
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                        <div className="absolute right-4 bottom-4 text-xs text-slate-400">
                            Markdown Soportado
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"
                        >
                            <Eye size={18} /> Vista Previa
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || selectedClubs.length === 0}
                            className="px-6 py-2 bg-tdf-blue hover:bg-tdf-blue-dark text-white font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} /> {loading ? 'Enviando...' : 'Enviar Comunicado'}
                        </button>
                    </div>

                </div>
            </div>

            {/* RIGHT: RECIPIENTS */}
            <div className="w-full md:w-80 border-l border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 overflow-y-auto">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                    <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-3">Destinatarios</h3>

                    {/* Filters */}
                    {/* <select className="w-full p-2 mb-3 text-sm bg-slate-50 rounded-lg border border-slate-200">
                        <option value="all">Todas las Categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select> */}

                    <button
                        onClick={handleSelectAll}
                        className="w-full py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition mb-4"
                    >
                        {selectedClubs.length === clubs.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </button>

                    <div className="text-xs text-slate-400 font-medium">
                        {selectedClubs.length} clubes seleccionados
                    </div>
                </div>

                <div className="p-2 space-y-1">
                    {clubs.map(club => (
                        <div
                            key={club.id}
                            onClick={() => toggleClub(club.id)}
                            className={`
                                flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                ${selectedClubs.includes(club.id)
                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                    : 'bg-white border-transparent hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/5'
                                }
                            `}
                        >
                            <div className={`
                                w-5 h-5 rounded border flex items-center justify-center
                                ${selectedClubs.includes(club.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}
                            `}>
                                {selectedClubs.includes(club.id) && <CheckCircle size={14} />}
                            </div>

                            <img src={club.logo_url || '/placeholder.png'} className="w-8 h-8 rounded-full bg-slate-100 object-contain" />

                            <span className={`text-sm font-bold ${selectedClubs.includes(club.id) ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                {club.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="bg-slate-100 dark:bg-white/5 px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-white/10">
                            <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                <Eye size={18} /> Vista Previa (Como lo ven los clubes)
                            </h3>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-black/10 rounded-full dark:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-8">
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-4 ${PRIORITIES.find(p => p.value === priority)?.color}`}>
                                {PRIORITIES.find(p => p.value === priority)?.label}
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{subject || '[Sin Asunto]'}</h2>
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {body || '[Cuerpo del mensaje...]'}
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex items-center gap-4">
                                <img src="/logo-fvu.png" className="w-12 h-12 grayscale opacity-50" />
                                <div className="text-xs text-slate-400">
                                    <p className="font-bold uppercase">Federación de Voley Ushuaia</p>
                                    <p>Comunicado Oficial</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-black/20 p-4 flex justify-end gap-2 border-t border-slate-200 dark:border-white/10">
                            <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Seguir Editando</button>
                            <button onClick={() => { setShowPreview(false); handleSubmit(); }} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-black">Enviar Ahora</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
