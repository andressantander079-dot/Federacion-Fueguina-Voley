// src/components/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link'; // <--- IMPORTANTE: Importamos Link
import { Bell, Lock } from 'lucide-react';
import LoginModal from './LoginModal';

export default function Navbar() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              F
            </div>
            <div className="leading-tight hidden sm:block">
              <h1 className="font-bold text-slate-900 tracking-tight">FEDERACIÓN OFICIAL</h1>
              <p className="text-xs text-blue-700 font-semibold tracking-widest">DE VOLEY USHUAIA</p>
            </div>
            <div className="leading-tight sm:hidden">
              <h1 className="font-bold text-slate-900 text-sm">Fed. Voley Ushuaia</h1>
            </div>
          </Link>

          {/* Menú Desktop - AHORA CON LINKS REALES */}
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-700 transition">Inicio</Link>
            <Link href="/fixture" className="hover:text-blue-700 transition">Fixture</Link>
            <Link href="/posiciones" className="hover:text-blue-700 transition">Posiciones</Link>
            <Link href="/reglamento" className="hover:text-blue-700 transition">Reglamento</Link>
          </nav>

          {/* Iconos Derecha */}
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full transition group"
            >
              <Lock className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Acceso</span>
            </button>
          </div>
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}