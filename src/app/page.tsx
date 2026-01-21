// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import SponsorsBanner from '../components/SponsorsBanner';
import LoginModal from '../components/LoginModal';
import { Heart, MessageCircle } from 'lucide-react';

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [noticias, setNoticias] = useState<any[]>([]);

  // Cargar noticias reales de la BD
  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
      if (data) setNoticias(data);
    };
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* Usamos el Navbar nuevo */}
      <Navbar onLoginClick={() => setIsLoginOpen(true)} />

      {/* PORTADA (HERO) */}
      <header className="bg-slate-900 text-white py-20 px-6 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-blue-600/20 mix-blend-overlay"></div>
         <div className="relative z-10 max-w-3xl mx-auto">
             <span className="text-blue-400 font-black tracking-widest text-xs uppercase mb-4 block">Temporada 2026</span>
             <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase leading-none">El Voley de Ushuaia <br/>en un solo lugar</h1>
             <p className="text-slate-400 text-lg mb-8">Seguí los partidos en vivo, consultá tablas y accedé a la información oficial.</p>
         </div>
      </header>

      {/* BANNER DE SPONSORS (A mitad de página) */}
      <SponsorsBanner />

      {/* SECCIÓN NOTICIAS (Estilo Instagram) */}
      <section id="noticias" className="max-w-xl mx-auto px-4 pb-20">
          <h2 className="text-2xl font-black text-slate-900 mb-8 text-center uppercase tracking-tight">Últimas Novedades</h2>
          
          <div className="space-y-12">
              {noticias.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 italic text-sm">No hay noticias cargadas aún.</p>
                      <p className="text-[10px] text-slate-300 mt-1 uppercase font-bold">Panel de Admin próximamente</p>
                  </div>
              ) : (
                  noticias.map((post) => (
                      <article key={post.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          {/* Cabecera del Post */}
                          <div className="p-4 flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xs">FVU</div>
                              <div>
                                  <p className="text-xs font-bold text-slate-900">Federación Oficial</p>
                                  <p className="text-[10px] text-slate-400">Ushuaia • {new Date(post.created_at).toLocaleDateString()}</p>
                              </div>
                          </div>
                          
                          {/* Imagen */}
                          <div className="w-full bg-slate-100 relative">
                             <img src={post.image_url} alt={post.title} className="w-full h-auto object-cover max-h-[500px]" />
                          </div>

                          {/* Iconos "Like" visuales */}
                          <div className="p-4 flex gap-4 text-slate-700">
                             <Heart className="hover:text-red-500 cursor-pointer transition"/>
                             <MessageCircle className="hover:text-blue-500 cursor-pointer transition"/>
                          </div>

                          {/* Texto */}
                          <div className="px-4 pb-4">
                              <h3 className="font-black text-sm mb-1">{post.title}</h3>
                              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                  {post.content}
                              </p>
                          </div>
                      </article>
                  ))
              )}
          </div>
      </section>

      {/* PIE DE PÁGINA */}
      <footer className="bg-slate-50 border-t border-slate-200 py-10 text-center text-xs font-bold text-slate-400 uppercase">
          &copy; 2026 Federación de Voley de Ushuaia
      </footer>

      {/* MODAL LOGIN */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

    </div>
  );
}