// src/app/page.tsx
'use client';

import { Calendar, MapPin, ChevronRight, PlayCircle } from 'lucide-react';

export default function Home() {
  
  // DATOS FALSOS PARA VISUALIZAR EL DISEÑO (Luego vendrán de Supabase)
  const partidosEnVivo = [
    {
      id: 1,
      cat: 'Primera Fem',
      local: 'Club Favale',
      visita: 'Los Andes',
      setActual: 4,
      scoreSets: '2 - 1',
      puntosSet: '18 - 16',
      cancha: 'Gimnasio Petrina'
    }
  ];

  const proximosPartidos = [
    {
      id: 2,
      hora: '18:00',
      cat: 'Sub-16 Mixto',
      local: 'AEP',
      visita: 'Galicia',
      cancha: 'Polideportivo'
    },
    {
      id: 3,
      hora: '19:30',
      cat: 'Primera Masc',
      local: 'Oshovia',
      visita: 'Club Favale',
      cancha: 'Polideportivo'
    },
    {
      id: 4,
      hora: '21:00',
      cat: 'Primera Fem',
      local: 'Magallanes',
      visita: 'Ushuaia Voley',
      cancha: 'Gimnasio Petrina'
    }
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto">
      
      {/* SECCIÓN 1: PARTIDOS EN VIVO (HERO) */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <h2 className="font-bold text-slate-800 text-lg">Jugándose Ahora</h2>
        </div>

        {/* Tarjeta de Partido en Vivo */}
        {partidosEnVivo.map((partido) => (
          <div key={partido.id} className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden relative">
            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 absolute top-0 left-0 rounded-br-lg z-10">
              EN VIVO • Set {partido.setActual}
            </div>
            
            <div className="p-5 mt-4">
              <div className="flex justify-between items-center mb-4">
                {/* Equipo Local */}
                <div className="flex flex-col items-center w-1/3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-400 mb-2">
                    {partido.local.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-center leading-tight">{partido.local}</span>
                </div>

                {/* Marcador Central */}
                <div className="flex flex-col items-center w-1/3">
                  <div className="text-3xl font-black text-slate-900 tracking-widest">
                    {partido.scoreSets}
                  </div>
                  <div className="text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded mt-1">
                    {partido.puntosSet}
                  </div>
                </div>

                {/* Equipo Visita */}
                <div className="flex flex-col items-center w-1/3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-400 mb-2">
                    {partido.visita.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-center leading-tight">{partido.visita}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {partido.cancha}
                </div>
                <button className="text-blue-600 font-semibold flex items-center gap-1">
                  Ver Detalles <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>


      {/* SECCIÓN 2: PUBLICIDAD IN-FEED (Ejemplo) */}
      <div className="mb-8 w-full h-24 bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl flex items-center justify-center text-white relative overflow-hidden group cursor-pointer">
        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
        <div className="z-10 text-center">
          <p className="text-xs text-blue-300 font-bold tracking-widest mb-1">SPONSOR OFICIAL</p>
          <p className="font-bold text-lg">Tu Marca Aquí</p>
        </div>
      </div>


      {/* SECCIÓN 3: PRÓXIMOS PARTIDOS (FIXTURE) */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-bold text-slate-800 text-lg">Próximos Encuentros</h2>
          <a href="#" className="text-blue-600 text-xs font-semibold">Ver Todo</a>
        </div>

        {/* Lista de Partidos */}
        <div className="space-y-3">
          {proximosPartidos.map((partido) => (
            <div key={partido.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              
              {/* Hora y Cancha */}
              <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-4 mr-4 min-w-[60px]">
                <span className="font-bold text-slate-900 text-lg">{partido.hora}</span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Hoy</span>
              </div>

              {/* Info del Partido */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {partido.cat}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {partido.cancha}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-200 rounded-full text-[10px] flex items-center justify-center font-bold text-slate-500">
                      {partido.local.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{partido.local}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-200 rounded-full text-[10px] flex items-center justify-center font-bold text-slate-500">
                      {partido.visita.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{partido.visita}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </section>
    </div>
  );
}