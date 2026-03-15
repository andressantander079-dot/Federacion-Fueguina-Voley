'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, Users, MapPin, X, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminAgendaPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        type: 'institucional',
        target_role: 'all', // 'all', 'club', 'referee', 'specific_club'
        target_club_id: '' 
    });

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Feb 2026 default

    useEffect(() => {
        fetchData();
        fetchTeams();
    }, []);

    async function fetchTeams() {
        const { data } = await supabase.from('teams').select('id, name').order('name');
        if (data) setTeams(data);
    }

    async function fetchData() {
        setLoading(true);
        // Fetch Calendar Events
        const { data: calendarEvents, error } = await supabase
            .from('calendar_events')
            .select(`*, target_team:teams(name)`)
            .order('start_time', { ascending: true });

        // Fetch Matches (to display them too)
        const { data: matches } = await supabase
            .from('matches')
            .select(`*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)`)
            .order('scheduled_time', { ascending: true });

        // Merge
        const formattedMatches = (matches || []).map((m: any) => ({
            id: m.id,
            title: `Partido: ${m.home_team.name} vs ${m.away_team.name}`,
            start_time: m.scheduled_time,
            type: 'partido',
            is_match: true,
            target_team: null
        }));

        const allEvents = [...(calendarEvents || []), ...formattedMatches];
        setEvents(allEvents);
        setLoading(false);
    }

    async function handleCreateEvent(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);

        try {
            const startDateTime = new Date(`${newEvent.date}T${newEvent.time}`);

            const payload: any = {
                title: newEvent.title,
                description: newEvent.description,
                start_time: startDateTime.toISOString(),
                event_type: newEvent.type,
                target_role: newEvent.target_role,
                target_club_id: newEvent.target_role === 'specific_club' ? newEvent.target_club_id : null
            };

            const { error } = await supabase.from('calendar_events').insert(payload);
            if (error) throw error;

            alert("Evento creado exitosamente");
            setShowModal(false);
            setNewEvent({ title: '', description: '', date: '', time: '', type: 'institucional', target_role: 'all', target_club_id: '' });
            fetchData();

        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar evento?")) return;
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (!error) fetchData();
    }

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const startOffset = firstDay; // Sunday start

    const calendarGrid = Array(startOffset).fill(null).concat(
        Array.from({ length: days }, (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1))
    );

    const getEventsForDate = (date: Date) => {
        return events.filter(e => {
            const eDate = new Date(e.start_time);
            return eDate.getDate() === date.getDate() &&
                eDate.getMonth() === date.getMonth() &&
                eDate.getFullYear() === date.getFullYear();
        });
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 dark:bg-zinc-950">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="text-pink-600" /> Agenda Centralizada
                    </h1>
                    <p className="text-slate-500">Gestiona eventos, reuniones y fechas límite para los clubes.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition"
                >
                    <Plus size={20} /> Nuevo Evento
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><ChevronLeft /></button>
                        <h2 className="text-2xl font-black capitalize text-slate-800 dark:text-white">{monthName}</h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><ChevronRight /></button>
                    </div>

                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="text-xs font-bold text-slate-400 uppercase py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarGrid.map((date, idx) => {
                            if (!date) return <div key={idx} className="aspect-square bg-slate-50/50 dark:bg-zinc-900/50"></div>;

                            const dayEvents = getEventsForDate(date);
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <div key={idx} className={`aspect-square border border-slate-100 dark:border-zinc-800 p-1 relative flex flex-col ${isToday ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white dark:bg-zinc-900'}`}>
                                    <span className={`text-sm font-bold ml-1 ${isToday ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'}`}>{date.getDate()}</span>
                                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 mt-1">
                                        {dayEvents.map((ev, i) => (
                                            <div key={i} className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${ev.is_match ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                                                    ev.event_type === 'reunion' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' :
                                                        'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400'
                                                }`}>
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Events List */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-zinc-800 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Próximos Eventos</h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {events.filter(e => new Date(e.start_time) >= new Date()).slice(0, 10).map(ev => (
                            <div key={ev.id} className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${ev.is_match ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                                        }`}>
                                        {ev.is_match ? 'Partido' : ev.event_type || 'General'}
                                    </span>
                                    {!ev.is_match && (
                                        <button onClick={() => handleDelete(ev.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-white leading-tight mb-1">{ev.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                    <Clock size={12} />
                                    {new Date(ev.start_time).toLocaleDateString()} {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {ev.target_team && (
                                    <div className="flex items-center gap-1 text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded w-fit">
                                        <Users size={12} /> Solo: {ev.target_team.name}
                                    </div>
                                )}
                                {ev.description && <p className="text-xs text-slate-400 italic mt-2">"{ev.description}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">Nuevo Evento</h2>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
                                <input required className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Ej: Reunión Delegados" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                                    <input required type="date" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Hora</label>
                                    <input required type="time" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                <select className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800" value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}>
                                    <option value="reunion">Reunión</option>
                                    <option value="fecha_limite">Fecha Límite</option>
                                    <option value="institucional">Institucional</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Destinatario</label>
                                <select className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800 mb-2" value={newEvent.target_role} onChange={e => setNewEvent({ ...newEvent, target_role: e.target.value })}>
                                    <option value="all">-- Todos --</option>
                                    <option value="club">Todos los Clubes</option>
                                    <option value="referee">Todos los Árbitros</option>
                                    <option value="specific_club">Un Club Específico...</option>
                                </select>
                                
                                {newEvent.target_role === 'specific_club' && (
                                    <select required className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800" value={newEvent.target_club_id} onChange={e => setNewEvent({ ...newEvent, target_club_id: e.target.value })}>
                                        <option value="">-- Seleccionar Club --</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                                <textarea className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800 h-20 resize-none" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
                            </div>
                            <button disabled={creating} type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">
                                {creating ? <Loader2 className="animate-spin" /> : 'Agendar Evento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
