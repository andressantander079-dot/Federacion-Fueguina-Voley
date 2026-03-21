'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateStandings, AbsoluteTieException, generateCrosses, TeamStats } from '@/lib/tiebreakerEngine';
import { Trophy, ShieldAlert, Cpu, CheckCircle, UploadCloud, Edit3, Trash2, MapPin, Clock } from 'lucide-react';

interface Props {
  tournamentId: string;
  categoryId: string;
  tablaGeneral: any[];
  onMatchesGenerated: () => void;
  matches: any[];
}

export default function PlayoffGenerator({ tournamentId, categoryId, tablaGeneral, onMatchesGenerated, matches }: Props) {
  const supabase = createClient();
  
  // Generación State
  const [selectedRound, setSelectedRound] = useState<string>('Cuartos de Final (8 equipos)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorConfig, setErrorConfig] = useState('');
  
  // Tiebreaker Manual State
  const [manualTieModal, setManualTieModal] = useState<TeamStats[] | null>(null);
  
  // Generadas state
  const playoffMatches = matches.filter(m => m.round.includes('Final') || m.round.includes('Playoff') || m.round.includes('vos'));

  const options = [
    { label: 'Final (2 equipos)', teams: 2, roundName: 'Final' },
    { label: 'Semifinales (4 equipos)', teams: 4, roundName: 'Semifinal' },
    { label: 'Cuartos de Final (8 equipos)', teams: 8, roundName: 'Cuartos de Final' },
    { label: 'Octavos de Final (16 equipos)', teams: 16, roundName: 'Octavos de Final' },
  ];

  const handleGenerate = async () => {
    setErrorConfig('');
    setIsGenerating(true);
    
    // Mapear tablaGeneral a formato del Engine
    const stats: TeamStats[] = tablaGeneral.map(t => ({
      team_id: t.id,
      name: t.name,
      matchesWon: t.pg || 0,
      points: t.pts || 0,
      setsWon: t.setsW || 0,
      setsLost: t.setsL || 0,
      pointsWon: t.pW || 0,
      pointsLost: t.pL || 0
    }));

    try {
      // 1. Aplicar motor matemático
      const validStandings = calculateStandings(stats);
      
      // 2. Extraer Top N 
      const selectedOption = options.find(o => o.label === selectedRound);
      if (!selectedOption) return;
      
      if (validStandings.length < selectedOption.teams) {
        setErrorConfig(`No hay suficientes equipos. Calculamos ${validStandings.length} en la tabla general, pero seleccionaste un cruce de ${selectedOption.teams}.`);
        setIsGenerating(false);
        return;
      }

      const topTeams = validStandings.slice(0, selectedOption.teams);
      
      // 3. Generar cruces
      const crosses = generateCrosses(topTeams);

      // 4. Insertar en BD como draft y is_published false
      const inserts = crosses.map((c, index) => ({
        tournament_id: tournamentId,
        category_id: categoryId,
        home_team_id: c.home.team_id,
        away_team_id: c.away.team_id,
        round: `${selectedOption.roundName} - Llave ${index + 1}`,
        status: 'borrador', 
        is_published: false,
        court_name: 'Sede a confirmar'
      }));

      const { error } = await supabase.from('matches').insert(inserts);
      
      if (error) throw error;
      
      onMatchesGenerated(); // Refresh general

    } catch (e: any) {
      if (e instanceof AbsoluteTieException) {
        setManualTieModal(e.tiedTeams);
      } else {
        console.error("Database or generation error:", e);
        setErrorConfig(e.message || "Error al generar llaves.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResolverEmpate = (equipoGanadorIndex: number) => {
    // Si resuelven, en teoría deberíamos guardar el orden manual en algún lado o sumarle +0.001 Puntos al ganador para destrabar matemáticamente. 
    // Para simplificar, ajustaremos artificialmente el ganador sumándole +1 Milímetro (un punto falso en la view local) al team stats y guardándolo en la tabla si tuviéramos tabla persistente.
    // Como las posiciones se calculan on the fly, el truco universal FIVB sin persistencia es advertir e inyectar.
    alert("Para resolver definitivamente, debes alterar manualmente el resultado de algún partido de estos equipos en Fase Regular o configurar un Match Extra de Desempate. La matemática federal no permite sorteos por azar silenciosos.");
    setManualTieModal(null);
  };

  const publicarPartido = async (matchId: string) => {
    const { error } = await supabase.from('matches').update({ is_published: true, status: 'programado' }).eq('id', matchId);
    if (!error) onMatchesGenerated();
  };

  const eliminarPlayoff = async (matchId: string) => {
    if(!confirm("¿Eliminar esta llave?")) return;
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (!error) onMatchesGenerated();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* HEADER DE GENERACIÓN */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
         <div className="absolute -right-10 -top-10 text-zinc-950/20 pointer-events-none">
            <Cpu size={250} />
         </div>
         
         <div className="relative z-10 max-w-xl">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                <Trophy className="text-tdf-orange" /> Engine de Play-Offs <span className="bg-tdf-orange/20 text-tdf-orange text-[10px] px-2 py-0.5 rounded tracking-widest uppercase">Motor Automático</span>
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                El sistema aplicará las métricas oficiales de FIVB (PG, PTS, Cociente Sets, Cociente Tantos) para cruzar al 1° vs Último de la tabla general según la etapa elegida. Fallará obligando revisión manual si halla un *Empate Absoluto*.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-tdf-blue font-bold text-white flex-1"
                  value={selectedRound}
                  onChange={e => setSelectedRound(e.target.value)}
              >
                 {options.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
              </select>
              
              <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-tdf-blue hover:bg-blue-600 border border-blue-500 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl transition shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center gap-2"
              >
                  {isGenerating ? 'Calculando...' : 'Crear Llaves'}
              </button>
            </div>
            
            {errorConfig && (
                <div className="mt-4 text-red-400 text-xs font-bold flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <ShieldAlert size={16} /> {errorConfig}
                </div>
            )}
         </div>
      </div>

      {/* MATCHES GENERADOS */}
      {playoffMatches.length > 0 && (
         <div className="space-y-4">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-white text-lg">Llaves Generadas</h3>
                 {playoffMatches.some(m => !m.is_published) && (
                     <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition" onClick={() => playoffMatches.filter(m => !m.is_published).map(m => publicarPartido(m.id))}>
                         <UploadCloud size={16} /> Publicar Todas Ocultas
                     </button>
                 )}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {playoffMatches.map(m => (
                     <div key={m.id} className={`bg-zinc-900 border p-5 rounded-xl relative overflow-hidden transition ${!m.is_published ? 'border-zinc-800 opacity-90' : 'border-green-500/30'}`}>
                         
                         {!m.is_published && (
                             <div className="absolute top-0 right-0 bg-red-500/20 text-red-500 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-lg">
                                 Oculto del Público
                             </div>
                         )}

                         <h4 className="font-black text-white text-sm uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">{m.round}</h4>
                         
                         <div className="flex items-center justify-between text-base font-bold text-white mb-4">
                              <span className="flex-1 text-right">{m.home_team?.name}</span>
                              <span className="px-3 py-1 bg-zinc-950 text-zinc-600 text-[10px] rounded mx-4 border border-zinc-800">VS</span>
                              <span className="flex-1 text-left">{m.away_team?.name}</span>
                         </div>

                         <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                              <div className="flex flex-col gap-1 text-xs text-zinc-500">
                                  <div className="flex items-center gap-1"><Clock size={12} /> {m.scheduled_time ? new Date(m.scheduled_time).toLocaleString('es-AR') : 'Sin fecha asignada'}</div>
                                  <div className="flex items-center gap-1"><MapPin size={12} /> {m.court_name}</div>
                              </div>
                              <div className="flex gap-2">
                                  {!m.is_published && <button onClick={() => publicarPartido(m.id)} className="bg-green-500/10 text-green-500 hover:bg-green-500/20 p-2 rounded-lg transition" title="Publicar Partido"><CheckCircle size={16} /></button>}
                                  <button onClick={() => eliminarPlayoff(m.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 p-2 rounded-lg transition"><Trash2 size={16} /></button>
                              </div>
                         </div>
                     </div>
                 ))}
             </div>
         </div>
      )}

      {/* MODAL EMPATE ABSOLUTO */}
      {manualTieModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-zinc-900 border border-red-500 p-8 rounded-3xl max-w-xl shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                  <div className="mx-auto w-16 h-16 bg-red-500/20 text-red-500 flex items-center justify-center rounded-full mb-6">
                      <ShieldAlert size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-center text-white mb-2">¡Empate Aritmético Absoluto!</h3>
                  <p className="text-center text-zinc-400 text-sm mb-6 leading-relaxed">
                      El motor estadístico ha detectado que los siguientes equipos tienen partidos ganados, diferencia de sets y proporciones de tantos absolutamente idénticos. Esto violenta la jerarquía de cruces automáticos.
                  </p>
                  
                  <div className="space-y-2 mb-8">
                      {manualTieModal.map(t => (
                          <div key={t.team_id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                              <span className="font-bold text-white">{t.name}</span>
                              <span className="font-mono text-zinc-500 text-xs">PTS: {t.points} | W/L: {t.matchesWon} - {t.matchesWon === 0 ? t.setsLost : '...'}</span>
                          </div>
                      ))}
                  </div>

                  <button 
                      onClick={() => handleResolverEmpate(0)}
                      className="w-full bg-tdf-orange hover:bg-orange-600 text-white font-black py-4 rounded-xl transition"
                  >
                      Aceptar e Ingresar Resolución Manual
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}
