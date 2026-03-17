'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, User } from 'lucide-react'
import CalendarSyncButton from '@/components/common/CalendarSyncButton'
import { CalendarEvent } from '@/lib/icsUtils'
import { formatArgentinaTimeLiteral } from '@/lib/dateUtils'

export default function RefereeAgendaPage() {
    const supabase = createClient()
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Feb 2026 default
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedDateEvents, setSelectedDateEvents] = useState<any[]>([]);

    useEffect(() => {
        fetchAgenda()
    }, [])

    const fetchAgenda = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setLoading(true)

        // 1. Fetch Matches (Designations)
        const { data: matchesData } = await supabase
            .from('match_officials')
            .select(`
                id, role,
                match:matches (
                    id, scheduled_time, court_name,
                    home_team:teams!home_team_id(name, shield_url),
                    away_team:teams!away_team_id(name, shield_url)
                )
            `)
            .eq('user_id', user.id)

        // 2. Fetch General Calendar Events
        const { data: eventsData } = await supabase
            .from('calendar_events')
            .select('*')
            .or('target_role.eq.all,target_role.eq.referee')

        // 3. Normalize & Merge

        // Process Matches
        const formattedMatches = (matchesData || [])
            .map(item => {
                // @ts-ignore
                const m = Array.isArray(item.match) ? item.match[0] : item.match;
                if (!m || !m.id) return null;

                const homeName = Array.isArray(m.home_team) ? (m.home_team[0] as any)?.name : (m.home_team as any)?.name;
                const homeShield = Array.isArray(m.home_team) ? (m.home_team[0] as any)?.shield_url : (m.home_team as any)?.shield_url;
                const awayName = Array.isArray(m.away_team) ? (m.away_team[0] as any)?.name : (m.away_team as any)?.name;
                const awayShield = Array.isArray(m.away_team) ? (m.away_team[0] as any)?.shield_url : (m.away_team as any)?.shield_url;

                return {
                    id: `match-${item.id}`,
                    title: `${homeName} vs ${awayName}`,
                    description: `Rol: ${item.role.replace('_', ' ')}`,
                    start_time: m.scheduled_time, // Keep ISO string
                    location: m.court_name,
                    type: 'match',
                    role: item.role,
                    home_shield: homeShield,
                    away_shield: awayShield,
                    home_name: homeName,
                    away_name: awayName
                };
            })
            .filter(Boolean);

        // Process Events
        const formattedEvents = (eventsData || []).map((ev: any) => ({
            id: `event-${ev.id}`,
            title: ev.title,
            description: ev.description,
            start_time: ev.start_time,
            location: 'Evento Institucional',
            type: ev.event_type || 'general',
            role: null
        }));

        const allEvents = [...formattedMatches, ...formattedEvents];

        // Sort by date ASC
        allEvents.sort((a: any, b: any) => {
            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime(); // Date object ok for sorting
        });

        setMatches(allEvents);
        setLoading(false)
    }

    // --- CALENDAR LOGIC ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0-6
        return { days, firstDay };
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    // Grid: Start Monday (Optional, using Sunday start for simplicity matching Club Agenda default logic found)
    // Actually club agenda loop was matching standard calendar. Let's assume Mon start for Sports context usually better, but let's stick to standard if simple.
    // Let's use Sunday start 0.
    const calendarGrid = [];
    for (let i = 0; i < firstDay; i++) calendarGrid.push(null);
    for (let i = 1; i <= days; i++) calendarGrid.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

    const getEventsForDate = (date: Date) => {
        return matches.filter(m => {
            if (!m.start_time) return false;
            
            // Instanciar ambas fechas en el contexto de la zona horaria local del navegador (Argentina)
            const eventDate = new Date(m.start_time);
            
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
    };

    // Prepare events for Sync
    const calendarEvents: CalendarEvent[] = matches.map(m => ({
        title: m.type === 'match' ? `Arbitraje: ${m.title}` : m.title,
        description: m.description,
        location: m.location,
        startTime: new Date(m.start_time),
        endTime: new Date(new Date(m.start_time).getTime() + 90 * 60000)
    }));

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 backdrop-blur-sm sticky top-0 z-20 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 transition text-zinc-400"><ChevronLeft size={16} /></button>
                        <h2 className="text-xl font-black text-white capitalize w-32 text-center leading-none">{monthName}</h2>
                        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 transition text-zinc-400"><ChevronRight size={16} /></button>
                    </div>
                </div>
                <CalendarSyncButton events={calendarEvents} label="Sincronizar" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CALENDAR GRID */}
                <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black rounded-3xl p-6 border border-zinc-800 shadow-2xl">
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                            <div key={d} className="text-[10px] font-black text-zinc-600 uppercase tracking-widest py-2">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarGrid.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;

                            const events = getEventsForDate(date);
                            const hasMatch = events.some(e => e.type === 'match');
                            const hasEvent = events.some(e => e.type !== 'match');
                            const isToday = new Date().toDateString() === date.toDateString();
                            const isSelected = selectedDate?.toDateString() === date.toDateString();

                            return (
                                <button
                                    key={idx}
                                    onClick={() => { setSelectedDate(date); setSelectedDateEvents(events); }}
                                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition border
                                        ${isSelected ? 'border-tdf-orange bg-orange-500/10' : 'border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}
                                        ${isToday ? 'ring-1 ring-white/20' : ''}
                                        group
                                    `}
                                >
                                    <span className={`text-sm font-bold ${isToday ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{date.getDate()}</span>

                                    <div className="flex gap-1 mt-1.5 h-1.5">
                                        {hasMatch && <div className="w-1.5 h-1.5 rounded-full bg-tdf-blue shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>}
                                        {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]"></div>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* DETAILS PANEL */}
                <div className="lg:col-span-1 flex flex-col h-full">
                    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 flex-1 flex flex-col shadow-xl">
                        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                            <Clock className="text-tdf-orange" size={20} />
                            {selectedDate
                                ? selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })
                                : 'Selecciona un día'}
                        </h3>

                        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {!selectedDate && (
                                <div className="text-center py-12 opacity-50">
                                    <Calendar className="mx-auto mb-2 text-zinc-600" size={40} />
                                    <p className="text-sm text-zinc-500 font-medium">Toca una fecha para ver tus designaciones.</p>
                                </div>
                            )}

                            {selectedDate && selectedDateEvents.length === 0 && (
                                <p className="text-zinc-600 text-sm text-center py-8">No tienes actividades este día.</p>
                            )}

                            {selectedDateEvents.map((ev, i) => (
                                <div key={i} className={`p-4 rounded-2xl border ${ev.type === 'match' ? 'bg-zinc-950 border-zinc-800' : 'bg-purple-900/10 border-purple-500/20'}`}>
                                    {/* TIME - CRITICAL: USE LITERAL PARSING */}
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${ev.type === 'match' ? 'bg-zinc-900 text-zinc-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {ev.type === 'match' ? 'Partido' : ev.type}
                                        </span>
                                        <span className="text-white font-bold text-sm font-mono">
                                            {formatArgentinaTimeLiteral(ev.start_time)} hs
                                        </span>
                                    </div>

                                    {ev.type === 'match' ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 bg-white/5 rounded-full p-1"><img src={ev.home_shield || '/placeholder.png'} className="w-full h-full object-contain" /></div>
                                                <span className="text-xs font-bold text-zinc-600">VS</span>
                                                <div className="w-8 h-8 bg-white/5 rounded-full p-1"><img src={ev.away_shield || '/placeholder.png'} className="w-full h-full object-contain" /></div>
                                            </div>
                                            <h4 className="font-bold text-white text-sm mb-1">{ev.home_name} vs {ev.away_name}</h4>

                                            <div className="flex flex-col gap-1 text-xs text-zinc-500 bg-zinc-900/50 p-2 rounded-lg">
                                                <span className="flex items-center gap-1"><MapPin size={10} /> {ev.location}</span>
                                                <span className="text-tdf-orange font-bold uppercase">{ev.role.replace('_', ' ')}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="font-bold text-white text-sm mb-1">{ev.title}</h4>
                                            <p className="text-xs text-zinc-500 italic">"{ev.description}"</p>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
