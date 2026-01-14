// src/components/MobileNav.tsx
import Link from 'next/link';
import { Home, CalendarDays, Trophy, Newspaper, Image } from 'lucide-react';

export default function MobileNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
      <div className="flex justify-between items-end pb-3">
        
        {/* Usamos el componente Link envolviendo los iconos */}
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-700">
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Inicio</span>
        </Link>

        <Link href="/fixture" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-700">
          <CalendarDays className="w-6 h-6" />
          <span className="text-[10px] font-medium">Fixture</span>
        </Link>

        {/* Botón Central Destacado */}
        <div className="relative -top-5">
           <Link href="/posiciones" className="bg-blue-600 p-4 rounded-full text-white shadow-lg shadow-blue-600/30 flex items-center justify-center">
             <Trophy className="w-7 h-7" />
           </Link>
        </div>

        <Link href="/noticias" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-700">
          <Newspaper className="w-6 h-6" />
          <span className="text-[10px] font-medium">Noticias</span>
        </Link>

        <Link href="/fotos" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-700">
          <Image className="w-6 h-6" />
          <span className="text-[10px] font-medium">Fotos</span>
        </Link>
        
      </div>
    </div>
  );
}