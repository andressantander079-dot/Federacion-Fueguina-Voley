'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, Send, PenSquare, ArrowLeft, Mail } from 'lucide-react'

export default function MessagesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition text-gray-500">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="text-tdf-blue dark:text-tdf-orange" /> Mesa de Entrada
                        </h1>
                        <p className="text-xs text-gray-500">Comunicaciones oficiales y notificaciones.</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    <TabLink
                        href="/admin/mensajes/redactar"
                        active={pathname === '/admin/mensajes/redactar'}
                        icon={<PenSquare size={16} />}
                        label="Redactar"
                        accentColor="text-tdf-blue dark:text-blue-400"
                    />
                    <TabLink
                        href="/admin/mensajes"
                        active={pathname === '/admin/mensajes'}
                        icon={<Inbox size={16} />}
                        label="Bandeja de Entrada"
                        accentColor="text-emerald-600 dark:text-emerald-400"
                    />
                    <TabLink
                        href="/admin/mensajes/enviados"
                        active={pathname === '/admin/mensajes/enviados'}
                        icon={<Send size={16} />}
                        label="Enviados"
                        accentColor="text-purple-600 dark:text-purple-400"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

function TabLink({ href, active, icon, label, accentColor }: any) {
    return (
        <Link
            href={href}
            className={`
                px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
                ${active
                    ? `bg-white dark:bg-black shadow-sm ${accentColor}`
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50'
                }
            `}
        >
            {icon}
            <span className="hidden md:inline">{label}</span>
        </Link>
    )
}
