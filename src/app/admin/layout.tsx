'use client'

import React from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, Trophy, ClipboardList, LogOut, Settings, Mail, Megaphone, FileText, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import WarningBanner from '@/components/admin/WarningBanner'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Sidebar */}
            <aside className="w-64 bg-tdf-blue-dark text-white hidden md:flex flex-col fixed inset-y-0 shadow-xl border-r border-white/5">
                <div className="p-6 border-b border-white/10 bg-tdf-blue">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 bg-tdf-orange rounded-lg flex items-center justify-center text-xs shadow-lg">FVU</span>
                        <span className="tracking-tight">Panel Admin</span>
                    </h2>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-4">Gestión</div>
                    <AdminNavLink href="/admin" icon={<LayoutDashboard size={20} />} label="Inicio" />
                    <AdminNavLink href="/admin/solicitudes" icon={<UserPlus size={20} />} label="Solicitudes" />
                    <AdminNavLink href="/admin/mensajes" icon={<Mail size={20} />} label="Mensajes" />
                    <AdminNavLink href="/admin/noticias" icon={<Megaphone size={20} />} label="Noticias" />

                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">Deportivo</div>
                    <AdminNavLink href="/admin/competencias" icon={<Trophy size={20} />} label="Competencias" />
                    <AdminNavLink href="/admin/equipos" icon={<Users size={20} />} label="Equipos" />

                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">Institucional</div>
                    <AdminNavLink href="/admin/tramites" icon={<ClipboardList size={20} />} label="Trámites" />
                    <AdminNavLink href="/admin/reglamentos" icon={<FileText size={20} />} label="Reglamentos" />
                    <AdminNavLink href="/admin/configuracion" icon={<Settings size={20} />} label="Configuración" />
                </nav>

                <div className="p-4 border-t border-white/10 bg-black/20 flex flex-col gap-2">
                    <ThemeToggle className="w-full flex justify-center bg-white/5 hover:bg-white/10 text-slate-300 hover:text-yellow-400 border border-transparent hover:border-white/10" />
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg w-full transition-all group"
                    >
                        <LogOut size={20} className="group-hover:text-tdf-orange transition-colors" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 transition-all duration-300 relative">
                <WarningBanner />
                {children}
            </main>
        </div>
    )
}

function AdminNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    // Basic implementation - Active state logic would require usePathname
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium hover:pl-5"
        >
            <span className="opacity-70 group-hover:opacity-100">{icon}</span>
            <span>{label}</span>
        </Link>
    )
}
