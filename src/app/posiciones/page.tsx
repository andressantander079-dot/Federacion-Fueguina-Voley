'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Medal, AlertCircle, Loader2, Frown } from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PosicionesPage() {
  const supabase = createClient();

  // Filtros
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('Femenino');

  // Estado de carga y datos
  const [loading, setLoading] = useState(true);
  const [standings, setStandings] = useState<any[]>([]);
  const [activeTournament, setActiveTournament] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Cada vez que cambien los filtros, buscamos el torneo correspondiente
  useEffect(() => {
    if (selectedCategory && selectedGender) {
      fetchTournamentAndStandings();
    }
  }, [selectedCategory, selectedGender]);

  async function fetchInitialData() {
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory(cats[0].id); // Select first by default
    }
  }

  async function fetchTournamentAndStandings() {
    setLoading(true);
    setStandings([]);
    setActiveTournament(null);

    try {
      // 1. Buscar Torneo ACTIVO que coincida con los filtros
      // Priorizamos 'activo', sino el más reciente creado.
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('category_id', selectedCategory)
        .eq('gender', selectedGender)
        .neq('status', 'archivado') // Ignoramos archivados
        .order('created_at', { ascending: false });

      if (!tournaments || tournaments.length === 0) {
        setLoading(false);
        return; // No hay torneo
      }

      // Tomamos el primero (el más nuevo o activo)
      const tournament = tournaments[0];
      setActiveTournament(tournament);

      // 2. Traer Partidos Finalizados de este torneo
      const { data: matches } = await supabase
        .from('matches')
        .select(`
                    id, 
                    home_team_id, away_team_id,
                    home_score, away_score,
                    set_scores,
                    status,
                    home_team:teams!home_team_id(id, name, shield_url),
                    away_team:teams!away_team_id(id, name, shield_url)
                `)
        .eq('tournament_id', tournament.id)
        .eq('status', 'finalizado');

      // 3. Traer Equipos Inscriptos (para inicializar la tabla con 0 puntos)
      const { data: inscribedTeams } = await supabase
        .from('tournament_teams')
        .select('team_id, team:teams(id, name, shield_url)')
        .eq('tournament_id', tournament.id);

      // 4. Calcular Tabla
      const table = new Map();

      // Inicializar equipos
      if (inscribedTeams) {
        inscribedTeams.forEach((it: any) => {
          if (it.team) {
            table.set(it.team.id, {
              id: it.team.id,
              team: it.team,
              pts: 0,
              pj: 0,
              pg: 0,
              pp: 0,
              sf: 0,
              sc: 0,
              coef_sets: 0,
              coef_points: 0 // Si tuviéramos puntos por set, aquí simplificado
            });
          }
        });
      }

      // Procesar Partidos
      if (matches) {
        matches.forEach((m: any) => {
          const home = table.get(m.home_team_id);
          const away = table.get(m.away_team_id);

          if (home && away) {
            home.pj++;
            away.pj++;

            // Sets (parsing "25-20", etc is tricky without total points per set, 
            // but matches usually stores home_score (sets won) directly if updated correctly model-wise.
            // Wait, schema says home_score IS sets won.

            const setsHome = m.home_score;
            const setsAway = m.away_score;

            home.sf += setsHome;
            home.sc += setsAway;
            away.sf += setsAway;
            away.sc += setsHome;

            if (setsHome > setsAway) {
              home.pg++;
              away.pp++;
              // Puntos
              if (setsHome === 3 && (setsAway === 0 || setsAway === 1)) {
                home.pts += 3;
              } else if (setsHome === 3 && setsAway === 2) {
                home.pts += 2;
                away.pts += 1;
              }
            } else {
              away.pg++;
              home.pp++;
              if (setsAway === 3 && (setsHome === 0 || setsHome === 1)) {
                away.pts += 3;
              } else if (setsAway === 3 && setsHome === 2) {
                away.pts += 2;
                home.pts += 1;
              }
            }
          }
        });
      }

      // Convertir a Array y Ordenar
      const sortedTable = Array.from(table.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        // Diferencia de Sets
        const diffA = a.sf - a.sc;
        const diffB = b.sf - b.sc;
        if (diffB !== diffA) return diffB - diffA;
        // Ratio Sets
        const ratioA = a.sc === 0 ? a.sf : a.sf / a.sc;
        const ratioB = b.sc === 0 ? b.sf : b.sf / b.sc;
        return ratioB - ratioA;
      });

      setStandings(sortedTable);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-28 px-6 max-w-7xl mx-auto w-full">
        {/* HEADER */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
            Tabla de <span className="text-tdf-orange">Posiciones</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Sigue el desempeño de tus equipos favoritos en tiempo real.
          </p>
        </header>

        {/* FILTROS */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

            {/* Selector Categoría */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${selectedCategory === cat.id
                    ? 'bg-tdf-blue text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Selector Rama */}
            <div className="flex gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-white/5 pt-3 sm:pt-0 sm:pl-3">
              {['Femenino', 'Masculino', 'Mixto'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedGender(r)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${selectedGender === r ? 'bg-slate-800 dark:bg-white text-white dark:text-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-tdf-blue" size={40} />
          </div>
        ) : !activeTournament ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
            <Frown className="mx-auto text-slate-400 mb-2" size={48} />
            <p className="text-slate-500 dark:text-white font-bold text-lg">No existen competencias existentes</p>
            <p className="text-slate-400 text-xs mt-1">No hay torneos activos para esta categoría y género.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{activeTournament.name}</h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                Temporada {activeTournament.season}
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <tr>
                      <th className="px-4 py-3 font-bold w-10">#</th>
                      <th className="px-4 py-3 font-bold">Equipo</th>
                      <th className="px-4 py-3 font-bold text-center text-tdf-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">PTS</th>
                      <th className="px-4 py-3 font-bold text-center">PJ</th>
                      <th className="px-4 py-3 font-bold text-center hidden sm:table-cell">PG</th>
                      <th className="px-4 py-3 font-bold text-center hidden sm:table-cell">PP</th>
                      <th className="px-4 py-3 font-bold text-center text-slate-400">Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, index) => (
                      <tr key={row.id} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition">
                        <td className="px-4 py-4 font-bold text-slate-400">
                          {index === 0 && <Medal className="w-5 h-5 text-yellow-500" />}
                          {index === 1 && <Medal className="w-5 h-5 text-slate-400" />}
                          {index === 2 && <Medal className="w-5 h-5 text-amber-700" />}
                          {index > 2 && <span>{index + 1}</span>}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white whitespace-nowrap flex items-center gap-3">
                          <img src={row.team.shield_url || '/placeholder.png'} className="w-6 h-6 object-contain grayscale opacity-80" alt="" />
                          {row.team.name}
                        </td>
                        <td className="px-4 py-4 font-black text-center text-tdf-blue dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 text-base">
                          {row.pts}
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-slate-600 dark:text-slate-400">
                          {row.pj}
                        </td>
                        <td className="px-4 py-4 text-center text-green-600 dark:text-green-400 font-medium hidden sm:table-cell">
                          {row.pg}
                        </td>
                        <td className="px-4 py-4 text-center text-red-500 dark:text-red-400 font-medium hidden sm:table-cell">
                          {row.pp}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-400 text-xs">
                          {row.sf}-{row.sc}
                        </td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">Aún no hay partidos jugados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 px-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                PTS: Puntos • PJ: Jugados • PG: Ganados • PP: Perdidos •
                Se suman 3 pts por 3-0/3-1 y 2 pts por 3-2.
              </p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}