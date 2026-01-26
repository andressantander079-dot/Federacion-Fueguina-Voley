'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, User, Phone, Shield, Building } from 'lucide-react'
import Link from 'next/link'

export default function RequestsPage() {
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        const { data } = await supabase
            .from('club_requests')
            .select(`
                *,
                user:user_id(email) 
            `) // Note: user_id is FK to auth.users, might not be joinable directly if not exposed. 
            // Actually Supabase JS client doesn't join auth.users easily usually.
            // We might need to fetch profiles instead or rely on the request data.
            // Let's assume we can rely on request data for now, or fetch profile if exists.
            // Wait, profiles exists for auth.users.
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        // Workaround for email: Fetch profiles or use what we have. 
        // Actually, we don't display email from auth users easily. 
        // But we captured email in the registration form? No, we didn't save it to club_requests.
        // We saved it to Auth. Let's try to join 'profiles' if it exists.
        // When user signs up, a trigger usually creates a profile. 
        // Let's assume profile exists.

        // Revised strategy: Select profile data.
        // But club_requests.user_id -> profiles.id

        const { data: reqs } = await supabase
            .from('club_requests')
            .select('*') // Simplificado para evitar errores de Join
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (reqs) setRequests(reqs)
        setLoading(false)
    }

    const handleApprove = async (req: any) => {
        if (!confirm(`¿Aprobar acceso para ${req.club_name}?`)) return

        try {
            // 1. Crear Club (Team)
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .insert({
                    name: req.club_name,
                    // logo_url: ... optional
                })
                .select()
                .single()

            if (teamError) throw teamError

            // 2. Actualizar Perfil del Usuario
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    role: 'club',
                    club_id: team.id,
                    full_name: req.club_name
                })
                .eq('id', req.user_id)

            if (profileError) throw profileError

            // 3. Actualizar Solicitud
            await supabase
                .from('club_requests')
                .update({ status: 'approved' })
                .eq('id', req.id)

            alert("¡Club aprobado y creado exitosamente!")
            fetchRequests()

        } catch (error: any) {
            alert("Error al aprobar: " + error.message)
        }
    }

    const handleReject = async (id: string) => {
        if (!confirm("¿Rechazar solicitud?")) return
        await supabase.from('club_requests').update({ status: 'rejected' }).eq('id', id)
        fetchRequests()
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando solicitudes...</div>

    return (
        <div className="p-8 min-h-screen bg-slate-50 dark:bg-zinc-950">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Shield className="text-tdf-orange" /> Solicitudes de Acceso
            </h1>

            {requests.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 text-center border border-dashed border-slate-200">
                    <p className="text-slate-400">No hay solicitudes pendientes.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-slate-100 dark:border-white/5 overflow-hidden animate-in slide-in-from-bottom-2">
                            <div className="p-6 border-b border-light">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Building size={20} className="text-slate-400" />
                                            {req.club_name}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Solicitado el {new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                        <div className="mt-2 inline-block px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-100">
                                            Pendiente de Revisión
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleReject(req.id)}
                                            className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition flex items-center gap-2 text-sm"
                                        >
                                            <XCircle size={16} /> Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 text-sm"
                                        >
                                            <CheckCircle size={16} /> Aprobar Acceso
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Authorized Persons Block */}
                            <div className="p-6 bg-slate-50 dark:bg-black/20">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Personas Autorizadas</h4>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {req.authorized_persons?.map((person: any, idx: number) => (
                                        <div key={idx} className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-slate-200 dark:border-white/5 flex items-start gap-4">
                                            <div className="bg-slate-100 dark:bg-white/10 p-2 rounded-full">
                                                <User size={16} className="text-slate-500 dark:text-slate-300" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-white">{person.name}</p>
                                                <p className="text-xs text-slate-500 font-medium mb-1">{person.role}</p>
                                                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                                                    <Phone size={10} /> {person.phone}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
