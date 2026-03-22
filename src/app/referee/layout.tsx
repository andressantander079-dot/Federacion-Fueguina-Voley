'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Calendar, DollarSign, MessageSquare, LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        const verifyAccess = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!profile || (profile.role !== 'referee' && profile.role !== 'admin')) {
                    setAccessDenied(true);
                    return;
                }

                if (profile.role === 'referee') {
                    const { data: refereeData } = await supabase
                        .from('referees')
                        .select('status')
                        .eq('user_id', user.id)
                        .single();
                        
                    if (refereeData && refereeData.status === 'pendiente') {
                        setIsPending(true);
                    }
                }
            } catch (error) {
                console.error("Referee Auth Error:", error);
                setAccessDenied(true);
            } finally {
                setLoading(false);
            }
        };

        verifyAccess();
    }, [router, supabase]);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-pulse text-white text-xs font-bold uppercase tracking-widest">
                    Verificando...
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                <h1 className="text-3xl font-black mb-2 text-red-500">Acceso Restringido</h1>
                <p className="text-zinc-500 mb-8 max-w-sm">No tienes permisos de Arbitraje ni de Administración para ingresar a esta consola.</p>
                <button
                    onClick={() => router.push('/')}
                    className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 transition"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    if (isPending) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-lg shadow-2xl">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="text-tdf-orange w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-4">Perfil en Evaluación</h1>
                    <p className="text-zinc-400 leading-relaxed mb-8">
                        Tu perfil está siendo evaluado por la Administración. Por favor, envía tu comprobante de pago de la Temporada 2026 por los canales oficiales para ser habilitado.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 p-2 flex overflow-x-auto hide-scrollbar z-50">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[72px] transition-all flex-shrink-0 ${isActive ? 'text-tdf-orange' : 'text-zinc-500'
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
