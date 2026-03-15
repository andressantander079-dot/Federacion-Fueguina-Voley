'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Calendar, DollarSign, MessageSquare, LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const navItems = [
        { href: '/referee', label: 'Inicio', icon: Home },
        { href: '/referee/agenda', label: 'Agenda', icon: Calendar },
        { href: '/referee/mensajes', label: 'Mensajes', icon: MessageSquare },
        { href: '/referee/reportes', label: 'Reportes', icon: DollarSign },
        { href: '/referee/perfil', label: 'Mi Perfil', icon: User },
    ];

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <h1 className="font-black text-lg tracking-tight">ÁRBITROS <span className="text-tdf-orange">FVF</span></h1>
                <button onClick={handleLogout} className="text-zinc-500 hover:text-white"><LogOut size={20} /></button>
            </div>

            <div className="flex">
                {/* Sidebar (Desktop) */}
                <aside className="hidden md:flex flex-col w-64 border-r border-white/10 h-screen sticky top-0 bg-zinc-950 p-6">
                    <div className="mb-10">
                        <h1 className="text-2xl font-black tracking-tighter">ÁRBITROS <span className="text-tdf-orange">FVF</span></h1>
                        <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest">Panel de Control</p>
                    </div>

                    <nav className="space-y-2 flex-grow">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${isActive
                                        ? 'bg-tdf-orange text-white shadow-lg shadow-orange-900/20'
                                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon size={20} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold mt-auto"
                    >
                        <LogOut size={20} />
                        Cerrar Sesión
                    </button>
                </aside>

                {/* Content */}
                <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 p-2 flex justify-around z-50">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl w-16 transition-all ${isActive ? 'text-tdf-orange' : 'text-zinc-500'
                                }`}
                        >
                            <Icon size={24} className={isActive ? 'mb-1' : ''} />
                            {isActive && <span className="text-[10px] font-bold">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
