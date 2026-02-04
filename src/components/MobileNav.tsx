// src/components/MobileNav.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Trophy, Newspaper, Menu, X, BookOpen, Download, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* MENU OVERLAY (Popup) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute bottom-[80px] right-4 w-60 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-3 font-bold text-xs text-zinc-500 uppercase tracking-wider bg-zinc-950/50 border-b border-zinc-800">
              Opciones
            </div>
            <div className="flex flex-col p-2">
              <MenuLink href="/reglamento" icon={BookOpen} label="Reglamento" onClick={() => setIsMenuOpen(false)} />
              <MenuLink href="/descargas" icon={Download} label="Descargas" onClick={() => setIsMenuOpen(false)} />
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 mt-2">
                <span className="text-sm font-bold text-zinc-400">Tema</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        <div className="bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 pb-safe pt-1 px-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center h-[60px]">

            {/* 1. TABLA (Posiciones) */}
            <NavItem href="/posiciones" icon={Trophy} label="Tabla" active={isActive('/posiciones')} />

            {/* 2. FIXTURE */}
            <NavItem href="/fixture" icon={CalendarDays} label="Fixture" active={isActive('/fixture')} />

            {/* 3. INICIO (Central) */}
            <div className="relative -top-6">
              <Link href="/" className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-orange-600/40 border-4 border-zinc-900 transition-transform active:scale-95 ${isActive('/') ? 'bg-white text-orange-600' : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'}`}>
                <Home className="w-6 h-6" fill="currentColor" strokeWidth={0} />
              </Link>
              <span className="absolute -bottom-5 w-full text-center text-[10px] font-bold text-zinc-400">Inicio</span>
            </div>

            {/* 4. NOTICIAS */}
            <NavItem href="/noticias" icon={Newspaper} label="Noticias" active={isActive('/noticias')} />

            {/* 5. MENU HAMBURGUESA (Popup) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full active:scale-90 transition-transform focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className={`w-6 h-6 transition-colors ${isMenuOpen ? 'text-white' : 'text-zinc-500'}`} />
              )}
              <span className={`text-[10px] font-bold transition-colors ${isMenuOpen ? 'text-white' : 'text-zinc-600'}`}>
                Menú
              </span>
            </button>

          </div>
        </div>
      </div>
    </>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-1 h-full active:scale-90 transition-transform">
      <Icon className={`w-6 h-6 transition-colors ${active ? 'text-white' : 'text-zinc-500'}`} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] font-bold transition-colors ${active ? 'text-white' : 'text-zinc-600'}`}>
        {label}
      </span>
    </Link>
  );
}

function MenuLink({ href, icon: Icon, label, onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition">
      <Icon size={18} />
      <span className="text-sm font-bold flex-1">{label}</span>
      <ChevronRight size={14} className="text-zinc-700" />
    </Link>
  )
}