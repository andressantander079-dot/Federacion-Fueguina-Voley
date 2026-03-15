'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useClubAuth } from '@/hooks/useClubAuth';
import {
    LayoutDashboard, Users, Trophy, MessageSquare,
    FileText, Briefcase, Settings, LogOut, Shield
} from 'lucide-react';

interface SidebarProps {
    clubName?: string;
    logoUrl?: string;
    onLogout: () => void;
}

export default function ClubSidebar({ clubName, logoUrl, onLogout }: SidebarProps) {
    const pathname = usePathname();

    const { clubId } = useClubAuth();
    const [supabase] = useState(() => createClient());
    const [pendingPases, setPendingPases] = useState(0);

    useEffect(() => {
        if (!clubId) return;
        const fetchPending = async () => {
            const { count } = await supabase
                .from('tramites_pases')
                .select('*', { count: 'exact', head: true })
                .eq('origen_club_id', clubId)
                .eq('estado', 'solicitado');
            setPendingPases(count || 0);
        };
        fetchPending();
        
        const channel = supabase.channel('pases_club_sidebar')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tramites_pases', filter: `origen_club_id=eq.${clubId}` }, () => {
                 fetchPending();
            }).subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [clubId, supabase]);

    const menuItems = [
        { name: 'Dashboard', href: '/club', icon: LayoutDashboard },
        { name: 'Mis Categorías', href: '/club/plantel', icon: Users },
        { name: 'Competencias', href: '/club/competitions', icon: Trophy },
        { name: 'Agenda', href: '/club/agenda', icon: FileText },
        { name: 'Trámites', href: '/club/tramites', icon: Briefcase, badge: pendingPases },
        { name: 'Mensajería', href: '/club/mensajes', icon: MessageSquare },
    ];

    return (
        <aside className="w-64 bg-slate-950 border-r border-slate-900 hidden md:flex flex-col h-screen sticky top-0">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Club Logo" className="w-full h-full object-contain" />
                    ) : (
                        <Shield className="text-slate-600" size={20} />
                    )}
                </div>
                <div>
                    <h2 className="text-white font-bold text-sm leading-tight line-clamp-1">{clubName || 'Mi Club'}</h2>
                    <p className="text-xs text-slate-500 font-medium">Panel de Gestión</p>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex justify-between items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-bold'
                                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'} />
                                <span className="text-sm">{item.name}</span>
                            </div>
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-red-400/50 shadow-sm">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-900">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-colors group"
                >
                    <LogOut size={18} className="group-hover:text-red-500" />
                    <span className="text-sm font-bold">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
