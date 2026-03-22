'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, Trophy, ClipboardList, LogOut, Settings, Mail, Megaphone, FileText, UserPlus, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import WarningBanner from '@/components/admin/WarningBanner'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()
    const [unreadMsgs, setUnreadMsgs] = useState(0)
    const [pendingTasksCount, setPendingTasksCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [accessDenied, setAccessDenied] = useState(false)

    useEffect(() => {
        const verifyAccess = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (!profile || profile.role !== 'admin') {
                    setAccessDenied(true)
                    return
                }
            } catch (error) {
                console.error("Admin Auth Error:", error)
                setAccessDenied(true)
            } finally {
                setLoading(false)
            }
        }
        
        verifyAccess()
        setUnreadMsgs(0)
        
        const fetchPendingTasks = async () => {
            const [
                { count: pases },
                { count: procs },
                { count: players },
                { count: coaches },
                { count: refs }
            ] = await Promise.all([
                supabase.from('tramites_pases').select('*', { count: 'exact', head: true }).in('estado', ['esperando_federacion', 'revision_inicial_fvf', 'auditoria_final_fvf']),
                supabase.from('procedures').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
                supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('coaches').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
                supabase.from('referees').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
            ]);
            
            setPendingTasksCount((pases||0) + (procs||0) + (players||0) + (coaches||0) + (refs||0));
        };
        fetchPendingTasks();

        // Listeners multi-tabla
        const channels = supabase.channel('admin_sidebar_counters')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tramites_pases' }, () => fetchPendingTasks())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'procedures' }, () => fetchPendingTasks())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchPendingTasks())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coaches' }, () => fetchPendingTasks())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'referees' }, () => fetchPendingTasks())
            .subscribe();
            
        return () => { supabase.removeChannel(channels); };
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <LayoutDashboard size={48} className="text-blue-500 mb-4 opacity-50" />
                    <p className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-xs">Verificando Credenciales...</p>
                </div>
            </div>
        )
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <Shield size={64} className="text-red-500 mb-6" />
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Acceso Denegado</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                    No tienes los privilegios necesarios de Administrador para ver esta sección.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
                >
                    Volver al Inicio
                </button>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-white text-orange-700 dark:bg-zinc-900 dark:text-gray-100 transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-64 bg-blue-600 text-white hidden md:flex flex-col fixed inset-y-0 shadow-xl border-r border-white/5">
                <div className="p-4 border-b border-white/10 bg-blue-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-white overflow-hidden p-1">
                            <img src="/logo-fvf.png" alt="FVF" className="object-contain w-full h-full" />
                        </span>
                        <span className="tracking-tight">Panel Admin</span>
                    </h2>
                </div>

                <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto mb-2 custom-scrollbar">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-2">Gestión</div>
                    <AdminNavLink href="/admin" icon={<LayoutDashboard size={18} />} label="Inicio" />

                    <AdminNavLink href="/admin/mensajes" icon={<Mail size={18} />} label="Mensajes" badge={unreadMsgs} />
                    <AdminNavLink href="/admin/noticias" icon={<Megaphone size={18} />} label="Noticias" />

                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-4">Deportivo</div>
                    <AdminNavLink href="/admin/competencias" icon={<Trophy size={18} />} label="Competencias" />
                    <AdminNavLink href="/admin/equipos" icon={<Users size={18} />} label="Equipos" />

                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-4">Institucional</div>
                    <AdminNavLink href="/admin/tramites" icon={<ClipboardList size={18} />} label="Trámites" badge={pendingTasksCount} />
                    <AdminNavLink href="/admin/reglamentos" icon={<FileText size={18} />} label="Reglamentos" />
                    <AdminNavLink href="/admin/configuracion" icon={<Settings size={18} />} label="Configuración" />
                </nav>

                <div className="p-3 border-t border-white/10 bg-black/20 flex flex-col gap-2 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg w-full transition-all group text-sm"
                    >
                        <LogOut size={18} className="group-hover:text-tdf-orange transition-colors" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 transition-all duration-300 relative">
                {/* Top Bar for Theme Toggle */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                    <button
                        onClick={handleLogout}
                        className="md:hidden w-10 h-10 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-red-50 transition-colors"
                        title="Salir al Inicio"
                    >
                        <LogOut size={18} />
                    </button>
                    <ThemeToggle className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-lg" />
                </div>

                <WarningBanner />
                {children}
            </main>
        </div>
    )
}

function AdminNavLink({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string, badge?: number }) {
    // Basic implementation - Active state logic would require usePathname
    return (
        <Link
            href={href}
            className="flex items-center justify-between px-3 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium text-sm hover:pl-4 group"
        >
            <div className="flex items-center gap-3">
                <span className="opacity-70 group-hover:opacity-100">{icon}</span>
                <span>{label}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="bg-tdf-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {badge}
                </span>
            )}
        </Link>
    )
}
