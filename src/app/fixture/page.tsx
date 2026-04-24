'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Calendar, Filter, MapPin, Clock } from 'lucide-react';
import { formatArgentinaDateLiteral, formatArgentinaTimeLiteral } from '@/lib/dateUtils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MatchDetailsModal from '@/components/fixture/MatchDetailsModal';

function MatchDetailsHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const matchId = searchParams.get('match_details');
    if (!matchId) return null;
    return <MatchDetailsModal matchId={matchId} onClose={() => router.push(pathname, { scroll: false })} />;
}

export default function FixturePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // Independent Filter Data
  const [categories, setCategories] = useState<any[]>([]);

  // Selected Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Todas');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [tournaments, setTournaments] = useState<any[]>([]); // Tournaments matching cat/gender/city

  // Active Data
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
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

  // 2. Fetch Tournaments when Category/Gender/City changes
  useEffect(() => {
    if (selectedCategoryId && selectedGender && selectedCity) {
      fetchTournaments();
    }
  }, [selectedCategoryId, selectedGender, selectedCity]);

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
    let query = supabase
      .from('tournaments')
      .select('*, category:categories(id, name)')
      .eq('category_id', selectedCategoryId)
      .eq('gender', selectedGender)
      .neq('status', 'archivado') // Show all except archived
      .order('created_at', { ascending: false });

    if (selectedCity !== 'Todas') {
      query = query.eq('city', selectedCity);
    }
    
    const { data } = await query;

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
        .select('*, home_team:teams!home_team_id(name, shield_url), away_team:teams!away_team_id(name, shield_url)')
        .eq('tournament_id', tournamentId)
        .neq('status', 'borrador') // Don't show drafts
        .neq('status', 'cancelado') // Don't show canceled matches
        .order('scheduled_time', { ascending: true });

      // Fetch Teams for Standings
      const { data: equiposRel } = await supabase
        .from('tournament_teams')
        .select('team_id, team:teams(id, name, shield_url)')
        .eq('tournament_id', tournamentId);

      const teams = equiposRel ? equiposRel.map((r: any) => r.team) : [];

      if (mData) {
        setMatches(mData);
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
    <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-tdf-orange"></div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />
      <Suspense fallback={null}>
        <MatchDetailsHandler />
      </Suspense>

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

        {/* FILTERS - Add City Filter and format to 4 Cols */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

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

            {/* 3. Region/City */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Región</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <select
                  className="w-full bg-slate-100 dark:bg-black/50 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 font-bold outline-none focus:border-tdf-orange transition appearance-none cursor-pointer"
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                >
                  <option value="Todas" className="text-slate-900 dark:text-white">Todas</option>
                  <option value="Interprovincial" className="text-slate-900 dark:text-white">Interprovincial</option>
                  <option value="Ushuaia" className="text-slate-900 dark:text-white">Ushuaia</option>
                  <option value="Río Grande-Tolhuin" className="text-slate-900 dark:text-white">Río Gde - Tolhuin</option>
                </select>
              </div>
            </div>

            {/* 4. Tournament (Filtered by Cat/Gender/City) */}
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
            <div className="max-w-4xl mx-auto">

              {/* FIXTURE LIST */}
              <div className="space-y-6">
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
                          const isMatchFinished = m.status === 'finalizado';
                          return (
                            <div 
                                key={m.id} 
                                onClick={() => {
                                    if (isMatchFinished) {
                                        router.push(`${pathname}?match_details=${m.id}`, { scroll: false });
                                    }
                                }}
                                className={`bg-white dark:bg-zinc-900 p-5 transition flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm ${isMatchFinished ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 hover:border-tdf-orange/50 hover:shadow-md' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                            >
                              {/* DATE & TIME */}
                              <div className="flex md:flex-col items-center gap-2 md:gap-1 min-w-[80px] text-slate-500 dark:text-slate-400">
                                <span className="text-xs font-bold uppercase">{formatArgentinaDateLiteral(m.scheduled_time).split(',')[1]}</span>
                                <span className="text-xs bg-slate-100 dark:bg-black text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatArgentinaTimeLiteral(m.scheduled_time)}
                                </span>
                              </div>

                              {/* TEAMS */}
                              <div className="flex-1 w-full flex items-center justify-between gap-2 overflow-hidden px-2">
                                {/* HOME TEAM */}
                                <div className={`flex items-center gap-2 justify-end font-bold flex-1 min-w-0 ${m.home_score > m.away_score ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}>
                                  <span className="truncate hidden sm:block text-right">{m.home_team?.name}</span>
                                  <span className="truncate sm:hidden text-right">{m.home_team?.name.substring(0, 8)}...</span>
                                  {m.home_team?.shield_url && (
                                    <img src={m.home_team.shield_url} className="w-8 h-8 object-contain shrink-0" alt="" />
                                  )}
                                </div>

                                {/* SCORE/VS */}
                                <div className="flex justify-center shrink-0 mx-2">
                                  <div className={`px-4 py-1.5 rounded-lg font-mono font-bold text-sm shadow-inner min-w-[70px] text-center ${m.status === 'finalizado' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : (m.status === 'live' || m.status === 'en_curso') ? 'bg-red-500 text-white animate-pulse cursor-pointer hover:bg-red-600' : 'bg-blue-50 dark:bg-blue-900/20 text-tdf-blue dark:text-blue-400'}`}>
                                    {(m.status === 'live' || m.status === 'en_curso') ? (
                                      <a href={`/vivo/${m.id}`} className="flex items-center justify-center gap-1">LIVE</a>
                                    ) : (
                                      m.status === 'finalizado' ? `${m.home_score} - ${m.away_score}` : 'VS'
                                    )}
                                  </div>
                                </div>

                                {/* AWAY TEAM */}
                                <div className={`flex items-center gap-2 justify-start font-bold flex-1 min-w-0 ${m.away_score > m.home_score ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}>
                                  {m.away_team?.shield_url && (
                                    <img src={m.away_team.shield_url} className="w-8 h-8 object-contain shrink-0" alt="" />
                                  )}
                                  <span className="truncate hidden sm:block text-left">{m.away_team?.name}</span>
                                  <span className="truncate sm:hidden text-left">{m.away_team?.name.substring(0, 8)}...</span>
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

