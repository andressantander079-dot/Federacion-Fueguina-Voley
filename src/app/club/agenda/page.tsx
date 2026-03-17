'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Calendar as CalendarIcon, MapPin, Clock, Users,
    ChevronLeft, ChevronRight, AlertCircle, ArrowLeft, Trophy, Calendar
} from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';
import CalendarSyncButton from '@/components/common/CalendarSyncButton';
import EmptyState from '@/components/ui/EmptyState';
import { formatArgentinaTimeLiteral } from '@/lib/dateUtils';

export default function AgendaClub() {
    const router = useRouter();
    const { clubId, profile, loading: authLoading } = useClubAuth();

    // Contexto
    // const [teamId, setTeamId] = useState<string | null>(null); // derived from useClubAuth
    // const [profile, setProfile] = useState<any>(null); // derived from useClubAuth

    // Estado Calendario (Default: Febrero 2026)
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Mes 1 = Febrero
    const [matches, setMatches] = useState<any[]>([]);
    const [selectedDateEvents, setSelectedDateEvents] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (clubId) loadData(clubId);
    }, [clubId]);

    async function loadData(id: string) {
        try {
            // 3. Cargar Eventos de Calendario (Reuniones, Fechas Límite)
            // Soporta target_role = 'all' o target_role = 'club' con target_clubs_ids conteniendo el teamId
            // Como Supabase OR es un poco restrictivo con arrays, traemos todo lo de clubes y filtramos en JS para mayor seguridad
            const { data: eventos } = await supabase
                .from('calendar_events')
                .select('*')
                .or(`target_role.eq.all,target_role.eq.club,target_role.eq.specific_club`);

            // 4. Normalizar y Combinar
            const matchesFormatted: any[] = []; // Partidos deshabilitados temporalmente hasta crear módulo Competencias


            const eventsFormatted = (eventos || [])
                .filter((e: any) => {
                     if (e.target_role === 'all') return true;
                     if (e.target_role === 'club' && (!e.target_clubs_ids || e.target_clubs_ids.length === 0)) return true;
                     if ((e.target_role === 'club' || e.target_role === 'specific_club') && e.target_clubs_ids?.includes(id)) return true;
                     return false;
                })
                .map((e: any) => ({
                    ...e,
                    type: e.event_type || 'meeting',
                    date_time: e.start_time,
                    venue: { name: 'Administración' },
                    title: e.title,
                    description: e.description
                }));

            // Combinar todo
            const allEvents = [...matchesFormatted, ...eventsFormatted];
            setMatches(allEvents);

        } catch (error) {
            console.error("Error inicializando agenda:", error);
        } finally {
            setDataLoading(false);
        }
    }

    // --- LÓGICA CALENDARIO ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
        return { days, firstDay };
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    // Generar Grid
    // Ajuste: Lunes primer día (1) -> Dom (0) pasa a ser (7) para calculos si queremos Lunes start.
    // Pero usemos Domingo start clásico para simplificar, o Lunes si es preferido en deportes.
    // Usemos Lunes como primer día de la semana visualmente.
    // getDay(): 0(Sun), 1(Mon)...
    // Offset para Lunes: (day + 6) % 7.  0->6 (Sun->Last), 1->0 (Mon->First)
    const startOffset = (firstDay + 6) % 7;

    const calendarGrid = [];
    for (let i = 0; i < startOffset; i++) {
        calendarGrid.push(null);
    }
    for (let i = 1; i <= days; i++) {
        calendarGrid.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const getEventsForDate = (date: Date) => {
        return matches.filter(m => {
            if (!m.date_time) return false;
            
            // Instanciar ambas fechas en el contexto de la zona horaria local del navegador (Argentina)
            const eventDate = new Date(m.date_time);
            
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
    };

    if (authLoading || dataLoading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center">
                <CalendarIcon size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Agenda...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 font-sans pb-20">
            {/* Context Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-3 sticky top-0 z-20">
                <Link href="/club" className="p-2 hover:bg-slate-800 rounded-full transition"><ArrowLeft size={20} className="text-slate-400 hover:text-white" /></Link>
                <h1 className="font-black text-xl text-white">Agenda del Club</h1>
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

                {/* Calendar Controls */}
                <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg flex-wrap gap-4">
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-full text-slate-400 hover:text-white transition"><ChevronLeft size={24} /></button>
                        <h2 className="text-xl md:text-2xl font-black text-white capitalize text-center">{monthName}</h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-full text-slate-400 hover:text-white transition"><ChevronRight size={24} /></button>
                    </div>

                    <CalendarSyncButton
                        events={matches.map(m => ({
                            title: m.title || 'Evento de Club',
                            description: m.description || (m.type === 'match' ? `Partido contra ${m.home_team_id === clubId ? m.away_team?.name : m.home_team?.name}` : ''),
                            location: m.venue?.name || 'Sede a confirmar',
                            startTime: new Date(m.date_time),
                            endTime: new Date(new Date(m.date_time).getTime() + (m.type === 'match' ? 90 : 60) * 60000)
                        }))}
                        label="Sincronizar Agenda"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CALENDARIO VISUAL */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl overflow-hidden">
                        <div className="grid grid-cols-7 mb-4 text-center">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                                <div key={d} className="text-xs font-black text-slate-400 uppercase tracking-wider py-2">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarGrid.map((date, idx) => {
                                if (!date) return <div key={idx} className="aspect-square"></div>;

                                const events = getEventsForDate(date);
                                const hasMeeting = events.some(e => e.type !== 'match');
                                const hasMatch = events.some(e => e.type === 'match');
                                const isToday = new Date().toDateString() === date.toDateString();
                                const isSelected = selectedDate?.toDateString() === date.toDateString();

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { setSelectedDate(date); setSelectedDateEvents(events); }}
                                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition border-2 
                                            ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-slate-50'}
                                            ${isToday ? 'bg-orange-50' : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-bold ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>{date.getDate()}</span>

                                        {/* Dots Indicators */}
                                        <div className="flex gap-1 mt-1">
                                            {hasMatch && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                            {hasMeeting && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* DETALLE DEL DÍA */}
                    <div className="lg:col-span-1">
                        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 h-full flex flex-col">
                            <h3 className="text-lg font-black text-white mb-4 border-b border-zinc-800 pb-2">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                                    : 'Selecciona una fecha'}
                            </h3>

                            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                                {matches.length === 0 ? (
                                    <EmptyState
                                        icon={<Calendar size={48} />}
                                        title="Sin Partidos Próximos"
                                        description="No tienes ningún partido programado para este mes escolar o torneo activo."
                                    />
                                ) : (
                                    <>
                                        {!selectedDate && (
                                            <div className="text-center py-10 text-zinc-500">
                                                <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Toca un día para ver los detalles</p>
                                            </div>
                                        )}

                                        {selectedDate && selectedDateEvents.length === 0 && (
                                            <div className="text-center py-10 text-zinc-600">
                                                <p className="text-sm">No hay actividades programadas.</p>
                                            </div>
                                        )}

                                        {selectedDateEvents.map((ev, i) => {
                                            if (ev.type !== 'match') {
                                                return (
                                                    <div key={i} className="bg-purple-500/10 border-l-4 border-purple-500 rounded-r-xl p-4">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{ev.event_type || ev.type || 'Evento'}</span>
                                                            <span className="text-white font-bold text-sm">{formatArgentinaTimeLiteral(ev.date_time)} hs</span>
                                                        </div>
                                                        <h4 className="font-bold text-white text-lg leading-tight mb-2">{ev.title}</h4>
                                                        <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1"><MapPin size={12} /> {ev.venue?.name}</p>
                                                        <p className="text-xs text-zinc-300 italic">"{ev.description}"</p>
                                                    </div>
                                                );
                                            } else {
                                                // Es un partido
                                                const isHome = ev.home_team_id === clubId;
                                                const rival = isHome ? ev.away_team : ev.home_team;
                                                return (
                                                    <div key={i} className="bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Partido</span>
                                                            <span className="text-white font-bold text-sm">{formatArgentinaTimeLiteral(ev.date_time)} hs</span>
                                                        </div>

                                                        <div className="flex items-center gap-3 mb-3">
                                                            <img src={rival?.shield_url || '/placeholder.png'} className="w-10 h-10 object-contain bg-white rounded-full p-1" />
                                                            <div>
                                                                <p className="text-xs text-zinc-400">vs Rival</p>
                                                                <p className="font-bold text-white leading-tight">{rival?.name || 'A definir'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950/50 p-2 rounded-lg">
                                                            <MapPin size={12} /> {ev.venue?.name || 'Cancha a confirmar'}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </>
                                )}
                            </div>

                            {/* Próximo Evento Global (Si no hay nada seleccionado) */}
                            {!selectedDate && matches.length > 0 && (
                                <div className="mt-auto pt-6 border-t border-zinc-800">
                                    <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Próxima Actividad</p>
                                    {(() => {
                                        const next = matches.find(m => new Date(m.date_time) > new Date());
                                        if (!next) return <p className="text-xs text-zinc-600">Nada pendiente.</p>;
                                        return (
                                            <div className="flex items-center gap-3">
                                                <div className="bg-zinc-800 p-2 rounded-lg text-center min-w-[50px]">
                                                    <span className="block font-bold text-white text-lg">{new Date(next.date_time).getDate()}</span>
                                                    <span className="block text-[10px] uppercase text-zinc-500">{new Date(next.date_time).toLocaleDateString('es', { month: 'short' })}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm line-clamp-1">{next.title || (next.home_team_id === clubId ? `vs ${next.away_team?.name}` : `vs ${next.home_team?.name}`)}</p>
                                                    <p className="text-xs text-zinc-500">{formatArgentinaTimeLiteral(next.date_time)} hs</p>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}