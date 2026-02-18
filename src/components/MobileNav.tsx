'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, CalendarDays, Trophy, Newspaper, Menu, X,
  BookOpen, Download, Users, FileText,
  LayoutDashboard, Settings, CircleDollarSign,
  Activity, LogOut, ChevronUp
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';

type NavItemProp = {
  href: string;
  label: string;
  action?: boolean; // For special buttons like Menu
  icon?: any; // Icon is secondary in this view, mostly text based like Camera app
};

export default function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [role, setRole] = useState<'public' | 'club' | 'referee' | 'admin'>('public');
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role) {
          // @ts-ignore
          setRole(profile.role);
        }
      }
      setLoading(false);
    };
    checkRole();
  }, [supabase]);

  // CONFIGURATION PER ROLE (Corrected Routes)
  const NAV_ITEMS: Record<string, NavItemProp[]> = {
    public: [
      { href: '/posiciones', label: 'TABLA', icon: Trophy },
      { href: '/fixture', label: 'FIXTURE', icon: CalendarDays },
      { href: '/', label: 'INICIO', icon: Home },
      { href: '/noticias', label: 'NOTICIAS', icon: Newspaper },
      { href: '#menu', label: 'MENÚ', icon: Menu, action: true },
    ],
    club: [
      { href: '/club/plantel', label: 'PLANTEL', icon: Users },
      { href: '/club/agenda', label: 'PARTIDOS', icon: Activity }, // Fixed Route
      { href: '/club/dashboard', label: 'CLUB', icon: Home },
      { href: '/club/tramites', label: 'TRÁMITES', icon: FileText },
      { href: '#menu', label: 'MENÚ', icon: Menu, action: true },
    ],
    referee: [
      { href: '/referee/agenda', label: 'AGENDA', icon: CalendarDays },
      { href: '/referee', label: 'PARTIDOS', icon: Activity },
      { href: '/', label: 'INICIO', icon: Home },
      { href: '/reglamento', label: 'REGLAS', icon: BookOpen },
      { href: '#menu', label: 'MENÚ', icon: Menu, action: true },
    ],
    admin: [
      { href: '/admin/configuracion', label: 'CONFIG', icon: Settings },
      { href: '/admin/treasury', label: 'TESORERÍA', icon: CircleDollarSign }, // Fixed Route
      { href: '/admin', label: 'PANEL', icon: LayoutDashboard },
      { href: '/admin/matches', label: 'TORNEOS', icon: Trophy }, // Fixed Route
      { href: '#menu', label: 'MENÚ', icon: Menu, action: true },
    ]
  };

  const currentItems = NAV_ITEMS[role] || NAV_ITEMS.public;

  // Determine active index
  const activeIdx = useMemo(() => {
    const found = currentItems.findIndex(item => item.href === pathname);
    if (found !== -1) return found;
    // Fallback to center item if exact match not found
    return currentItems.findIndex(item => item.label === 'INICIO' || item.label === 'CLUB' || item.label === 'PANEL');
  }, [pathname, currentItems]);

  // Scroll to active item on mount/change
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const items = container.children;
      if (items[activeIdx]) {
        const item = items[activeIdx] as HTMLElement;
        const containerWidth = container.offsetWidth;
        const itemWidth = item.offsetWidth;
        const itemLeft = item.offsetLeft;

        // Calculate center position
        const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [activeIdx, role]);

  const handleMenuClick = () => setIsMenuOpen(!isMenuOpen);

  if (loading) return null;

  return (
    <>
      {/* MENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute bottom-28 left-0 right-0 mx-auto w-64 bg-zinc-900 border border-zinc-800 rounded-3xl p-2 shadow-2xl animate-in slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 mb-2 text-center">
              <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">Opciones {role === 'public' ? 'FVU' : role}</span>
            </div>
            <div className="flex flex-col gap-1">
              <Link href="/reglamento" className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                <BookOpen size={18} /> Reglamento
              </Link>
              <Link href="/descargas" className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                <Download size={18} /> Descargas
              </Link>
              <div className="h-px bg-white/5 my-2"></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                <span className="text-sm font-bold text-zinc-500">Tema</span>
                <ThemeToggle />
              </div>
              {role !== 'public' && (
                <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }} className="flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition font-bold text-sm mt-2">
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CAMERA DIAL NAVBAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black pb-safe text-white h-24 flex flex-col justify-end overflow-hidden">

        {/* Pointer/Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-yellow-500 animate-bounce-slow">
          <ChevronUp size={20} fill="currentColor" />
        </div>

        {/* Dial Container */}
        <div
          ref={scrollRef}
          className="flex items-center overflow-x-auto no-scrollbar snap-x snap-mandatory py-6 px-[50vw]" // Large padding to allow centering first/last
          style={{ scrollBehavior: 'smooth' }}
        >
          {currentItems.map((item, i) => {
            const isActive = i === activeIdx;
            return (
              <div key={i} className="snap-center shrink-0 px-6 transition-all duration-300 transform origin-center flex flex-col items-center justify-center cursor-pointer">
                {item.action ? (
                  <button
                    onClick={handleMenuClick}
                    className={`font-black text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${isActive ? 'text-yellow-400 scale-110' : 'text-zinc-600 scale-90 hover:text-zinc-400'}`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`font-black text-sm uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${isActive ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-zinc-600 scale-90 hover:text-zinc-400'}`}
                  >
                    {item.label}
                  </Link>
                )}

                {/* Tick Mark below (Camera Style) */}
                <div className={`mt-3 w-0.5 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-yellow-500 h-4' : 'bg-zinc-800'}`}></div>
              </div>
            );
          })}
        </div>

        {/* Side Fade Gradient */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none z-10"></div>

      </div>
    </>
  );
}