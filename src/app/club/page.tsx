'use client';

import Link from 'next/link';
import {
    Users, Trophy, Calendar,
    FileText, MessageSquare, Briefcase,
    ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ClubDashboard() {
    const [clubName, setClubName] = useState('Mi Club');

    useEffect(() => {
        // Quick fetch for the welcome message
        async function getName() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                if (profile?.full_name) setClubName(profile.full_name);
            }
        }
        getName();
    }, []);

    const cards = [
        {
            title: "Mis Categorías",
            desc: "Administra listas de buena fe, jugadores y staff técnico.",
            href: "/club/plantel",
            icon: Users,
            color: "from-blue-600 to-blue-400",
            delay: "delay-0"
        },
        {
            title: "Competencias",
            desc: "Fixtures, resultados y tablas de posiciones en tiempo real.",
            href: "/club/competitions",
            icon: Trophy,
            color: "from-purple-600 to-indigo-400",
            delay: "delay-100"
        },
        {
            title: "Agenda",
            desc: "Próximos partidos, entrenamientos y eventos del club.",
            href: "/club/agenda",
            icon: Calendar,
            color: "from-emerald-600 to-teal-400",
            delay: "delay-200"
        },
        {
            title: "Trámites",
            desc: "Pagos, pases y gestiones administrativas.",
            href: "/club/tramites",
            icon: Briefcase,
            color: "from-rose-600 to-pink-400",
            delay: "delay-300"
        },
        {
            title: "Mensajería",
            desc: "Canal oficial de comunicación con la Federación.",
            href: "/club/mensajes",
            icon: MessageSquare,
            color: "from-amber-500 to-orange-400",
            delay: "delay-400"
        }
    ];

    return (
        <div className="p-6 md:p-10 min-h-screen bg-transparent">
            {/* Header */}
            <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                    Panel de Gestión
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Bienvenido, <span className="font-bold text-slate-800 dark:text-slate-200">{clubName}</span>.
                </p>
            </header>

            {/* Mosaic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {cards.map((card, index) => (
                    <Link
                        key={index}
                        href={card.href}
                        className={`group relative overflow-hidden rounded-3xl p-8 h-64 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl shadow-lg bg-white dark:bg-zinc-900 border border-transparent hover:border-white/20 animate-in fade-in zoom-in ${card.delay}`}
                    >
                        {/* Gradient Background (Hover) */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        <div className="relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-500`}>
                                <card.icon size={28} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                                {card.desc}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white font-bold text-sm transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300">
                            <span>Ingresar</span>
                            <ArrowRight size={16} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
