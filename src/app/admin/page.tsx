'use client'

import Link from 'next/link'
import {
    LayoutDashboard,
    Trophy,
    Users,
    ClipboardList,
    Settings,
    FileText,
    Megaphone,
    ArrowRight
} from 'lucide-react'
import RecentMatches from '@/components/admin/RecentMatches';

// Definición de las tarjetas del mosaico
const MOSAIC_CARDS = [
    {
        title: 'Mensajes', // Position 0 (Previously Noticias) -> New Requirement: Messages here
        description: 'Bandeja de entrada y comunicados.',
        href: '/admin/mensajes',
        icon: <Megaphone className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-purple-500 to-indigo-600',
        delay: 'delay-0'
    },
    {
        title: 'Competencias', // Renamed from Torneos to match sidebar/user term often? Or keep Torneos? User said "Competencias" in text.
        description: 'Gestión de torneos y fixture.',
        href: '/admin/competencias',
        icon: <Trophy className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-blue-400 to-tdf-blue',
        delay: 'delay-100'
    },
    {
        title: 'Equipos',
        description: 'Clubes, planteles y jugadores.',
        href: '/admin/equipos',
        icon: <Users className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-emerald-400 to-teal-600',
        delay: 'delay-200'
    },
    {
        title: 'Noticias', // Moved to Position 3 (Replacing Fixture)
        description: 'Novedades para la portada.',
        href: '/admin/noticias',
        icon: <FileText className="w-8 h-8" />, // Changed icon slightly? Or keep Clipboard? Using FileText for News.
        color: '',
        tdfColor: 'from-orange-400 to-tdf-orange',
        delay: 'delay-300'
    },
    {
        title: 'Reglamentos',
        description: 'Documentación oficial.',
        href: '/admin/reglamentos',
        icon: <ClipboardList className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-slate-400 to-slate-600',
        delay: 'delay-400'
    },
    {
        title: 'Trámites', // User mentioned "Tramites Federativos"
        description: 'Pases y fichajes.',
        href: '/admin/tramites',
        icon: <Settings className="w-8 h-8" />, // Placeholder icon
        color: '',
        tdfColor: 'from-gray-700 to-black',
        delay: 'delay-500'
    }
]

export default function AdminDashboardPage() {
    return (
        <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900">

            {/* Header */}
            <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                    Panel de Control <span className="text-tdf-orange">FVU</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Bienvenido al sistema de gestión centralizada.
                </p>
            </header>

            {/* Recent Matches & Agenda */}
            <RecentMatches />

            {/* Mosaic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOSAIC_CARDS.map((card, index) => (
                    <Link
                        key={index}
                        href={card.href}
                        className={`group relative overflow-hidden rounded-3xl p-6 h-64 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl shadow-lg bg-white dark:bg-zinc-900 border border-transparent hover:border-white/20 animate-in fade-in zoom-in ${card.delay}`}
                    >
                        {/* Background Gradient Effect on Hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.tdfColor} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        {/* Icon Background Bubble */}
                        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${card.tdfColor} opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-700 ease-out`} />

                        <div className="relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.tdfColor} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                {card.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-tdf-blue dark:group-hover:text-tdf-orange transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {card.description}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-sm font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors uppercase tracking-widest bg-gray-50 dark:bg-black/20 w-fit px-4 py-2 rounded-full mt-auto">
                            Ingresar
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Row (Optional, debajo del Mosaico) */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-tdf-blue dark:text-white mb-1">24</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Equipos</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-tdf-orange mb-1">8</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Torneos Activos</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-slate-800 dark:text-white mb-1">156</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Jugadores</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-green-500 mb-1">OK</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Estado Sistema</div>
                </div>
            </div>

        </div>
    )
}
