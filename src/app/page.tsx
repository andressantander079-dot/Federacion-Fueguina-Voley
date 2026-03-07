'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import SponsorsBanner from '@/components/home/SponsorsBanner'
import NewsFeed from '@/components/home/NewsFeed'
import Footer from '@/components/layout/Footer'
import { Calendar, Trophy } from 'lucide-react'
import Link from 'next/link'

import LiveMatchFloater from '@/components/home/LiveMatchFloater'

export default function HomePage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false)

    return (
        <div className="min-h-screen bg-white dark:bg-black font-sans text-slate-800 dark:text-slate-100 pb-20">

            {/* Navbar con acceso a callback */}
            <Navbar />

            {/* LIVE MATCHES BANNER */}
            <LiveMatchFloater />

            {/* HERO SECTION */}
            <header className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-tdf-blue">

                {/* Background Image / Overlay */}
                <div className="absolute inset-0 bg-[url('/images/indoor-voley-bg.png')] bg-cover bg-center">
                    {/* TdF Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-tdf-blue/95 via-tdf-blue/80 to-tdf-orange/40 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pt-32 md:pt-40 pb-20">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

                        <div className="mb-8 inline-flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tdf-orange opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-tdf-orange"></span>
                            </span>
                            <span className="text-sm font-bold text-white tracking-widest uppercase shadow-black drop-shadow-md">
                                Temporada 2026
                            </span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter uppercase drop-shadow-2xl animate-in fade-in zoom-in duration-1000 leading-[0.9]">
                            Federación <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-100 to-white transform hover:scale-105 inline-block transition-transform duration-500 cursor-default">
                                Fueguina de Vóley
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-blue-50 mb-12 max-w-2xl mx-auto font-light leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            La plataforma oficial del deporte en el fin del mundo.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 w-full sm:w-auto">
                            <Link
                                href="/fixture"
                                className="w-full sm:w-auto px-10 py-5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-1 flex items-center justify-center gap-3 border border-white/10"
                            >
                                <Calendar className="w-6 h-6" />
                                Ver Partidos
                            </Link>
                            <Link
                                href="/posiciones"
                                className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-lg transition-all backdrop-blur-md flex items-center justify-center gap-3 hover:border-white/30"
                            >
                                <Trophy className="w-6 h-6" />
                                Posiciones
                            </Link>
                        </div>

                    </div>
                </div>
            </header>

            {/* SPONSORS */}
            <SponsorsBanner />

            {/* NEWS FEED */}
            <NewsFeed />

            {/* FOOTER */}
            <Footer />
        </div>
    )
}