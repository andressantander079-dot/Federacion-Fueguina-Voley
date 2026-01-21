// src/components/Navbar.tsx
'use client';
import Link from 'next/link';
import { User } from 'lucide-react';

export default function Navbar({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 bg-blue-700 text-white rounded-full flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition">
                FVU
            </div>
            <div className="flex flex-col leading-none">
                <span className="font-bold text-slate-900 text-sm md:text-base uppercase tracking-tight">Federación de Voley</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ushuaia</span>
            </div>
        </Link>

        {/* MENÚ CENTRAL - CAMBIO AQUÍ: 'hidden md:flex' para que se vea antes */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-wide">
            <Link href="/" className="hover:text-blue-700 transition py-2">INICIO</Link>
            <Link href="/noticias" className="hover:text-blue-700 transition py-2">NOTICIAS</Link>
            <Link href="/fixture" className="hover:text-blue-700 transition py-2">FIXTURE</Link>
            <Link href="/posiciones" className="hover:text-blue-700 transition py-2">POSICIONES</Link>
            <Link href="/reglamento" className="hover:text-blue-700 transition py-2">REGLAMENTO</Link>
            <Link href="/descargas" className="hover:text-blue-700 transition py-2">DESCARGAS</Link>
        </div>

        {/* BOTÓN ACCESO */}
        <button 
          onClick={onLoginClick}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition shadow-lg shadow-blue-900/10"
        >
           <User size={14}/>
           <span>Acceso Oficial</span>
        </button>
      </div>
    </nav>
  );
}