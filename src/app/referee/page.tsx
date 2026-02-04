'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, MapPin, Clock, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'

export default function RefereeDashboard() {
    const supabase = createClient()
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAssignments()
    }, [])

    async function fetchAssignments() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch assignments for this user
        const { data } = await supabase
            .from('match_officials')
            .select(`
                id, role, status,
                match:matches (
                    id, scheduled_time, court_name, status,
                    home_team:teams!home_team_id(name),
                    away_team:teams!away_team_id(name),
                    category:categories(name)
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }) // Should order by match scheduled_time really

        if (data) {
            // Sort by date (closest first) manually
            data.sort((a, b) => {
                // Handle potential array return from Supabase relations
                const matchA = Array.isArray(a.match) ? a.match[0] : a.match;
                const matchB = Array.isArray(b.match) ? b.match[0] : b.match;

                // Safety check
                if (!matchA?.scheduled_time) return 1;
                if (!matchB?.scheduled_time) return -1;

                return new Date(matchA.scheduled_time).getTime() - new Date(matchB.scheduled_time).getTime();
            });
            setMatches(data);
        }
        setLoading(false)
    }

    if (loading) return <div className="text-center p-8 text-zinc-500">Cargando designaciones...</div>

    return (
        <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="text-tdf-orange" />
                Mis Designaciones
            </h2>

            <div className="space-y-4">
                {matches.map(({ match, role, status }) => (
                    <Link
                        key={match.id}
                        href={`/referee/partido/${match.id}`}
                        className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 active:scale-95 transition-transform"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <span className="bg-zinc-800 text-xs font-bold px-2 py-1 rounded text-zinc-300">
                                {match.category?.name}
                            </span>
                            <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' :
                                status === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                                    'bg-orange-500/10 text-orange-500'
                                }`}>
                                {status === 'assigned' ? 'Pendiente' : status}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 text-right font-black text-lg">{match.home_team.name}</div>
                            <div className="text-zinc-500 text-xs font-bold">VS</div>
                            <div className="flex-1 text-left font-black text-lg">{match.away_team.name}</div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-400 bg-black/30 p-3 rounded-xl">
                            <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(match.scheduled_time).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="flex items-center gap-1"><MapPin size={12} /> {match.court_name || 'A confirmar'}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-white capitalize">{role.replace('_', ' ')}</div>
                                <div className="text-zinc-500">Rol</div>
                            </div>
                        </div>
                    </Link>
                ))}

                {matches.length === 0 && (
                    <div className="text-center p-8 border border-dashed border-zinc-800 rounded-2xl">
                        <p className="text-zinc-500">No tienes partidos asignados próximamente.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
