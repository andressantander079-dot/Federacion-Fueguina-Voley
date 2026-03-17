'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ThemeToggle } from '../ThemeToggle'

import { useSettings } from '@/hooks/useSettings';
import LoginModal from '@/components/auth/LoginModal';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [isLoginOpen, setIsLoginOpen] = useState(false)
    const { settings } = useSettings()

    // Detectar scroll para el efecto de glassmorphism más intenso
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                setScrolled(true)
            } else {
                setScrolled(false)
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${scrolled
                    ? 'bg-gradient-to-r from-tdf-orange/95 via-white/20 to-tdf-blue/95 backdrop-blur-xl border-white/20 shadow-lg py-3'
                    : 'bg-gradient-to-b from-tdf-blue/90 via-tdf-blue/40 to-transparent border-transparent py-5 backdrop-blur-[2px]'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">

                        {/* LOGO */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-tdf-orange rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/20 overflow-hidden">
                                {settings?.logo_url ? (
                                    <img src={settings.logo_url} alt="FVU Logo" className="w-full h-full object-cover" />
                                ) : (
                                    "FVF"
                                )}
                            </div>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-bold leading-none text-white shadow-black drop-shadow-sm">
                                    Federación de Voley Fueguina
                                </h1>
                            </div>
                        </div>


                        {/* MENU DESKTOP */}
                        <div className="hidden md:flex items-center space-x-1">
                            <div className="flex items-center space-x-1 bg-black/20 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                                <NavLink href="/" label="INICIO" />
                                <NavLink href="/noticias" label="NOTICIAS" />
                            </div>

                            <div className="w-px h-6 bg-white/20 mx-2" />

                            <div className="flex items-center space-x-1 bg-black/20 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                                <NavLink href="/fixture" label="FIXTURE" />
                                <NavLink href="/posiciones" label="POSICIONES" />
                            </div>

                            <div className="w-px h-6 bg-white/20 mx-2" />

                            <div className="flex items-center space-x-1 bg-black/20 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                                <NavLink href="/reglamento" label="REGLAMENTO" />
                                <NavLink href="/descargas" label="DESCARGAS" />
                            </div>
                        </div>

                        {/* ACCESO OFICIAL */}
                        <div className="flex items-center gap-4">
                            <ThemeToggle className="text-white hover:bg-white/10" />
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="group flex items-center gap-2 px-5 py-2.5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-full transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 cursor-pointer border border-white/10"
                            >
                                <User className="w-4 h-4" />
                                <span className="text-sm font-semibold tracking-wide">Acceso Oficial</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    )
}

function NavLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-all rounded-full hover:bg-white/10"
        >
            {label}
        </Link>
    )
}
