'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateStandings } from '@/lib/tournamentUtils';
import { Trophy, Calendar, Filter, MapPin, Clock } from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function FixturePage() {
  const [loading, setLoading] = useState(true);

  // Independent Filter Data
  const [categories, setCategories] = useState<any[]>([]);

  // Selected Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [tournaments, setTournaments] = useState<any[]>([]); // Tournaments matching cat/gender

  // Active Data
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const supabase = createClient();

  // 1. Initial Load: Categories, Venues, Sponsors
  useEffect(() => {
    async function loadInitialData() {
      // Venues & Sponsors
      const { data: vData } = await supabase.from('venues').select('*');
      if (vData) setVenues(vData);

      const { data: sData } = await supabase.from('sponsors').select('*').eq('active', true);
      if (sData) setSponsors(sData);

      // Categories (Source of Truth)
      const { data: cData } = await supabase.from('categories').select('*').order('name');
      if (cData && cData.length > 0) {
        setCategories(cData);
        // Default to first category
        setSelectedCategoryId(cData[0].id);
        setSelectedGender('Femenino'); // Default
      }
      setLoading(false);
    }
    loadInitialData();
  }, []);

  // 2. Fetch Tournaments when Category/Gender changes
  useEffect(() => {
    if (selectedCategoryId && selectedGender) {
      fetchTournaments();
    }
  }, [selectedCategoryId, selectedGender]);

  // 3. Set Active Tournament details when ID changes
  useEffect(() => {
    if (selectedTournamentId) {
      const t = tournaments.find(t => t.id === selectedTournamentId);
      if (t) {
        setActiveTournament(t);
        fetchTournamentDetails(t.id, t.point_system);
      }
    } else {
      setActiveTournament(null);
    }
  }, [selectedTournamentId, tournaments]);

  async function fetchTournaments() {
    setLoadingDetails(true); // Small loading indicator for select update
    const { data } = await supabase
      .from('tournaments')
      .select('*, category:categories(id, name)')
      .eq('category_id', selectedCategoryId)
      .eq('gender', selectedGender)
      .neq('status', 'archivado') // Show all except archived
      .order('created_at', { ascending: false });

    if (data) {
      setTournaments(data);
      if (data.length > 0) {
        setSelectedTournamentId(data[0].id); // Auto-select newest
      } else {
        setSelectedTournamentId('');
        setActiveTournament(null);
      }
    }
    setLoadingDetails(false);
  }

  async function fetchTournamentDetails(tournamentId: string, pointSystem: string) {
    setLoadingDetails(true);
    try {
      // Fetch Matches
      const { data: mData } = await supabase
        .from('matches')
        .select('*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
        .eq('tournament_id', tournamentId)
        .neq('status', 'borrador') // Don't show drafts
        .order('scheduled_time', { ascending: true });

      // Fetch Teams for Standings
      const { data: equiposRel } = await supabase
        .from('tournament_teams')
        .select('team_id, team:teams(*)')
        .eq('tournament_id', tournamentId);

      const teams = equiposRel ? equiposRel.map((r: any) => r.team) : [];

      if (mData) {
        setMatches(mData);
        // Calculate Standings
        const st = calculateStandings(mData, pointSystem, teams);
        setStandings(st);
      }
    } catch (error) {
      console.error("Error loading details:", error);
    } finally {
      setLoadingDetails(false);
    }
  }

  const groupedMatches = matches.reduce((acc: any, match) => {
    const round = match.round || 'Sin Jornada';
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  const sortedRounds = Object.keys(groupedMatches).sort((a, b) => {
    const getNum = (s: string) => { const m = s.match(/\d+/); return m ? parseInt(m[0]) : 999; };
    return getNum(a) - getNum(b);
  });

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-tdf-orange"></div>
        <div className="h-4 w-48 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-grow pt-28 px-6 max-w-7xl mx-auto w-full">
        {/* STANDARD HEADER */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
            Fixture <span className="text-tdf-orange">y Resultados</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Consulta el calendario de partidos, resultados en vivo y más.
          </p>
        </header>

        {/* FILTERS - Category First approach (Like Posiciones) */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* 1. Category */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Categoría</label>
              <select
                className="w-full bg-slate-100 dark:bg-black/50 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 font-bold outline-none focus:border-tdf-orange transition appearance-none cursor-pointer"
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
              >
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id} className="text-slate-900 dark:text-white">{c.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Rama</label>
              <select
                className="w-full bg-slate-100 dark:bg-black/50 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 font-bold outline-none focus:border-tdf-orange transition appearance-none cursor-pointer"
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
              >
                {['Femenino', 'Masculino', 'Mixto'].map((g) => (
                  <option key={g} value={g} className="text-slate-900 dark:text-white">{g}</option>
                ))}
              </select>
            </div>

            {/* 3. Tournament (Filtered by Cat/Gender) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Torneo</label>
              <div className="relative">
                <Trophy size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <select
                  className="w-full bg-slate-100 dark:bg-black/50 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 font-bold outline-none focus:border-tdf-orange transition appearance-none cursor-pointer disabled:opacity-50"
                  value={selectedTournamentId}
                  onChange={e => setSelectedTournamentId(e.target.value)}
                  disabled={tournaments.length === 0}
                >
                  {tournaments.length === 0 ? (
                    <option>No hay torneos</option>
                  ) : (
                    tournaments.map(t => (
                      <option key={t.id} value={t.id} className="text-slate-900 dark:text-white">{t.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="relative z-10">
          {activeTournament ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* LEFT COLUMN: STANDINGS */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                  <div className="bg-slate-100 dark:bg-white/5 p-4 border-b border-slate-200 dark:border-white/5">
                    <h2 className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2">
                      <Trophy size={20} className="text-tdf-orange" /> Tabla
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-black/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3 text-center">#</th>
                          <th className="p-3">Equipo</th>
                          <th className="p-3 text-center">PJ</th>
                          <th className="p-3 text-center text-slate-900 dark:text-white">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {standings.map((row, i) => (
                          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                            <td className={`p-3 text-center font-bold ${i < 3 ? 'text-tdf-orange' : 'text-slate-400'}`}>{i + 1}</td>
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={row.name}>{row.name}</td>
                            <td className="p-3 text-center font-medium text-slate-500">{row.pg + row.pp}</td>
                            <td className="p-3 text-center font-black text-lg bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white">{row.pts}</td>
                          </tr>
                        ))}
                        {standings.length === 0 && (
                          <tr><td colSpan={4} className="text-center p-6 text-slate-400 text-xs">Sin datos aún.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: FIXTURE LIST */}
              <div className="lg:col-span-2 space-y-6">
                {(() => {
                  const renderItems: any[] = [];
                  let matchCounter = 0;

                  if (sortedRounds.length === 0) {
                    return (
                      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center shadow-sm border border-slate-200 dark:border-white/5">
                        <Calendar className="mx-auto text-slate-300 w-16 h-16 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Fixture no disponible</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Aún no se han programado partidos para {activeTournament.name}.</p>
                      </div>
                    );
                  }

                  sortedRounds.forEach(round => {
                    renderItems.push({ type: 'header', round, count: groupedMatches[round].length });
                    groupedMatches[round].forEach((match: any) => {
                      renderItems.push({ type: 'match', data: match });
                      matchCounter++;
                      if (matchCounter % 4 === 0) {
                        renderItems.push({ type: 'sponsor', index: matchCounter / 4 });
                      }
                    });
                  });

                  return (
                    <div className="space-y-4">
                      {renderItems.map((item, idx) => {
                        if (item.type === 'header') {
                          return (
                            <div key={`header-${idx}`} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 flex justify-between items-center rounded-2xl mt-8 first:mt-0">
                              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.round}</h3>
                              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-black px-2 py-1 rounded-md">{item.count} Partidos</span>
                            </div>
                          );
                        } else if (item.type === 'sponsor') {
                          const sponsor = sponsors.length > 0 ? sponsors[item.index % sponsors.length] : null;
                          if (!sponsor && sponsors.length === 0) return null;

                          return (
                            <div key={`sponsor-${idx}`} className="my-4">
                              <a href={sponsor?.website || '#'} target="_blank" className="block relative overflow-hidden rounded-xl group shadow-md hover:shadow-xl transition-all">
                                <div className="absolute inset-0 bg-gradient-to-r from-tdf-blue to-tdf-orange opacity-90"></div>
                                <div className="relative p-6 flex items-center justify-between">
                                  <div>
                                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Nos Acompaña</p>
                                    <h4 className="text-white font-black text-2xl italic">{sponsor?.name || 'Sponsor'}</h4>
                                  </div>
                                  {sponsor?.logo_url && (
                                    <img src={sponsor.logo_url} className="h-12 object-contain bg-white/20 p-2 rounded-lg" alt={sponsor.name} />
                                  )}
                                </div>
                              </a>
                            </div>
                          );
                        } else {
                          // Render Match
                          const m = item.data;
                          return (
                            <div key={m.id} className="bg-white dark:bg-zinc-900 p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                              {/* DATE & TIME */}
                              <div className="flex md:flex-col items-center gap-2 md:gap-1 min-w-[80px] text-slate-500 dark:text-slate-400">
                                <span className="text-xs font-bold uppercase">{new Date(m.scheduled_time).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                                <span className="text-xs bg-slate-100 dark:bg-black text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {/* TEAMS */}
                              <div className="flex-1 w-full grid grid-cols-3 items-center gap-4">
                                <div className={`text-right font-bold truncate ${m.home_score > m.away_score ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}>
                                  {m.home_team?.name}
                                </div>

                                <div className="flex justify-center">
                                  <div className={`px-4 py-1.5 rounded-lg font-mono font-bold text-sm shadow-inner min-w-[80px] text-center ${m.status === 'finalizado' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-tdf-blue dark:text-blue-400'}`}>
                                    {m.status === 'finalizado' ? `${m.home_score} - ${m.away_score}` : 'VS'}
                                  </div>
                                </div>

                                <div className={`text-left font-bold truncate ${m.away_score > m.home_score ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}>
                                  {m.away_team?.name}
                                </div>
                              </div>

                              {/* LOCATION */}
                              <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 md:w-auto w-full justify-center md:justify-end">
                                <MapPin size={12} />
                                {(() => {
                                  const venue = venues.find((v: any) => v.name.toLowerCase() === m.court_name?.toLowerCase());
                                  return venue?.google_maps_url ? (
                                    <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer" className="hover:text-tdf-blue hover:underline flex items-center gap-1">
                                      {m.court_name}
                                    </a>
                                  ) : (
                                    <span>{m.court_name || 'Sin Sede'}</span>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center shadow-xl border border-slate-200 dark:border-white/5">
              <Filter className="mx-auto text-slate-300 dark:text-slate-700 w-24 h-24 mb-6" />
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Selecciona una Competencia</h2>
              <p className="text-slate-500 max-w-md mx-auto">Utiliza los filtros superiores para encontrar la Categoría, Rama y Torneo que deseas consultar.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
