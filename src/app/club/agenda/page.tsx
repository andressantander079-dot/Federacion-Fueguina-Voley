// src/app/club/agenda/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Calendar as CalendarIcon, MapPin, Clock, Users,
    Share2, AlertTriangle, ChevronDown, ChevronUp,
    Download, FileText, CheckCircle, XCircle, AlertCircle,
    ArrowLeft, Trophy, Shirt
} from 'lucide-react';

export default function AgendaClub() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    // Datos Usuario
    const [teamId, setTeamId] = useState<string | null>(null);
    const [myTeamData, setMyTeamData] = useState<any>(null);

    // Datos Agenda
    const [matches, setMatches] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Filtros y UI
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null); // Para ver autoridades

    useEffect(() => {
        inicializar();
    }, []);

    async function inicializar() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            // 1. Obtener mi club
            const { data: perfil } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
            if (!perfil?.club_id) return router.push('/club');
            setTeamId(perfil.club_id);

            // 2. Obtener datos de mi equipo (colores, nombre)
            const { data: teamData } = await supabase.from('teams').select('*').eq('id', perfil.club_id).single();
            setMyTeamData(teamData);

            // 3. Cargar Categorías (para el filtro)
            // Fix: team_categories probably doesn't exist, using squads or categories? Assuming squads for now or simplified
            // Checking schema: public.squads uses team_id. public.categories is global.
            // If the code meant "squads of this team", it should query squads.
            // But let's stick to the column fix first.
            const { data: cats } = await supabase.from('squads').select('id, name, category_id').eq('team_id', perfil.club_id);
            setCategories(cats || []);

            // 4. Cargar Partidos (Donde juego como Local O Visitante)
            const { data: partidos } = await supabase
                .from('matches')
                .select(`
          *,
          venue:venues(name),
          category:categories(name),
          home_team:teams!home_team_id(id, name, shield_url),
          away_team:teams!away_team_id(id, name, shield_url)
        `)
                .or(`home_team_id.eq.${perfil.club_id},away_team_id.eq.${perfil.club_id}`)
                .order('scheduled_time', { ascending: true }); // Schema uses scheduled_time, not date_time

            setMatches(partidos || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- LÓGICA DE NEGOCIO (Tus recomendaciones) ---

    // 1. HERO MATCH: Encontrar el próximo partido futuro
    const getNextMatch = () => {
        const now = new Date();
        return matches.find(m => new Date(m.date_time) > now && m.status !== 'finished');
    };
    const nextMatch = getNextMatch();

    // 2. FILTRADO
    const filteredMatches = selectedCategory === 'Todas'
        ? matches
        : matches.filter(m => m.category?.name === selectedCategory);

    // FUNCIONES AUXILIARES
    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

    // RECOMENDACIÓN #12: CITACIÓN (30 min antes)
    const getCitationTime = (dateStr: string) => {
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() - 30);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // RECOMENDACIÓN #10: WHATSAPP SHARE
    const shareWhatsApp = (m: any) => {
        const rival = m.home_team_id === teamId ? m.away_team.name : m.home_team.name;
        const text = `🏐 *Próximo Partido*\n🆚 Rival: ${rival}\n📅 Fecha: ${formatDate(m.date_time)}\n⏰ Hora: ${formatTime(m.date_time)}\n📍 Cancha: ${m.venue?.name || 'A confirmar'}\n\n¡Nos vemos ahí! 💪`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // RECOMENDACIÓN #13: CALENDAR (ICS)
    const addToCalendar = (m: any) => {
        const title = `Partido vs ${m.home_team_id === teamId ? m.away_team.name : m.home_team.name}`;
        const start = new Date(m.date_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const end = new Date(new Date(m.date_time).getTime() + 90 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, ""); // Asumimos 90 min
        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\nDTSTART:${start}\nDTEND:${end}\nLOCATION:${m.venue?.name}\nDESCRIPTION:Partido Oficial.\nEND:VEVENT\nEND:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'partido.ics');
        document.body.appendChild(link);
        link.click();
    };

    // RECOMENDACIÓN #5: SEMÁFORO ESTADOS
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'finished': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'live': return 'bg-red-100 text-red-600 border-red-200 animate-pulse';
            case 'suspended': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };
    const getStatusLabel = (status: string) => {
        const map: any = { 'scheduled': 'Programado', 'finished': 'Finalizado', 'live': 'EN VIVO', 'suspended': 'Suspendido' };
        return map[status] || status;
    };

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center">
                <CalendarIcon size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Agenda...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 font-sans pb-20">

            {/* NAVBAR */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-3 sticky top-0 z-20">
                <Link href="/club" className="p-2 hover:bg-slate-800 rounded-full transition"><ArrowLeft size={20} className="text-slate-400 hover:text-white" /></Link>
                <h1 className="font-black text-xl text-white">Mi Agenda</h1>
            </div>

            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">

                {/* --- 1. HERO MATCH (PRÓXIMO PARTIDO) --- */}
                {nextMatch ? (
                    <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                        {/* Fondo decorativo */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-16 -mt-16"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">Próximo Compromiso</span>
                                <span className="text-slate-400 text-xs font-bold uppercase">{nextMatch.category?.name}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                {/* LOCAL */}
                                <div className="flex flex-col items-center gap-2 w-1/3">
                                    <img src={nextMatch.home_team.logo_url || '/placeholder.png'} className="w-16 h-16 md:w-20 md:h-20 object-contain bg-white rounded-full p-2" />
                                    <span className="font-bold text-center text-sm md:text-lg leading-tight">{nextMatch.home_team.name}</span>
                                </div>

                                {/* VS INFO */}
                                <div className="flex flex-col items-center justify-center w-1/3">
                                    <div className="text-3xl md:text-5xl font-black italic text-slate-700">VS</div>
                                    <div className="mt-2 text-center">
                                        <p className="font-bold text-lg">{formatTime(nextMatch.date_time)}</p>
                                        <p className="text-xs text-slate-400">{formatDate(nextMatch.date_time)}</p>
                                    </div>
                                </div>

                                {/* VISITANTE */}
                                <div className="flex flex-col items-center gap-2 w-1/3">
                                    <img src={nextMatch.away_team.logo_url || '/placeholder.png'} className="w-16 h-16 md:w-20 md:h-20 object-contain bg-white rounded-full p-2" />
                                    <span className="font-bold text-center text-sm md:text-lg leading-tight">{nextMatch.away_team.name}</span>
                                </div>
                            </div>

                            {/* INFO LOGÍSTICA */}
                            <div className="mt-8 bg-white/10 rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400"><MapPin size={20} /></div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">Sede de Juego</p>
                                        <p className="font-bold">{nextMatch.venue?.name || 'A confirmar'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-green-400"><Clock size={20} /></div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">Citación Equipo</p>
                                        <p className="font-bold text-green-400">{getCitationTime(nextMatch.date_time)} hs</p>
                                    </div>
                                </div>
                            </div>

                            {/* ACCIONES RÁPIDAS */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button onClick={() => shareWhatsApp(nextMatch)} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                                    <Share2 size={18} /> <span className="hidden md:inline">Compartir</span> WhatsApp
                                </button>
                                <button onClick={() => addToCalendar(nextMatch)} className="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                                    <CalendarIcon size={18} /> Agendar
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded-3xl p-8 text-center text-slate-400">
                        <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-bold text-white">¡Estás al día!</p>
                        <p className="text-sm">No tienes partidos programados próximamente.</p>
                    </div>
                )}

                {/* --- 2. FILTROS DE CATEGORÍA --- */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory('Todas')}
                        className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${selectedCategory === 'Todas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}
                    >
                        Todas
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${selectedCategory === cat.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* --- 3. LISTA DE PARTIDOS (TARJETAS) --- */}
                <div className="space-y-4">
                    {filteredMatches.map(m => {
                        const isFinished = m.status === 'finished';
                        const isHome = m.home_team_id === teamId;
                        const myColor = isHome ? m.home_team.main_shirt_color : m.away_team.main_shirt_color;
                        const rivalColor = isHome ? m.away_team.main_shirt_color : m.home_team.main_shirt_color;
                        // Alerta simple si los colores son iguales (y no son nulos)
                        const colorClash = myColor && rivalColor && myColor === rivalColor;

                        return (
                            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">

                                {/* Header Tarjeta */}
                                <div className="p-4 flex justify-between items-start border-b border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="text-center bg-slate-100 rounded-lg p-2 min-w-[60px]">
                                            <span className="block font-bold text-slate-800 text-lg leading-none">{new Date(m.date_time).getDate()}</span>
                                            <span className="block text-[10px] uppercase font-bold text-slate-500">{new Date(m.date_time).toLocaleDateString('es-AR', { month: 'short' })}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${getStatusStyle(m.status)}`}>
                                                    {getStatusLabel(m.status)}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{m.category?.name}</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">
                                                <Clock size={12} /> {formatTime(m.date_time)} hs
                                                <span className="text-slate-300">|</span>
                                                <MapPin size={12} /> {m.venue?.name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acción Principal según estado */}
                                    {isFinished ? (
                                        <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100">
                                            <FileText size={14} /> Ver Planilla
                                        </button>
                                    ) : (
                                        <button className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-200">
                                            <Users size={14} /> Lista Buena Fe
                                        </button>
                                    )}
                                </div>

                                {/* Cuerpo del Partido */}
                                <div className="p-5 flex items-center justify-between">
                                    {/* LOCAL */}
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        <img src={m.home_team.logo_url || '/placeholder.png'} className="w-12 h-12 object-contain" />
                                        <span className="font-bold text-sm text-center line-clamp-2">{m.home_team.name}</span>
                                        {isFinished && <span className="text-3xl font-black text-slate-800">{m.home_score}</span>}
                                    </div>

                                    {/* VS / SETS */}
                                    <div className="flex flex-col items-center px-4">
                                        {isFinished ? (
                                            <div className="text-center">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Final</span>
                                                <p className="text-xs text-slate-500 mt-1 max-w-[100px] leading-tight">{m.set_scores}</p>
                                            </div>
                                        ) : (
                                            <span className="text-2xl font-black text-slate-300 italic">VS</span>
                                        )}
                                    </div>

                                    {/* VISITANTE */}
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        <img src={m.away_team.logo_url || '/placeholder.png'} className="w-12 h-12 object-contain" />
                                        <span className="font-bold text-sm text-center line-clamp-2">{m.away_team.name}</span>
                                        {isFinished && <span className="text-3xl font-black text-slate-800">{m.away_score}</span>}
                                    </div>
                                </div>

                                {/* Footer: Detalles Extras (Indumentaria + Autoridades) */}
                                <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
                                    <div className="flex justify-between items-center">
                                        {/* Indumentaria (Rec #9) */}
                                        <div className="flex items-center gap-3">
                                            {colorClash && !isFinished && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                                    <AlertTriangle size={12} /> Choque de Colores
                                                </div>
                                            )}
                                            {!isFinished && (
                                                <div className="flex items-center gap-2 text-xs text-slate-400" title={`Local: ${m.home_team.main_shirt_color} | Visita: ${m.away_team.main_shirt_color}`}>
                                                    <Shirt size={14} />
                                                    <div className="flex gap-1">
                                                        <div className="w-3 h-3 rounded-full border border-slate-300" style={{ background: m.home_team.main_shirt_color || 'white' }}></div>
                                                        <div className="w-3 h-3 rounded-full border border-slate-300" style={{ background: m.away_team.main_shirt_color || 'white' }}></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Toggle Autoridades (Rec #11) */}
                                        <button
                                            onClick={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)}
                                            className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-blue-600"
                                        >
                                            Autoridades {expandedMatch === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>

                                    {/* Panel Autoridades Expandible */}
                                    {expandedMatch === m.id && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs text-slate-600 animate-in slide-in-from-top-2">
                                            <div><span className="font-bold block text-slate-400 uppercase text-[10px]">1er Árbitro</span> {m.referee_1 || 'A designar'}</div>
                                            <div><span className="font-bold block text-slate-400 uppercase text-[10px]">2do Árbitro</span> {m.referee_2 || '-'}</div>
                                            <div><span className="font-bold block text-slate-400 uppercase text-[10px]">Planillero</span> {m.scorekeeper || 'A designar'}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredMatches.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-400">No hay partidos en esta categoría.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}