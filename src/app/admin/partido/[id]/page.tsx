// src/app/admin/partido/[id]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Timer, CheckCircle, Clock, 
  User, FileText, AlertTriangle, Youtube, Star, Hourglass, Download 
} from 'lucide-react';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function DefinirPartidoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const sheetRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [playersList, setPlayersList] = useState<any[]>([]);

  const [status, setStatus] = useState('programado');
  const [sets, setSets] = useState([
    { home: '', away: '' }, { home: '', away: '' }, 
    { home: '', away: '' }, { home: '', away: '' }, { home: '', away: '' },
  ]);

  const [extras, setExtras] = useState({
     referee_1: '',        
     referee_2: '',        
     scorekeeper: '',      
     observations: '',     
     mvp_player_id: '',    
     video_url: '',        
     match_duration: ''    
  });

  useEffect(() => {
    if (id) cargarDatosCompletos();
  }, [id]);

  async function cargarDatosCompletos() {
    setLoading(true);
    
    const { data: m, error } = await supabase
      .from('matches')
      .select(`*, home_team:teams!home_team_id(name, logo_url), away_team:teams!away_team_id(name, logo_url), tournament:tournaments(name)`)
      .eq('id', id)
      .single();

    if (error) { alert("Error al cargar partido"); router.back(); return; }

    setMatch(m);
    setStatus(m.status);
    
    // Cargar jugadores
    const { data: players } = await supabase
        .from('players')
        .select('*')
        .or(`team_id.eq.${m.home_team_id},team_id.eq.${m.away_team_id}`)
        .order('number', { ascending: true });

    if (players) setPlayersList(players);

    // Cargar sets
    if (m.set_scores && Array.isArray(m.set_scores)) {
       const newSets = [...sets];
       m.set_scores.forEach((score: string, index: number) => {
          if (index < 5) {
             const [h, a] = score.split('-');
             newSets[index] = { home: h, away: a };
          }
       });
       setSets(newSets);
    }

    // Cargar extras
    setExtras({
        referee_1: m.referee_1 || '',
        referee_2: m.referee_2 || '',
        scorekeeper: m.scorekeeper || '',
        observations: m.observations || '',
        mvp_player_id: m.mvp_player_id || '',
        video_url: m.video_url || '',
        // Convertimos a string para mostrarlo en el input, si es null ponemos vacío
        match_duration: m.match_duration ? m.match_duration.toString() : ''
    });

    setLoading(false);
  }

  const updateSet = (index: number, team: 'home' | 'away', value: string) => {
     const newSets = [...sets];
     newSets[index][team] = value;
     setSets(newSets);
  };

  const aplicarWO = (ganador: 'local' | 'visita') => {
      if(!confirm(`¿Aplicar W.O. a favor del ${ganador === 'local' ? 'LOCAL' : 'VISITANTE'}?`)) return;
      const setsWO = sets.map(s => ({ home: '', away: '' }));
      for(let i=0; i<3; i++) {
          setsWO[i] = ganador === 'local' ? { home: '25', away: '0' } : { home: '0', away: '25' };
      }
      setSets(setsWO);
      setStatus('finalizado');
      setExtras({...extras, observations: extras.observations + `\n⚠️ Partido ganado por W.O. (${ganador.toUpperCase()})`});
  };

  const calcularGlobal = () => {
     let homeWins = 0, awayWins = 0;
     sets.forEach(s => {
        const h = parseInt(s.home), a = parseInt(s.away);
        if (!isNaN(h) && !isNaN(a)) {
           if (h > a) homeWins++;
           if (a > h) awayWins++;
        }
     });
     return { homeWins, awayWins };
  };

  async function generarYSubirPDF() {
     if (!sheetRef.current) return null;
     
     try {
         const canvas = await html2canvas(sheetRef.current, { 
             scale: 2, 
             useCORS: true,       
             allowTaint: true,    
             backgroundColor: '#ffffff' 
         });
         
         const imgData = canvas.toDataURL('image/jpeg', 0.8);
         const pdf = new jsPDF('p', 'mm', 'a4');
         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
         pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

         const pdfBlob = pdf.output('blob');
         const fileName = `planilla_${id}_${Date.now()}.pdf`;

         const { error } = await supabase.storage
            .from('planillas') 
            .upload(fileName, pdfBlob, { upsert: true });

         if (error) {
             console.error("Error Supabase Storage:", error);
             throw error;
         }

         const { data: urlData } = supabase.storage.from('planillas').getPublicUrl(fileName);
         return urlData.publicUrl;

     } catch (err) {
         console.error("Error Generando/Subiendo PDF:", err);
         return null;
     }
  }

  async function guardarCambios() {
     if (!extras.referee_1.trim()) return alert("❗ Faltan Datos: El 1º Árbitro es obligatorio.");
     if (!extras.scorekeeper.trim()) return alert("❗ Faltan Datos: El Planillero es obligatorio.");

     setGuardando(true);
     const { homeWins, awayWins } = calcularGlobal();

     let pdfUrl = match.match_sheet_url;
     if (status === 'finalizado') {
         const generatedUrl = await generarYSubirPDF();
         if (generatedUrl) {
             pdfUrl = generatedUrl;
         } else {
             console.warn("No se pudo generar PDF. Revisa permisos del bucket.");
         }
     }

     const setsLimpios = sets
        .filter(s => s.home !== '' && s.away !== '')
        .map(s => `${s.home}-${s.away}`);

     // === CORRECCIÓN CLAVE PARA EL ERROR 'INVALID INPUT SYNTAX' ===
     const updateData = {
        status: status,
        home_score: homeWins,
        away_score: awayWins,
        set_scores: setsLimpios,
        referee_1: extras.referee_1,
        referee_2: extras.referee_2,
        scorekeeper: extras.scorekeeper,
        observations: extras.observations,
        video_url: extras.video_url,
        match_sheet_url: pdfUrl,
        
        // Si está vacío (''), mandamos null. Si tiene número, lo parseamos.
        match_duration: extras.match_duration === '' ? null : parseInt(extras.match_duration),
        
        // Si está vacío (''), mandamos null.
        mvp_player_id: extras.mvp_player_id === '' ? null : extras.mvp_player_id
     };

     const { error } = await supabase.from('matches').update(updateData).eq('id', id);

     setGuardando(false);

     if (!error) {
        alert("✅ Planilla guardada correctamente.");
        router.push(`/admin/competencias/${match.tournament_id}`);
     } else {
        alert("Error al guardar en BD: " + error.message);
     }
  }

  if (loading) return <div className="p-20 text-center text-slate-400">Cargando planilla...</div>;
  const resultadoParcial = calcularGlobal();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center items-start">
       <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-slate-900 text-white p-6 text-center relative">
             <Link href={`/admin/competencias/${match.tournament_id}`} className="absolute left-4 top-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                <ArrowLeft size={20}/>
             </Link>
             <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{match.tournament?.name} • {match.round || 'Fecha'}</span>
             <h1 className="text-2xl font-black mt-2">Planilla de Juego</h1>
          </div>

          <div className="p-6">
             <div ref={sheetRef} className="bg-white p-4 rounded-xl mb-6">
                <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
                    <div className="text-center w-1/3">
                        <div className="md:text-3xl text-xl font-black text-slate-800 mb-1">{match.home_team.name}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Local</div>
                    </div>
                    <div className="text-center bg-white px-4 py-2 md:px-6 md:py-3 rounded-xl shadow-sm border border-slate-200">
                        <span className="text-3xl md:text-4xl font-black text-indigo-600">{resultadoParcial.homeWins}</span>
                        <span className="text-slate-300 mx-2 text-2xl">-</span>
                        <span className="text-3xl md:text-4xl font-black text-indigo-600">{resultadoParcial.awayWins}</span>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="md:text-3xl text-xl font-black text-slate-800 mb-1">{match.away_team.name}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Visita</div>
                    </div>
                </div>

                <div className="mb-6 border-b border-slate-100 pb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-3 text-center">Parciales</label>
                    <div className="space-y-2">
                        {sets.map((set, i) => (
                        <div key={i} className="flex items-center gap-3 justify-center">
                            <span className="text-[10px] font-black text-slate-300 w-8 text-right">SET {i + 1}</span>
                            <input type="number" className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-bold text-lg outline-none focus:border-indigo-500" placeholder="-" value={set.home} onChange={(e) => updateSet(i, 'home', e.target.value)}/>
                            <span className="text-slate-300 font-bold">-</span>
                            <input type="number" className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-bold text-lg outline-none focus:border-indigo-500" placeholder="-" value={set.away} onChange={(e) => updateSet(i, 'away', e.target.value)}/>
                        </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">1º Árbitro</p>
                        <p className="font-bold">{extras.referee_1 || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Planillero</p>
                        <p className="font-bold">{extras.scorekeeper || '-'}</p>
                    </div>
                    <div className="col-span-2 mt-2">
                         <p className="text-xs font-bold text-slate-400 uppercase">Observaciones</p>
                         <p className="italic text-xs bg-yellow-50 p-2 rounded border border-yellow-100">{extras.observations || 'Sin observaciones.'}</p>
                    </div>
                </div>
             </div>

             <div className="space-y-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Estado</label>
                        <div className="flex gap-2">
                             <button onClick={() => setStatus('programado')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${status === 'programado' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Programado</button>
                             <button onClick={() => setStatus('en_vivo')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${status === 'en_vivo' ? 'bg-red-500 text-white border-red-500' : 'text-slate-400'}`}>En Vivo</button>
                             <button onClick={() => setStatus('finalizado')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${status === 'finalizado' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-400'}`}>Final</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Walkover</label>
                        <div className="flex gap-2">
                            <button onClick={() => aplicarWO('local')} className="flex-1 py-2 rounded-lg text-xs font-bold border border-red-100 bg-red-50 text-red-500 hover:bg-red-100">W.O. Local</button>
                            <button onClick={() => aplicarWO('visita')} className="flex-1 py-2 rounded-lg text-xs font-bold border border-red-100 bg-red-50 text-red-500 hover:bg-red-100">W.O. Visita</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">1º Árbitro *</label>
                        <input className="w-full border p-2 rounded bg-white" value={extras.referee_1} onChange={e => setExtras({...extras, referee_1: e.target.value})}/>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Planillero *</label>
                        <input className="w-full border p-2 rounded bg-white" value={extras.scorekeeper} onChange={e => setExtras({...extras, scorekeeper: e.target.value})}/>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">2º Árbitro</label>
                        <input className="w-full border p-2 rounded bg-white" value={extras.referee_2} onChange={e => setExtras({...extras, referee_2: e.target.value})}/>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Duración (Min)</label>
                        <input type="number" className="w-full border p-2 rounded bg-white" value={extras.match_duration} onChange={e => setExtras({...extras, match_duration: e.target.value})}/>
                    </div>
                    
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-orange-500 uppercase block mb-1 flex items-center gap-1"><Star size={10}/> MVP (Jugador del Partido)</label>
                        <select 
                            className="w-full border-2 border-orange-100 p-2 rounded bg-white text-sm font-bold text-slate-700 outline-none focus:border-orange-400"
                            value={extras.mvp_player_id}
                            onChange={e => setExtras({...extras, mvp_player_id: e.target.value})}
                        >
                            <option value="">-- Seleccionar Jugador --</option>
                            {playersList.length === 0 && <option disabled>⚠️ No hay jugadores cargados en estos equipos</option>}
                            {playersList.map(p => (
                                <option key={p.id} value={p.id}>
                                    #{p.number} {p.name} ({p.team_id === match.home_team_id ? match.home_team.name : match.away_team.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-red-500 uppercase block mb-1 flex items-center gap-1"><Youtube size={12}/> Link Video</label>
                        <input className="w-full border p-2 rounded bg-white text-sm" placeholder="https://youtube.com..." value={extras.video_url} onChange={e => setExtras({...extras, video_url: e.target.value})}/>
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observaciones</label>
                        <textarea className="w-full border p-2 rounded bg-white h-20 text-sm resize-none" value={extras.observations} onChange={e => setExtras({...extras, observations: e.target.value})}/>
                    </div>
                </div>

                <button 
                    onClick={guardarCambios}
                    disabled={guardando}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-800 transition shadow-xl flex items-center justify-center gap-2"
                >
                    {guardando ? 'Generando PDF y Guardando...' : <><Save size={20}/> Guardar y Cerrar Planilla</>}
                </button>

                {match.match_sheet_url && !guardando && (
                    <a href={match.match_sheet_url} target="_blank" className="block text-center text-xs font-bold text-indigo-600 hover:underline flex items-center justify-center gap-1">
                        <Download size={12}/> Ver PDF guardado anteriormente
                    </a>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}