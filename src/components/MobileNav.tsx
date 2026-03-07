'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, CalendarDays, Trophy, Newspaper, Menu, X,
  BookOpen, Download, Users, FileText,
  LayoutDashboard, Settings, CircleDollarSign,
  Activity, LogOut, Plus
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';

type NavItemProp = {
  href: string;
  label: string;
  icon: any;
};

export default function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [role, setRole] = useState<'public' | 'club' | 'referee' | 'admin'>('public');
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) setRole(profile.role as any);
      }
      setLoading(false);
    };
    checkRole();
  }, [supabase]);

  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.pageYOffset;

      // Ensure Nav is always visible at the absolute top of the page
      if (scrollY < 20) {
        setIsVisible(true);
        lastScrollY = scrollY;
        ticking = false;
        return;
      }

      // Ignore very small scroll jumps (bounce effect on mobile)
      if (Math.abs(scrollY - lastScrollY) < 15) {
        ticking = false;
        return;
      }

      // Hide only when scrolling down aggressively
      if (scrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        // Show immediately when scrolling up
        setIsVisible(true);
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Unified configuration (Exactly 4 items per role)
  const NAV_CONFIG: Record<string, NavItemProp[]> = {
    public: [
      { href: '/', label: 'Inicio', icon: Home },
      { href: '/fixture', label: 'Fixture', icon: CalendarDays },
      { href: '/posiciones', label: 'Posiciones', icon: Trophy },
      { href: '/noticias', label: 'Noticias', icon: Newspaper },
    ],
    club: [
      { href: '/club/dashboard', label: 'Inicio', icon: Home },
      { href: '/club/plantel', label: 'Plantel', icon: Users },
      { href: '/club/agenda', label: 'Partidos', icon: Activity },
      { href: '/club/tramites', label: 'Trámites', icon: FileText },
    ],
    referee: [
      { href: '/', label: 'Inicio', icon: Home },
      { href: '/referee/agenda', label: 'Agenda', icon: CalendarDays },
      { href: '/referee', label: 'Partidos', icon: Activity },
      { href: '/reglamento', label: 'Reglas', icon: BookOpen },
    ],
    admin: [
      { href: '/admin/treasury', label: 'Tesorería', icon: CircleDollarSign },
      { href: '/admin/competencias', label: 'Competencias', icon: Trophy },
      { href: '/admin/tramites', label: 'Trámites', icon: FileText },
      { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
    ]
  };

  const navItems = NAV_CONFIG[role] || NAV_CONFIG.public;

  // Compute active index [0..3]
  const activeIdx = useMemo(() => {
    return navItems.findIndex(item => item.href === pathname);
  }, [pathname, navItems]);

  const handleMenuClick = () => setIsMenuOpen(!isMenuOpen);

  if (loading) return null;

  // Calculate sliding indicator multiplier based on 5 theoretical columns (20vw each)
  const getIndicatorIndex = (idx: number) => {
    if (idx === -1) return -1;
    // If idx < 2 (left side: col 0 or 1), multiplier = idx.
    // If idx >= 2 (right side), we skip the center (col 2), so multiplier = idx + 1
    return idx < 2 ? idx : idx + 1;
  };

  const indicatorIndex = getIndicatorIndex(activeIdx);

  // Determine standard app background to fake the cutout effectively
  const appBgBorder = role === 'public'
    ? 'border-white dark:border-black'
    : 'border-gray-50 dark:border-zinc-950';

  return (
    <>
      {/* MENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute bottom-32 left-0 right-0 mx-auto w-64 bg-zinc-900 border border-zinc-800 rounded-3xl p-2 shadow-2xl animate-in slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 mb-2 flex items-center justify-between">
              <span className="text-xs font-black text-tdf-orange uppercase tracking-widest">Opciones {role === 'public' ? 'FVU' : role}</span>
              <button onClick={() => setIsMenuOpen(false)} className="text-zinc-500 hover:text-white transition"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-1">
              <Link href="/reglamento" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                <BookOpen size={18} /> Reglamento Oficial
              </Link>
              <Link href="/descargas" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                <Download size={18} /> Centro de Descargas
              </Link>
              <div className="h-px bg-white/5 my-2"></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                <span className="text-sm font-bold text-zinc-500">Apariencia</span>
                <ThemeToggle />
              </div>
              {role === 'admin' && (
                <>
                  <div className="h-px bg-white/5 my-2"></div>
                  <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-tdf-orange hover:bg-orange-500/10 transition font-black text-sm">
                    <LayoutDashboard size={18} /> Ir al Panel Principal
                  </Link>
                  <Link href="/admin/arbitros" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                    <Users size={18} /> Colegio de Árbitros
                  </Link>
                  <Link href="/admin/programar" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                    <CalendarDays size={18} /> Designaciones de Partidos
                  </Link>
                </>
              )}
              {role !== 'public' && (
                <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }} className="w-full flex items-center justify-start gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition font-bold text-sm mt-2">
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAV WITH SAFE AREA FOR iOS/ANDROID */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[calc(env(safe-area-inset-bottom)+8px)] px-2 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>

        {/* Main curved container */}
        <div className="w-full max-w-lg mx-auto h-[88px] relative bg-zinc-900 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.6)] pointer-events-auto flex items-end">

          {/* Animated Top Indicator */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-t-[2.5rem]">
            <div
              className={`absolute top-0 w-[20%] h-1.5 flex justify-center transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${indicatorIndex === -1 ? 'opacity-0 translate-y-2' : 'opacity-100'}`}
              style={{ transform: indicatorIndex !== -1 ? `translateX(${indicatorIndex * 100}%)` : 'translateX(0)' }}
            >
              <div className="w-10 h-full bg-tdf-orange rounded-b-full shadow-[0_4px_12px_rgba(250,90,0,0.8)]" />
            </div>
          </div>

          <div className="flex w-full h-[72px] relative z-10">
            {/* Left Items (0 and 1) */}
            <div className="flex w-2/5 h-full">
              {navItems.slice(0, 2).map((item, idx) => {
                const isActive = activeIdx === idx;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="w-1/2 h-full flex flex-col items-center justify-center gap-1.5 tap-highlight-transparent active:scale-95 transition-transform"
                  >
                    <Icon size={24} className={`transition-all duration-300 ${isActive ? 'text-tdf-orange scale-110 drop-shadow-[0_2px_8px_rgba(250,90,0,0.4)]' : 'text-zinc-500 scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[10px] font-bold transition-colors duration-300 ${isActive ? 'text-tdf-orange' : 'text-zinc-500'}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Central FAB Area (Space) */}
            <div className="w-1/5 h-full flex justify-center relative pointer-events-none">
              <div className="absolute -top-[42px] pointer-events-auto">
                {/* The "Cutout" is actually a thick border matching the background */}
                <button
                  onClick={handleMenuClick}
                  className={`w-[72px] h-[72px] bg-zinc-950 border-[8px] ${appBgBorder} rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-inner group`}
                >
                  {/* Green/Orange inner accent matching the image "plus" button vibe */}
                  <div className="w-12 h-12 rounded-full bg-tdf-orange flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Menu size={24} strokeWidth={2.5} />
                  </div>
                </button>
              </div>
            </div>

            {/* Right Items (2 and 3) */}
            <div className="flex w-2/5 h-full">
              {navItems.slice(2, 4).map((item, idx) => {
                const globalIdx = idx + 2;
                const isActive = activeIdx === globalIdx;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="w-1/2 h-full flex flex-col items-center justify-center gap-1.5 tap-highlight-transparent active:scale-95 transition-transform"
                  >
                    <Icon size={24} className={`transition-all duration-300 ${isActive ? 'text-tdf-orange scale-110 drop-shadow-[0_2px_8px_rgba(250,90,0,0.4)]' : 'text-zinc-500 scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[10px] font-bold transition-colors duration-300 ${isActive ? 'text-tdf-orange' : 'text-zinc-500'}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}