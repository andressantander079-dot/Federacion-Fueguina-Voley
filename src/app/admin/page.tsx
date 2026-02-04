'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    LayoutDashboard,
    Trophy,
    Users,
    ClipboardList,
    Settings,
    FileText,
    Megaphone,
    ArrowRight,
    MessageSquare,
    UserPlus,
    FileSignature,
    Loader2,
    Wallet,
    Shield,
    UserCog,
    Calendar
} from 'lucide-react'
import RecentMatches from '@/components/admin/RecentMatches';
import { createClient } from '@/lib/supabase/client';

// Definición de las tarjetas del mosaico
const getMosaicCards = (counts: any) => [
    {
        title: 'Mesa de Entrada',
        description: 'Bandeja de mensajes.',
        href: '/admin/mensajes',
        icon: <MessageSquare className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-purple-500 to-indigo-600',
        delay: 'delay-100',
        badge: counts.mensajes
    },
    {
        title: 'Competencias',
        description: 'Gestión de torneos y fixture.',
        href: '/admin/competencias',
        icon: <Trophy className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-blue-400 to-tdf-blue',
        delay: 'delay-200',
        badge: 0
    },
    {
        title: 'Equipos',
        description: 'Clubes, planteles y jugadores.',
        href: '/admin/equipos',
        icon: <Users className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-emerald-400 to-teal-600',
        delay: 'delay-300',
        badge: 0
    },
    {
        title: 'Agenda',
        description: 'Calendario y reuniones.',
        href: '/admin/agenda',
        icon: <Calendar className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-pink-500 to-rose-600',
        delay: 'delay-300',
        badge: 0
    },
    {
        title: 'Trámites',
        description: 'Pagos, pases y fichajes.',
        href: '/admin/tramites',
        icon: <FileSignature className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-indigo-400 to-purple-600',
        delay: 'delay-400',
        badge: counts.tramites
    },
    {
        title: 'Reglamentos',
        description: 'Documentación oficial.',
        href: '/admin/reglamento-upload',
        icon: <ClipboardList className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-slate-400 to-slate-600',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Configuración',
        description: 'Sedes y sistema.',
        href: '/admin/configuracion',
        icon: <Settings className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-gray-700 to-black',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Tesorería',
        description: 'Gestión financiera y balance.',
        href: '/admin/treasury',
        icon: <Wallet className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-emerald-600 to-teal-800',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Colegio de Árbitros',
        description: 'Padrón, designaciones y actas.',
        href: '/admin/arbitros',
        icon: <Shield className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-blue-600 to-cyan-700',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Designaciones',
        description: 'Asignar árbitros a partidos.',
        href: '/admin/designaciones',
        icon: <UserCog className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-orange-500 to-red-500',
        delay: 'delay-500',
        badge: 0
    }
]

export default function AdminDashboardPage() {
    const supabase = createClient();

    const [counts, setCounts] = useState({
        mensajes: 0,
        tramites: 0,
        equipos: 0,
        torneos: 0,
        jugadores: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCounts();
    }, []);

    async function fetchCounts() {
        try {
            // 1. Mensajes sin leer / abiertos
            const { count: msgCount } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'abierto');

            // 2. Trámites en revisión
            const { count: procCount } = await supabase
                .from('procedures')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'en_revision');

            // 3. Equipos
            const { count: teamCount } = await supabase
                .from('teams')
                .select('*', { count: 'exact', head: true });

            // 4. Torneos Activos
            const { count: tournamentCount } = await supabase
                .from('tournaments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            // 5. Jugadores
            const { count: playerCount } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true });


            setCounts({
                mensajes: msgCount || 0,
                tramites: procCount || 0,
                equipos: teamCount || 0,
                torneos: tournamentCount || 0,
                jugadores: playerCount || 0
            });
        } catch (error) {
            console.error("Error fetching counts", error);
        } finally {
            setLoading(false);
        }
    }

    const cards = getMosaicCards(counts);

    return (
        <div className="p-4 md:p-8 min-h-screen transition-colors duration-500">

            {/* Header */}
            <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-3xl md:text-4xl font-black text-orange-900 dark:text-white tracking-tight mb-2">
                    Panel de Control <span className="text-tdf-orange">FVU</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Bienvenido al sistema de gestión centralizada.
                </p>
            </header>

            {/* Recent Matches & Agenda */}
            <RecentMatches />

            {/* Mosaic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                {cards.map((card, index) => (
                    <Link
                        key={index}
                        href={card.href}
                        className={`group relative overflow-hidden rounded-3xl p-6 h-64 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl shadow-lg bg-white dark:bg-zinc-900 border border-transparent hover:border-white/20 animate-in fade-in zoom-in ${card.delay}`}
                    >
                        {/* Background Gradient Effect on Hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.tdfColor} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500`} />

                        {/* Icon Background Bubble */}
                        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${card.tdfColor} opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-700 ease-out`} />

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.tdfColor} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    {card.icon}
                                </div>
                                {card.badge > 0 && (
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-black text-xs shadow-lg animate-pulse ring-4 ring-white dark:ring-zinc-900">
                                        {card.badge}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-2xl font-bold text-orange-900 dark:text-white mb-1 group-hover:text-tdf-blue dark:group-hover:text-tdf-orange transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {card.description}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-sm font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors uppercase tracking-widest bg-gray-50 dark:bg-black/20 w-fit px-4 py-2 rounded-full mt-auto backdrop-blur-sm self-start">
                            Ingresar
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Row (Debajo del Mosaico) */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-tdf-blue dark:text-white mb-1">
                        {loading ? <Loader2 className="animate-spin" /> : counts.equipos}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Equipos</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-tdf-orange mb-1">
                        {loading ? <Loader2 className="animate-spin" /> : counts.torneos}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Torneos Activos</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-orange-900 dark:text-white mb-1">
                        {loading ? <Loader2 className="animate-spin" /> : counts.jugadores}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Jugadores</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-emerald-500 mb-1">OK</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Estado Sistema</div>
                </div>
            </div>

        </div>
    )
}
