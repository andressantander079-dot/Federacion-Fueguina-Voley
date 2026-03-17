'use client'

import Link from 'next/link'
import { User, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ThemeToggle } from '../ThemeToggle'

import { useSettings } from '@/hooks/useSettings';
import LoginModal from '@/components/auth/LoginModal';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [isLoginOpen, setIsLoginOpen] = useState(false)
    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false)
    const { settings } = useSettings()

    const logoSrc = settings?.logo_url || "/logo-fvf.png"

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Cerrar modal con Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLogoModalOpen(false)
        }
        if (isLogoModalOpen) {
            document.addEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [isLogoModalOpen])

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
                            <button
                                onClick={() => setIsLogoModalOpen(true)}
                                className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 shadow-lg shadow-black/30 flex-shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer bg-white"
                                aria-label="Ver logo"
                            >
                                <img
                                    src={logoSrc}
                                    alt="FVF Logo"
                                    className="w-full h-full object-cover"
                                />
                            </button>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-bold leading-none text-white shadow-black drop-shadow-sm">
                                    Federación de Voley Fueguino
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

            {/* MODAL DEL LOGO */}
            {isLogoModalOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    onClick={() => setIsLogoModalOpen(false)}
                >
                    {/* Backdrop difuminado, NO bloquea el contenido */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Logo circular centrado */}
                    <div
                        className="relative z-10 flex flex-col items-center gap-4 animate-in zoom-in-75 fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Botón cerrar */}
                        <button
                            onClick={() => setIsLogoModalOpen(false)}
                            className="self-end w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors border border-white/30"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Imagen circular */}
                        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white/50 shadow-2xl shadow-black/60 bg-white">
                            <img
                                src={logoSrc}
                                alt="Logo FVF"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            )}

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
