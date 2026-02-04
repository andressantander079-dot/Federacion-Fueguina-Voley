'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin } from 'lucide-react'
import CalendarSyncButton from '@/components/common/CalendarSyncButton'
import { CalendarEvent } from '@/lib/icsUtils'

export default function RefereeAgendaPage() {
    const supabase = createClient()
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAgenda()
    }, [])

    const fetchAgenda = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('match_officials')
            .select(`
                id, role,
                match:matches (
                    id, scheduled_time, court_name,
                    home_team:teams!home_team_id(name),
                    away_team:teams!away_team_id(name)
                )
            `)
            .eq('user_id', user.id)
            .gte('match.scheduled_time', new Date().toISOString()) // Future matches only? Or all? Let's show all but highlight future.

        // Note: Filtering on joined relation 'match.scheduled_time' is tricky with Supabase basic client unless using specific filters or views. 
        // We'll fetch all and filter client side for better control on "Upcoming" vs "Past".

        if (data) {
            // @ts-ignore
            // Client-side Sort
            data.sort((a, b) => new Date(a.match.scheduled_time).getTime() - new Date(b.match.scheduled_time).getTime());
            setMatches(data)
        }
        setLoading(false)
    }

    // Prepare events for Sync
    const calendarEvents: CalendarEvent[] = matches.map(m => ({
        title: `Arbitraje: ${m.match.home_team.name} vs ${m.match.away_team.name}`,
        description: `Rol asignado: ${m.role}. Cancha: ${m.match.court_name}`,
        location: m.match.court_name,
        startTime: new Date(m.match.scheduled_time),
        endTime: new Date(new Date(m.match.scheduled_time).getTime() + 90 * 60000) // Approx 90 mins
    }));

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black flex items-center gap-2">
                    <Calendar className="text-tdf-orange" />
                    Agenda 2026
                </h2>
                <CalendarSyncButton events={calendarEvents} label="Sincronizar Celular" />
            </div>

            {loading ? (
                <div className="text-center py-10 text-zinc-500">Cargando agenda...</div>
            ) : matches.length > 0 ? (
                <div className="space-y-4">
                    {matches.map(({ match, role }) => {
                        const date = new Date(match.scheduled_time);
                        const isPast = date < new Date();

                        return (
                            <div key={match.id} className={`flex items-center gap-4 bg-zinc-900 border ${isPast ? 'border-zinc-800 opacity-60' : 'border-zinc-700'} p-4 rounded-2xl`}>
                                <div className="bg-zinc-950 p-3 rounded-xl text-center min-w-[70px]">
                                    <div className="text-xs text-zinc-500 uppercase font-bold">{date.toLocaleString('es-AR', { month: 'short' })}</div>
                                    <div className="text-2xl font-black text-white">{date.getDate()}</div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-tdf-orange mb-1">
                                        <Clock size={12} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <h3 className="font-bold text-lg text-white mb-1">
                                        {match.home_team.name} vs {match.away_team.name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {match.match.court_name}</span>
                                        <span className="bg-zinc-800 px-2 py-0.5 rounded capitalize">{role.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl">
                    <p className="text-zinc-500">No hay partidos programados.</p>
                </div>
            )}
        </div>
    )
}
