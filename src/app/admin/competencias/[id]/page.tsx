'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
   Trophy, Eye, EyeOff, Plus, Trash2, Edit3,
   ArrowLeft, AlertTriangle, Clock, MapPin, Calendar, FileText
} from 'lucide-react';
import Link from 'next/link';

// Componente para ver planillas (si existe)
import MatchSheetsTable from '@/components/admin/MatchSheetsTable';
import { calculateStandings } from '@/lib/tournamentUtils';

export default function DetalleTorneoPage() {
   const params = useParams();
   const id = params?.id as string;

   const [activeTab, setActiveTab] = useState('fixture');
   const [loading, setLoading] = useState(true);

   // Datos
   const [torneo, setTorneo] = useState<any>(null);
   const [partidosPendientes, setPartidosPendientes] = useState<any[]>([]);
   const [partidosOficiales, setPartidosOficiales] = useState<any[]>([]);
   const [equiposInscriptos, setEquiposInscriptos] = useState<any[]>([]);

   const [showMetrics, setShowMetrics] = useState(false);
   const [tablaPosiciones, setTablaPosiciones] = useState<any[]>([]);
   const [modalPartido, setModalPartido] = useState(false);

   // FORMULARIO
   const [nuevoPartido, setNuevoPartido] = useState({
      home_team_id: '',
      away_team_id: '',
      scheduled_time: '',
      court_name: 'Gimnasio Petrina',
      round: 'Fecha 1'
   });

   const supabase = createClient();

   useEffect(() => {
      if (id) cargarDatos();
   }, [id]);

   async function cargarDatos() {
      try {
         setLoading(true);
         const { data: tData, error: tError } = await supabase.from('tournaments').select('*, category:categories(name)').eq('id', id).single();
         if (tError) throw tError;
         setTorneo(tData);

         const { data: mData } = await supabase
            .from('matches')
            .select(`*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name), category:categories(name)`)
            .eq('tournament_id', id)
            .order('scheduled_time', { ascending: true });

         const { data: equiposRel } = await supabase
            .from('tournament_teams')
            .select('team_id, team:teams(*)')
            .eq('tournament_id', id);

         let listaEquipos: any[] = [];
         if (equiposRel) {
            listaEquipos = equiposRel.map((item: any) => item.team).sort((a: any, b: any) => a.name.localeCompare(b.name));
            setEquiposInscriptos(listaEquipos);
         }

         if (mData) {
            setPartidosPendientes(mData.filter((m: any) => m.status === 'borrador'));
            setPartidosOficiales(mData.filter((m: any) => m.status !== 'borrador'));
            if (tData) calcularTabla(mData.filter((m: any) => m.status !== 'borrador'), tData.point_system, listaEquipos);
         }

      } catch (error: any) {
         console.error("Error cargando datos:", error);
      } finally {
         setLoading(false);
      }
   }

   function calcularTabla(matches: any[], sistemaPuntos: string, equiposParticipantes: any[]) {
      const standings = calculateStandings(matches, sistemaPuntos, equiposParticipantes);
      setTablaPosiciones(standings);
   }

   async function validarCruce(homeId: string, awayId: string, round: string, fechaHora: string) {
      if (!homeId || !awayId || !round || !fechaHora) return null;
      if (homeId === awayId) return "¡Un equipo no puede jugar contra sí mismo!";

      try {
         const { data: conflictosRound, error: errorRound } = await supabase
            .from('matches')
            .select('id')
            .eq('tournament_id', id)
            .eq('round', round)
            .or(`home_team_id.eq.${homeId},away_team_id.eq.${homeId},home_team_id.eq.${awayId},away_team_id.eq.${awayId}`);

         if (errorRound) { console.error("Error BD Round:", errorRound); return null; }
         if (conflictosRound && conflictosRound.length > 0) return `⚠️ ERROR: Uno de los equipos ya tiene partido programado en la ${round}.`;

         const isoDate = new Date(fechaHora).toISOString();
         const { data: conflictosHora, error: errorHora } = await supabase
            .from('matches')
            .select('id')
            .neq('tournament_id', id) // Check global conflicts? Or just this tournament? Usually global.
            .eq('scheduled_time', isoDate)
            .or(`home_team_id.eq.${homeId},away_team_id.eq.${homeId},home_team_id.eq.${awayId},away_team_id.eq.${awayId}`);

         if (errorHora) { console.error("Error BD Hora:", errorHora); return null; }
         if (conflictosHora && conflictosHora.length > 0) return "⚠️ ERROR: Conflicto de horario. Uno de los equipos ya juega a esa hora exacta en otro torneo.";

      } catch (err) {
         console.error("Error en validación:", err);
         return null;
      }
      return null;
   }

   async function agregarPartido(e: React.FormEvent) {
      e.preventDefault();
      if (!nuevoPartido.round) return alert("Debes indicar la fecha/jornada (Ej: Fecha 1)");
      if (!nuevoPartido.home_team_id || !nuevoPartido.away_team_id) return alert("Selecciona ambos equipos");
      if (!nuevoPartido.scheduled_time) return alert("Falta la fecha y hora");

      const errorValidacion = await validarCruce(nuevoPartido.home_team_id, nuevoPartido.away_team_id, nuevoPartido.round, nuevoPartido.scheduled_time);
      if (errorValidacion) { alert(errorValidacion); return; }

      const { error } = await supabase.from('matches').insert([{
         ...nuevoPartido,
         tournament_id: id,
         category_id: torneo.category_id,
         status: 'programado'
      }]);

      if (!error) {
         setModalPartido(false);
         setNuevoPartido(prev => ({ ...prev, home_team_id: '', away_team_id: '', scheduled_time: '' }));
         cargarDatos();
      } else {
         alert("Error de BD: " + error.message);
      }
   }

   async function eliminarPartido(e: React.MouseEvent, matchId: string) {
      e.preventDefault(); e.stopPropagation();
      if (!confirm("🗑️ ¿Estás seguro de eliminar este partido definitivamente?")) return;

      const { error } = await supabase.from('matches').delete().eq('id', matchId);

      if (!error) {
         setPartidosPendientes(current => current.filter((p: any) => p.id !== matchId));
         setPartidosOficiales(current => current.filter((p: any) => p.id !== matchId));
      } else {
         alert("❌ Error al eliminar: " + error.message);
      }
   }

   if (loading) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="animate-pulse flex flex-col items-center">
            <Trophy className="w-12 h-12 text-gray-300 mb-4" />
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
         </div>
      </div>
   );

   if (!torneo) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700">Torneo no encontrado</h2>
            <Link href="/admin/competencias" className="text-tdf-blue hover:underline mt-2 inline-block">Volver al listado</Link>
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10">
         <div className="max-w-7xl mx-auto">

            {/* HEADER */}
            <div className="flex items-center gap-4 mb-6">
               <Link href="/admin/competencias" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-500 hover:text-tdf-blue"><ArrowLeft size={20} /></Link>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-bold text-tdf-blue uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                        {torneo.category?.name || 'General'}
                     </span>
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                        Temp. {torneo.season}
                     </span>
                  </div>
                  <h1 className="text-3xl font-black text-gray-900 leading-none">{torneo.name}</h1>
               </div>
            </div>

            {/* TABS */}
            <div className="flex gap-1 border-b border-gray-200 mb-8 overflow-x-auto">
               {['fixture', 'tabla', 'playoffs', 'planillas'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 font-bold capitalize transition border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'border-tdf-blue text-tdf-blue' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}`}>
                     {tab === 'tabla' ? 'Posiciones' : tab === 'planillas' ? <><FileText size={16} /> Planillas</> : tab}
                  </button>
               ))}
            </div>

            {/* === TABLA DE POSICIONES === */}
            {activeTab === 'tabla' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-gray-800">Tabla General</h2>
                     <button onClick={() => setShowMetrics(!showMetrics)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${showMetrics ? 'bg-blue-50 text-tdf-blue border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                        {showMetrics ? <Eye size={16} /> : <EyeOff size={16} />} {showMetrics ? 'Ocultar Métricas' : 'Ver Métricas Admin'}
                     </button>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-100">
                              <tr>
                                 <th className="p-4 w-12 text-center">#</th>
                                 <th className="p-4 min-w-[200px]">Equipo</th>
                                 <th className="p-4 text-center">PTS</th>
                                 <th className="p-4 text-center">PG</th>
                                 <th className="p-4 text-center">PP</th>
                                 <th className="p-4 text-center">DIF</th>
                                 {showMetrics && <><th className="p-4 text-center bg-blue-50/50 text-tdf-blue">Sets G</th><th className="p-4 text-center bg-blue-50/50 text-tdf-blue">Sets P</th><th className="p-4 text-center bg-blue-50/50 text-tdf-blue">Tantos G</th><th className="p-4 text-center bg-blue-50/50 text-tdf-blue">Tantos P</th></>}
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {tablaPosiciones.map((fila: any, i: number) => (
                                 <tr key={fila.id} className="hover:bg-gray-50 transition">
                                    <td className={`p-4 text-center font-bold ${i < 4 ? 'text-tdf-blue' : 'text-gray-400'}`}>{i + 1}</td>
                                    <td className="p-4 font-bold text-gray-800">{fila.name}</td>
                                    <td className="p-4 text-center font-black text-lg bg-gray-50/50">{fila.pts}</td>
                                    <td className="p-4 text-center text-green-600 font-bold">{fila.pg}</td>
                                    <td className="p-4 text-center text-red-500 font-bold">{fila.pp}</td>
                                    <td className="p-4 text-center font-mono text-gray-600">{fila.pL === 0 ? fila.pW : (fila.pW / fila.pL).toFixed(3)}</td>
                                    {showMetrics && <><td className="p-4 text-center bg-blue-50/20 font-mono text-xs text-gray-600">{fila.setsW}</td><td className="p-4 text-center bg-blue-50/20 font-mono text-xs text-gray-600">{fila.setsL}</td><td className="p-4 text-center bg-blue-50/20 font-mono text-xs text-gray-600">{fila.pW}</td><td className="p-4 text-center bg-blue-50/20 font-mono text-xs text-gray-600">{fila.pL}</td></>}
                                 </tr>
                              ))}
                              {tablaPosiciones.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-gray-400">Aún no hay partidos jugados para calcular posiciones.</td></tr>}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {/* === FIXTURE === */}
            {activeTab === 'fixture' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                  <div className="flex justify-between items-center">
                     <h2 className="text-xl font-bold text-gray-800">Fixture y Resultados</h2>
                     <button onClick={() => setModalPartido(true)} className="bg-tdf-blue text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-800 shadow-lg shadow-blue-900/10 transition">
                        <Plus size={20} /> Agregar Partido
                     </button>
                  </div>

                  {/* LISTA PENDIENTES */}
                  {partidosPendientes.length > 0 && (
                     <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                        <div className="flex items-center gap-2 text-orange-700 font-bold mb-4 uppercase tracking-wider text-xs">
                           <AlertTriangle size={16} /> Matches en Borrador / Pendientes
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                           {partidosPendientes.map((p: any) => (
                              <div key={p.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col gap-3">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.round}</span>
                                    <button onClick={(e) => eliminarPartido(e, p.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                                 </div>
                                 <div className="flex items-center justify-between text-sm font-bold text-gray-700">
                                    <span>{p.home_team?.name}</span>
                                    <span className="text-gray-300 text-xs px-2">VS</span>
                                    <span>{p.away_team?.name}</span>
                                 </div>
                                 <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(p.scheduled_time).toLocaleString()}
                                 </div>
                                 <Link href={`/admin/partido/${p.id}`} className="mt-1 w-full text-center bg-tdf-orange text-white py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition flex items-center justify-center gap-1">
                                    <Edit3 size={14} /> Gestionar
                                 </Link>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* LISTA OFICIALES AGRUPADA POR RONDA */}
                  <div className="space-y-8">
                     {partidosOficiales.length > 0 && (
                        Object.entries(
                           partidosOficiales.reduce((acc: any, match) => {
                              const round = match.round || 'Sin Jornada';
                              if (!acc[round]) acc[round] = [];
                              acc[round].push(match);
                              return acc;
                           }, {})
                        ).sort((a: any, b: any) => {
                           // Intentar ordenar por número de fecha si es posible
                           const getNum = (s: string) => { const m = s.match(/\d+/); return m ? parseInt(m[0]) : 999; };
                           return getNum(a[0]) - getNum(b[0]);
                        }).map(([round, matches]: [string, any]) => (
                           <div key={round} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                              <div className="bg-slate-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                 <h3 className="font-black text-slate-700 uppercase tracking-wider text-sm">{round}</h3>
                                 <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{matches.length} Partidos</span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                 {matches.map((p: any) => (
                                    <div key={p.id} className="p-4 hover:bg-slate-50 transition group relative flex flex-col md:flex-row items-center justify-between gap-4">

                                       {/* Info Fecha/Hora */}
                                       <div className="flex items-center gap-4 w-full md:w-auto">
                                          <div className="flex flex-col items-center min-w-[60px] text-gray-400">
                                             <span className="text-xs font-bold uppercase">{new Date(p.scheduled_time).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                                             <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{new Date(p.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
                                          <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                             <MapPin size={12} className="text-gray-300" /> {p.court_name}
                                          </div>
                                       </div>

                                       {/* Equipos y Resultado */}
                                       <div className="flex flex-1 items-center justify-center gap-4 w-full md:w-auto">
                                          <span className={`flex-1 text-right font-bold truncate ${p.home_score > p.away_score ? 'text-gray-900' : 'text-gray-500'}`}>{p.home_team?.name}</span>

                                          <div className={`px-3 py-1 rounded text-sm font-mono font-bold whitespace-nowrap ${p.status === 'finalizado' ? 'bg-gray-100 text-gray-800' : 'bg-blue-50 text-tdf-blue border border-blue-100'}`}>
                                             {p.status === 'finalizado' ? `${p.home_score} - ${p.away_score}` : 'VS'}
                                          </div>

                                          <span className={`flex-1 text-left font-bold truncate ${p.away_score > p.home_score ? 'text-gray-900' : 'text-gray-500'}`}>{p.away_team?.name}</span>
                                       </div>

                                       {/* Acciones */}
                                       <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                                          <button onClick={(e) => eliminarPartido(e, p.id)} className="p-2 text-gray-300 hover:text-red-500 transition hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
                                          <Link href={`/admin/partido/${p.id}`} className="p-2 bg-blue-50 text-tdf-blue rounded-lg hover:bg-blue-100 transition" title="Editar / Cargar Planilla"><Edit3 size={16} /></Link>
                                       </div>

                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))
                     )}

                     {partidosOficiales.length === 0 && partidosPendientes.length === 0 && (
                        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-xl">
                           <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                           <p className="text-gray-500 font-medium">No hay partidos creados en el fixture.</p>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {/* === PLANILLAS === */}
            {activeTab === 'planillas' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="mb-6">
                     <h2 className="text-xl font-black text-gray-800">Control de Planillas</h2>
                     <p className="text-sm text-gray-500">Visualiza y descarga las planillas oficiales enviadas por los planilleros.</p>
                  </div>
                  <MatchSheetsTable />
               </div>
            )}

            {/* === PLAYOFFS === */}
            {activeTab === 'playoffs' && (
               <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                  <Trophy size={60} className="mx-auto text-blue-100 mb-4" />
                  <h3 className="text-xl font-bold text-gray-600">Fase Final</h3>
                  <p className="text-gray-400">Próximamente disponible.</p>
               </div>
            )}

         </div>

         {/* MODAL: NUEVO PARTIDO */}
         {modalPartido && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl scale-100">
                  <h3 className="text-xl font-black text-gray-800 mb-6">Programar Encuentro</h3>
                  <form onSubmit={agregarPartido} className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">Jornada / Fecha</label>
                        <div className="relative">
                           <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400" />
                           <input className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 rounded-xl font-bold text-gray-700 outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue" placeholder="Ej: Fecha 1" value={nuevoPartido.round} onChange={e => setNuevoPartido({ ...nuevoPartido, round: e.target.value })} required />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">Local</label>
                           <select className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-tdf-blue cursor-pointer" required onChange={e => setNuevoPartido({ ...nuevoPartido, home_team_id: e.target.value })} value={nuevoPartido.home_team_id}>
                              <option value="">Seleccionar...</option>
                              {equiposInscriptos.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">Visita</label>
                           <select className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-tdf-blue cursor-pointer" required onChange={e => setNuevoPartido({ ...nuevoPartido, away_team_id: e.target.value })} value={nuevoPartido.away_team_id}>
                              <option value="">Seleccionar...</option>
                              {equiposInscriptos.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                           </select>
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">Cancha</label>
                        <div className="relative">
                           <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" />
                           <input className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 rounded-xl outline-none focus:border-tdf-blue" value={nuevoPartido.court_name} onChange={e => setNuevoPartido({ ...nuevoPartido, court_name: e.target.value })} />
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5 ml-1">Fecha y Hora</label>
                        <input type="datetime-local" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-tdf-blue" required onChange={e => setNuevoPartido({ ...nuevoPartido, scheduled_time: e.target.value })} value={nuevoPartido.scheduled_time} />
                     </div>
                     <div className="flex gap-3 pt-6">
                        <button type="button" onClick={() => setModalPartido(false)} className="flex-1 py-3 border-2 border-gray-100 hover:bg-gray-50 rounded-xl font-bold text-gray-500 transition">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-tdf-blue text-white rounded-xl font-bold hover:bg-blue-800 transition shadow-lg shadow-blue-900/20">Guardar Partido</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}