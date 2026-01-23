'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateStandings } from '@/lib/tournamentUtils';
import { Trophy, Calendar, Filter, MapPin, Clock } from 'lucide-react';

export default function FixturePage() {
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);

  // States for filters
  const [selectedName, setSelectedName] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');

  // Active Tournament Data
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTournaments();
    fetchVenues();
  }, []);

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*');
    if (data) setVenues(data);
  }

  useEffect(() => {
    if (selectedName && selectedCategoryId && selectedGender) {
      const t = tournaments.find(t =>
        t.name === selectedName &&
        t.category_id === selectedCategoryId &&
        t.gender === selectedGender
      );
      if (t) {
        setActiveTournament(t);
        fetchTournamentDetails(t.id, t.point_system);
      } else {
        setActiveTournament(null);
      }
    }
  }, [selectedName, selectedCategoryId, selectedGender, tournaments]);

  async function fetchTournaments() {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, category:categories(id, name)')
        .eq('status', 'activo') // Only active tournaments for public
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching tournaments:', error);

      if (data) {
        setTournaments(data);
        // Pre-select first one if available to show something initially
        if (data.length > 0) {
          const first = data[0];
          setSelectedName(first.name);
          setSelectedCategoryId(first.category_id);
          setSelectedGender(first.gender);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  // Derived Options for Selects
  const uniqueNames = Array.from(new Set(tournaments.map(t => t.name)));

  // Available categories for selected name
  const availableCategories = tournaments
    .filter(t => t.name === selectedName)
    .map(t => t.category)
    .filter((v, i, a) => a.findIndex(t2 => t2.id === v.id) === i); // Unique by ID

  // Available genders for selected name + category
  const availableGenders = tournaments
    .filter(t => t.name === selectedName && t.category_id === selectedCategoryId)
    .map(t => t.gender);

  const groupedMatches = matches.reduce((acc: any, match) => {
    const round = match.round || 'Sin Jornada';
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  // Sort Rounds: Extract number if possible, else alphanumeric
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
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header / Filter Section */}
      <div className="bg-tdf-blue text-white pt-24 pb-12 px-6 shadow-lg rounded-b-[3rem]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-black mb-6 text-center md:text-left uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
            <Calendar className="text-tdf-orange" size={40} /> Fixture y Posiciones
          </h1>

          {/* FILTERS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
            {/* Tournament Name */}
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-2 ml-1">Torneo</label>
              <div className="relative">
                <Trophy size={18} className="absolute left-3 top-3.5 text-white/50" />
                <select
                  className="w-full bg-black/20 text-white border border-white/30 rounded-xl py-3 pl-10 pr-4 font-bold outline-none focus:bg-black/40 focus:border-tdf-orange transition appearance-none cursor-pointer"
                  value={selectedName}
                  onChange={e => {
                    setSelectedName(e.target.value);
                    // Reset child filters
                    setSelectedCategoryId('');
                    setSelectedGender('');
                  }}
                >
                  <option value="" className="text-gray-800">Seleccionar Torneo...</option>
                  {uniqueNames.map(name => (
                    <option key={name} value={name} className="text-gray-800">{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-2 ml-1">Categoría</label>
              <select
                className="w-full bg-black/20 text-white border border-white/30 rounded-xl py-3 px-4 font-bold outline-none focus:bg-black/40 focus:border-tdf-orange transition appearance-none cursor-pointer disabled:opacity-50"
                value={selectedCategoryId}
                onChange={e => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedGender('');
                }}
                disabled={!selectedName}
              >
                <option value="" className="text-gray-800">Categoría...</option>
                {availableCategories.map((c: any) => (
                  <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-2 ml-1">Rama</label>
              <select
                className="w-full bg-black/20 text-white border border-white/30 rounded-xl py-3 px-4 font-bold outline-none focus:bg-black/40 focus:border-tdf-orange transition appearance-none cursor-pointer disabled:opacity-50"
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
                disabled={!selectedCategoryId}
              >
                <option value="" className="text-gray-800">Rama...</option>
                {availableGenders.map((g: any) => (
                  <option key={g} value={g} className="text-gray-800">{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        {activeTournament ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COLUMN: STANDINGS */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 border-b border-gray-800">
                  <h2 className="text-white font-black text-lg flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-400" /> Tabla de Posiciones
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3 text-center">#</th>
                        <th className="p-3">Equipo</th>
                        <th className="p-3 text-center">PJ</th>
                        <th className="p-3 text-center text-black">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {standings.map((row, i) => (
                        <tr key={row.id} className={`hover:bg-gray-50 transition border-l-4 ${i < 4 ? 'border-l-green-500' : 'border-l-transparent'}`}>
                          <td className={`p-3 text-center font-bold ${i < 3 ? 'text-tdf-blue' : 'text-gray-400'}`}>{i + 1}</td>
                          <td className="p-3 font-bold text-gray-800 truncate max-w-[120px]" title={row.name}>{row.name}</td>
                          <td className="p-3 text-center font-medium text-gray-500">{row.pg + row.pp}</td>
                          <td className="p-3 text-center font-black text-lg bg-gray-50">{row.pts}</td>
                        </tr>
                      ))}
                      {standings.length === 0 && (
                        <tr><td colSpan={4} className="text-center p-6 text-gray-400 text-xs">Sin datos aún.</td></tr>
                      )}
                    </tbody>
                    {standings.length > 0 && (
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="p-2 text-[10px] text-gray-400 text-center font-medium">
                            PG: Partidos Ganados • PP: Partidos Perdidos • PTS: Puntos
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: FIXTURE LIST */}
            <div className="lg:col-span-2 space-y-6">
              {sortedRounds.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                  <Calendar className="mx-auto text-gray-300 w-16 h-16 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700">Fixture no disponible</h3>
                  <p className="text-gray-500 mt-2">Aún no se han programado partidos para esta categoría.</p>
                </div>
              ) : (
                sortedRounds.map(round => (
                  <div key={round} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-slate-50 border-b border-gray-200 p-4 flex justify-between items-center">
                      <h3 className="text-lg font-black text-tdf-blue uppercase tracking-tight">{round}</h3>
                      <span className="text-[10px] uppercase font-bold text-gray-400 bg-white border px-2 py-1 rounded-md">{groupedMatches[round].length} Partidos</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {groupedMatches[round].map((m: any) => (
                        <div key={m.id} className="p-5 hover:bg-slate-50/50 transition flex flex-col md:flex-row items-center gap-6">

                          {/* DATE & TIME */}
                          <div className="flex md:flex-col items-center gap-2 md:gap-1 min-w-[80px] text-gray-500">
                            <span className="text-xs font-bold uppercase">{new Date(m.scheduled_time).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* TEAMS */}
                          <div className="flex-1 w-full grid grid-cols-3 items-center gap-4">
                            <div className={`text-right font-bold truncate ${m.home_score > m.away_score ? 'text-gray-900' : 'text-gray-500'}`}>
                              {m.home_team?.name}
                            </div>

                            <div className="flex justify-center">
                              <div className={`px-4 py-1.5 rounded-lg font-mono font-bold text-sm shadow-inner min-w-[80px] text-center ${m.status === 'finalizado' ? 'bg-gray-100 text-gray-900' : 'bg-blue-50 text-tdf-blue'}`}>
                                {m.status === 'finalizado' ? `${m.home_score} - ${m.away_score}` : 'VS'}
                              </div>
                            </div>

                            <div className={`text-left font-bold truncate ${m.away_score > m.home_score ? 'text-gray-900' : 'text-gray-500'}`}>
                              {m.away_team?.name}
                            </div>
                          </div>

                          {/* LOCATION */}
                          <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 md:w-auto w-full justify-center md:justify-end">
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
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-gray-100">
            <Filter className="mx-auto text-tdf-blue/30 w-24 h-24 mb-6" />
            <h2 className="text-3xl font-black text-gray-800 mb-2">Selecciona una Competencia</h2>
            <p className="text-gray-500 max-w-md mx-auto">Utiliza los filtros superiores para encontrar el torneo, categoría y rama que deseas consultar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
