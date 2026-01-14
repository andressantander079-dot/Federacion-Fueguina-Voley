// src/app/posiciones/page.tsx
'use client';

import { useState } from 'react';
import { Trophy, Medal, AlertCircle } from 'lucide-react';

export default function PosicionesPage() {
  const [categoria, setCategoria] = useState('Primera');
  const [rama, setRama] = useState('Femenino');

  // DATOS FALSOS (Simulando la Base de Datos)
  // PTS: Puntos, PJ: Jugados, PG: Ganados, PP: Perdidos, SF: Sets Favor, SC: Sets Contra
  const tabla = [
    { id: 1, equipo: 'Club Favale', pts: 15, pj: 5, pg: 5, pp: 0, sf: 15, sc: 2 },
    { id: 2, equipo: 'Los Andes', pts: 12, pj: 5, pg: 4, pp: 1, sf: 13, sc: 5 },
    { id: 3, equipo: 'AEP', pts: 9, pj: 4, pg: 3, pp: 1, sf: 10, sc: 6 },
    { id: 4, equipo: 'Ushuaia Voley', pts: 6, pj: 5, pg: 2, pp: 3, sf: 8, sc: 10 },
    { id: 5, equipo: 'Magallanes', pts: 3, pj: 4, pg: 1, pp: 3, sf: 5, sc: 11 },
    { id: 6, equipo: 'Galicia', pts: 0, pj: 5, pg: 0, pp: 5, sf: 1, sc: 15 },
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto min-h-screen">
      
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-yellow-100 p-2 rounded-lg text-yellow-700">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Tabla de Posiciones</h1>
      </div>

      {/* FILTROS (Igual que en Fixture para consistencia) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          
          {/* Selector Categoría */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {['Sub-14', 'Sub-16', 'Sub-18', 'Primera'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  categoria === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Selector Rama */}
          <div className="flex gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
             {['Femenino', 'Masculino'].map((r) => (
               <button
                key={r}
                onClick={() => setRama(r)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  rama === r ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
               >
                 {r}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* LA TABLA DE PUNTOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Contenedor con Scroll Horizontal para móviles */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-bold w-10">#</th>
                <th className="px-4 py-3 font-bold">Equipo</th>
                <th className="px-4 py-3 font-bold text-center text-blue-700 bg-blue-50">PTS</th>
                <th className="px-4 py-3 font-bold text-center">PJ</th>
                <th className="px-4 py-3 font-bold text-center hidden sm:table-cell">PG</th>
                <th className="px-4 py-3 font-bold text-center hidden sm:table-cell">PP</th>
                <th className="px-4 py-3 font-bold text-center text-slate-400">Sets</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((fila, index) => (
                <tr key={fila.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                  
                  {/* Posición (Con medallas para top 3) */}
                  <td className="px-4 py-4 font-bold text-slate-400">
                    {index === 0 && <Medal className="w-5 h-5 text-yellow-500" />}
                    {index === 1 && <Medal className="w-5 h-5 text-slate-400" />}
                    {index === 2 && <Medal className="w-5 h-5 text-amber-700" />}
                    {index > 2 && <span>{index + 1}</span>}
                  </td>

                  {/* Nombre Equipo */}
                  <td className="px-4 py-4 font-bold text-slate-800 whitespace-nowrap">
                    {fila.equipo}
                  </td>

                  {/* PUNTOS (Destacado) */}
                  <td className="px-4 py-4 font-black text-center text-blue-700 bg-blue-50/50 text-base">
                    {fila.pts}
                  </td>

                  {/* Partidos Jugados */}
                  <td className="px-4 py-4 text-center font-medium text-slate-600">
                    {fila.pj}
                  </td>

                  {/* Ganados/Perdidos (Ocultos en móvil muy pequeño si quieres, o visibles) */}
                  <td className="px-4 py-4 text-center text-green-600 font-medium hidden sm:table-cell">
                    {fila.pg}
                  </td>
                  <td className="px-4 py-4 text-center text-red-500 font-medium hidden sm:table-cell">
                    {fila.pp}
                  </td>

                  {/* Diferencia de Sets */}
                  <td className="px-4 py-4 text-center text-slate-400 text-xs">
                    {fila.sf}-{fila.sc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referencias al pie */}
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 px-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          PTS: Puntos • PJ: Partidos Jugados • PG: Partidos Ganados • PP: Partidos Perdidos • 
          Los primeros 4 clasifican a Play-offs.
        </p>
      </div>

    </div>
  );
}