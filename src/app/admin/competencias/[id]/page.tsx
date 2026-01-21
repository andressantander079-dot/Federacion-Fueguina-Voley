// src/app/admin/competencias/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// CORRECCIÓN 1: Ajuste de ruta (4 niveles hacia arriba)
import { supabase } from '../../../../lib/supabase';
import { 
  Trophy, Eye, EyeOff, Plus, Trash2, Edit3, 
  ArrowLeft, AlertTriangle, Clock, MapPin, Calendar, FileText 
} from 'lucide-react';
import Link from 'next/link';

// CORRECCIÓN 1: Ajuste de ruta también para el componente
import MatchSheetsTable from '../../../../components/admin/MatchSheetsTable';

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
            // CORRECCIÓN 2: Tipado explícito (item: any, a: any, b: any)
            listaEquipos = equiposRel.map((item: any) => item.team).sort((a:any, b:any) => a.name.localeCompare(b.name));
            setEquiposInscriptos(listaEquipos);
        }

        if (mData) {
            setPartidosPendientes(mData.filter((m: any) => m.status === 'borrador'));
            setPartidosOficiales(mData.filter((m: any) => m.status !== 'borrador'));
            if (tData) calcularTabla(mData.filter((m: any) => m.status !== 'borrador'), tData.point_system, listaEquipos);
        }

    } catch (error: any) { // CORRECCIÓN 3: Tipado del error
        console.error("Error cargando datos:", error);
    } finally {
        setLoading(false);
    }
  }

  function calcularTabla(matches: any[], sistemaPuntos: string, equiposParticipantes: any[]) {
     const stats: any = {};
     equiposParticipantes.forEach((eq: any) => {
         stats[eq.id] = { id: eq.id, name: eq.name, pts: 0, pg: 0, pp: 0, setsW: 0, setsL: 0, pW: 0, pL: 0 };
     });

     matches.forEach((m: any) => {
        if (!stats[m.home_team_id]) stats[m.home_team_id] = { id: m.home_team_id, name: m.home_team?.name, pts: 0, pg: 0, pp: 0, setsW: 0, setsL: 0, pW: 0, pL: 0 };
        if (!stats[m.away_team_id]) stats[m.away_team_id] = { id: m.away_team_id, name: m.away_team?.name, pts: 0, pg: 0, pp: 0, setsW: 0, setsL: 0, pW: 0, pL: 0 };
     });

     matches.filter((m: any) => m.status === 'finalizado').forEach((m: any) => {
        let swHome = 0, swAway = 0, pwHome = 0, pwAway = 0; 
        if (m.set_scores) {
           m.set_scores.forEach((s: string) => {
              const [h, a] = s.split('-').map(Number);
              pwHome += h; pwAway += a;
              if (h > a) swHome++; else swAway++;
           });
        } else {
           swHome = m.home_score; swAway = m.away_score;
        }
        const ganadorLocal = swHome > swAway;
        
        // Evitar error si el equipo fue borrado pero el partido existe
        if (stats[m.home_team_id]) {
            stats[m.home_team_id].pg += ganadorLocal ? 1 : 0;
            stats[m.home_team_id].pp += ganadorLocal ? 0 : 1;
            stats[m.home_team_id].setsW += swHome;
            stats[m.home_team_id].setsL += swAway;
            stats[m.home_team_id].pW += pwHome;
            stats[m.home_team_id].pL += pwAway;
        }

        if (stats[m.away_team_id]) {
            stats[m.away_team_id].pg += ganadorLocal ? 0 : 1;
            stats[m.away_team_id].pp += ganadorLocal ? 1 : 0;
            stats[m.away_team_id].setsW += swAway;
            stats[m.away_team_id].setsL += swHome;
            stats[m.away_team_id].pW += pwAway;
            stats[m.away_team_id].pL += pwHome;
        }

        if (sistemaPuntos === 'fivb') {
           if (ganadorLocal) {
              if (swAway <= 1 && stats[m.home_team_id]) stats[m.home_team_id].pts += 3;
              else { 
                  if(stats[m.home_team_id]) stats[m.home_team_id].pts += 2; 
                  if(stats[m.away_team_id]) stats[m.away_team_id].pts += 1; 
              }
           } else {
              if (swHome <= 1 && stats[m.away_team_id]) stats[m.away_team_id].pts += 3;
              else { 
                  if(stats[m.away_team_id]) stats[m.away_team_id].pts += 2; 
                  if(stats[m.home_team_id]) stats[m.home_team_id].pts += 1; 
              }
           }
        } else {
           if(stats[m.home_team_id]) stats[m.home_team_id].pts += ganadorLocal ? 2 : 1;
           if(stats[m.away_team_id]) stats[m.away_team_id].pts += ganadorLocal ? 1 : 2;
        }
     });
     setTablaPosiciones(Object.values(stats).sort((a: any, b: any) => b.pts - a.pts));
  }

  // --- VALIDACIÓN DE CONFLICTOS BLINDADA ---
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
            .eq('scheduled_time', isoDate) 
            .or(`home_team_id.eq.${homeId},away_team_id.eq.${homeId},home_team_id.eq.${awayId},away_team_id.eq.${awayId}`);

        if (errorHora) { console.error("Error BD Hora:", errorHora); return null; }
        if (conflictosHora && conflictosHora.length > 0) return "⚠️ ERROR: Conflicto de horario. Uno de los equipos ya juega a esa hora exacta.";

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
      if(!confirm("🗑️ ¿Estás seguro de eliminar este partido definitivamente?")) return;
      
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      
      if(!error) {
          setPartidosPendientes(current => current.filter((p: any) => p.id !== matchId));
          setPartidosOficiales(current => current.filter((p: any) => p.id !== matchId));
      } else {
          alert("❌ Error al eliminar: " + error.message);
      }
  }

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!torneo) return <div className="p-10 text-center">Torneo no encontrado.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6">
           <Link href="/admin/competencias" className="p-2 bg-white border rounded-full hover:bg-slate-50"><ArrowLeft size={20}/></Link>
           <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                 {torneo.category?.name || 'General'} • Temp. {torneo.season}
              </span>
              <h1 className="text-3xl font-black text-slate-800 leading-none mt-1">{torneo.name}</h1>
           </div>
        </div>

        {/* TABS (CON 'PLANILLAS' AGREGADO) */}
        <div className="flex gap-4 border-b border-slate-200 mb-8 overflow-x-auto">
           {['fixture', 'tabla', 'playoffs', 'planillas'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-2 font-bold capitalize transition border-b-2 flex items-center gap-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                 {tab === 'tabla' ? 'Posiciones' : tab === 'planillas' ? <><FileText size={16}/> Planillas</> : tab}
              </button>
           ))}
        </div>

        {/* === TABLA DE POSICIONES === */}
        {activeTab === 'tabla' && (
           <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-slate-700">Tabla General</h2>
                 <button onClick={() => setShowMetrics(!showMetrics)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${showMetrics ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                    {showMetrics ? <Eye size={16}/> : <EyeOff size={16}/>} {showMetrics ? 'Ocultar Métricas' : 'Ver Métricas Admin'}
                 </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                       <tr>
                          <th className="p-4 w-10 text-center">#</th>
                          <th className="p-4">Equipo</th>
                          <th className="p-4 text-center">PTS</th>
                          <th className="p-4 text-center">PG</th>
                          <th className="p-4 text-center">PP</th>
                          <th className="p-4 text-center">DIF</th>
                          {showMetrics && <><th className="p-4 text-center bg-indigo-50">Sets G</th><th className="p-4 text-center bg-indigo-50">Sets P</th><th className="p-4 text-center bg-indigo-50">Tantos G</th><th className="p-4 text-center bg-indigo-50">Tantos P</th></>}
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {tablaPosiciones.map((fila: any, i: number) => (
                          <tr key={fila.id} className="hover:bg-slate-50 transition">
                             <td className={`p-4 text-center font-bold ${i < 4 ? 'text-indigo-600' : 'text-slate-400'}`}>{i + 1}</td>
                             <td className="p-4 font-bold text-slate-800">{fila.name}</td>
                             <td className="p-4 text-center font-black text-lg bg-slate-50/50">{fila.pts}</td>
                             <td className="p-4 text-center text-green-600 font-bold">{fila.pg}</td>
                             <td className="p-4 text-center text-red-500 font-bold">{fila.pp}</td>
                             <td className="p-4 text-center font-mono text-slate-600">{fila.pL === 0 ? fila.pW : (fila.pW / fila.pL).toFixed(3)}</td>
                             {showMetrics && <><td className="p-4 text-center bg-indigo-50/30 font-mono text-xs">{fila.setsW}</td><td className="p-4 text-center bg-indigo-50/30 font-mono text-xs">{fila.setsL}</td><td className="p-4 text-center bg-indigo-50/30 font-mono text-xs">{fila.pW}</td><td className="p-4 text-center bg-indigo-50/30 font-mono text-xs">{fila.pL}</td></>}
                          </tr>
                       ))}
                       {tablaPosiciones.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate-400">Aún no hay partidos jugados.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* === FIXTURE === */}
        {activeTab === 'fixture' && (
           <div className="animate-in fade-in space-y-8">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-700">Fixture</h2>
                 <button onClick={() => setModalPartido(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition">
                    <Plus size={20}/> Agregar Partido
                 </button>
              </div>

              {/* LISTA PENDIENTES */}
              {partidosPendientes.length > 0 && (
                <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200">
                    <div className="flex items-center gap-2 text-orange-700 font-bold mb-4 uppercase tracking-wider text-sm">
                        <AlertTriangle size={18}/> Pendientes de Confirmación
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {partidosPendientes.map((p: any) => (
                            <div key={p.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <span>{p.home_team?.name}</span>
                                        <span className="text-slate-300 text-xs">VS</span>
                                        <span>{p.away_team?.name}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => eliminarPartido(e, p.id)} className="p-2 text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                    <Link href={`/admin/partido/${p.id}`} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 shadow-sm flex items-center gap-1">
                                        <Edit3 size={14}/> Definir
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* LISTA OFICIALES */}
              <div>
                 {partidosOficiales.length > 0 && <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Agenda Oficial</h3>}
                 <div className="space-y-3">
                    {partidosOficiales.map((p: any) => (
                       <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-indigo-300 transition group">
                          
                          <div className="flex items-center gap-4 w-full md:w-auto justify-center">
                             <div className="text-center w-20">
                                <span className="block text-xs font-black text-white bg-slate-900 px-2 py-1 rounded mb-1">{p.round || 'Fecha ?'}</span>
                                <span className="block text-[10px] font-bold uppercase text-slate-400">
                                   {new Date(p.scheduled_time).toLocaleDateString('es-AR', {day:'2-digit', month:'short'})}
                                </span>
                             </div>
                             
                             <div className="h-10 w-px bg-slate-100"></div>
                             
                             <div className="text-sm">
                                <div className="text-slate-500 flex items-center gap-1 text-xs"><Clock size={12}/> {new Date(p.scheduled_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} hs</div>
                                <div className="text-slate-500 flex items-center gap-1 text-xs"><MapPin size={12}/> {p.court_name}</div>
                             </div>
                          </div>

                          <div className="flex items-center gap-6 flex-1 justify-center">
                             <span className={`font-bold text-right flex-1 ${p.home_score > p.away_score ? 'text-slate-900' : 'text-slate-500'}`}>{p.home_team?.name}</span>
                             <div className="px-3 py-1 bg-slate-100 rounded text-slate-600 font-mono font-bold">{p.status === 'finalizado' ? `${p.home_score} - ${p.away_score}` : 'VS'}</div>
                             <span className={`font-bold text-left flex-1 ${p.away_score > p.home_score ? 'text-slate-900' : 'text-slate-500'}`}>{p.away_team?.name}</span>
                          </div>

                          <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                             <button onClick={(e) => eliminarPartido(e, p.id)} className="p-2 text-slate-300 hover:text-red-500 transition" title="Eliminar"><Trash2 size={16}/></button>
                             <Link href={`/admin/partido/${p.id}`} className="p-2 bg-slate-50 text-indigo-600 rounded hover:bg-indigo-50"><Edit3 size={16}/></Link>
                          </div>
                       </div>
                    ))}
                    {partidosOficiales.length === 0 && partidosPendientes.length === 0 && <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">No hay partidos creados.</div>}
                 </div>
              </div>
           </div>
        )}

        {/* === PLAYOFFS === */}
        {activeTab === 'playoffs' && (
           <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <Trophy size={60} className="mx-auto text-indigo-100 mb-4"/>
              <h3 className="text-xl font-bold text-slate-600">Fase Final</h3>
              <p className="text-slate-400">Próximamente.</p>
           </div>
        )}

        {/* === PLANILLAS (INTEGRACIÓN NUEVA) === */}
        {activeTab === 'planillas' && (
            <div className="animate-in fade-in">
                <div className="mb-6">
                    <h2 className="text-lg font-black text-slate-800">Control de Planillas</h2>
                    <p className="text-sm text-slate-500">Visualiza y descarga las planillas oficiales enviadas.</p>
                </div>
                {/* COMPONENTE DE PLANILLAS */}
                <MatchSheetsTable />
            </div>
        )}

      </div>

      {/* MODAL: NUEVO PARTIDO */}
      {modalPartido && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
               <h3 className="text-xl font-bold mb-4">Programar Encuentro</h3>
               <form onSubmit={agregarPartido} className="space-y-4">
                  <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Jornada / Fecha</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-3 text-slate-400"/>
                        <input className="w-full border p-2 pl-9 rounded font-bold" placeholder="Ej: Fecha 1" value={nuevoPartido.round} onChange={e => setNuevoPartido({...nuevoPartido, round: e.target.value})} required />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Local</label>
                        <select className="w-full border p-2 rounded" required onChange={e => setNuevoPartido({...nuevoPartido, home_team_id: e.target.value})} value={nuevoPartido.home_team_id}>
                           <option value="">Seleccionar...</option>
                           {equiposInscriptos.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Visita</label>
                        <select className="w-full border p-2 rounded" required onChange={e => setNuevoPartido({...nuevoPartido, away_team_id: e.target.value})} value={nuevoPartido.away_team_id}>
                           <option value="">Seleccionar...</option>
                           {equiposInscriptos.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 block mb-1">Cancha</label>
                     <input className="w-full border p-2 rounded" value={nuevoPartido.court_name} onChange={e => setNuevoPartido({...nuevoPartido, court_name: e.target.value})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 block mb-1">Fecha y Hora</label>
                     <input type="datetime-local" className="w-full border p-2 rounded" required onChange={e => setNuevoPartido({...nuevoPartido, scheduled_time: e.target.value})} value={nuevoPartido.scheduled_time}/>
                  </div>
                  <div className="flex gap-2 pt-4">
                     <button type="button" onClick={() => setModalPartido(false)} className="flex-1 py-2 border rounded text-slate-500">Cancelar</button>
                     <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold">Guardar</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}