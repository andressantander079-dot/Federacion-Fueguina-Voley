// src/app/planillero/partido/[id]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolleyMatch } from '../../../../hooks/useVolleyMatch';
import { supabase } from '../../../../lib/supabase';
import LogoutButton from '../../../../components/LogoutButton'; // Asegúrate que la ruta sea correcta
import { 
  RefreshCw, Trophy, X, Check, Search, Plus,
  Download, User, Calendar, Clock, ArrowRightLeft, Volleyball,
  QrCode, MapPin
} from 'lucide-react';

export default function PartidoPlanillaPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id;

  const { 
    sets, currentSetIdx, posHome, posAway, benchHome, benchAway,
    servingTeam, setServingTeam, addPoint, subtractPoint, 
    substitutePlayer, finishSet, initPositions, addPlayerToBench 
  } = useVolleyMatch();

  // --- ESTADOS DE UI ---
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [modalActionOpen, setModalActionOpen] = useState(false);
  const [modalSubOpen, setModalSubOpen] = useState(false);
  
  // --- BUSCADOR JUGADORES ---
  const [modalAddPlayerOpen, setModalAddPlayerOpen] = useState(false);
  const [targetTeamForAdd, setTargetTeamForAdd] = useState<'home'|'away'>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- STAFF & CIERRE ---
  const [referees, setReferees] = useState<any[]>([]);
  const [staff, setStaff] = useState({ ref1: '', ref2: '', scorer: '' });
  
  const [closingFlow, setClosingFlow] = useState(false);
  const [closingStep, setClosingStep] = useState(0); 
  const [observations, setObservations] = useState('');
  const sigPadRef = useRef<HTMLCanvasElement>(null);
  const [signatures, setSignatures] = useState<{
      capHome: string | null;
      capAway: string | null;
      ref1: string | null;
  }>({ capHome: null, capAway: null, ref1: null });

  useEffect(() => {
    initPositions();
    cargarArbitros();
    setServingTeam('home');
  }, []);

  async function cargarArbitros() {
      const { data } = await supabase.from('referees').select('*');
      setReferees(data || []);
  }

  // --- LÓGICA BUSCADOR (Simulada para demo) ---
  const openAddPlayerModal = (team: 'home'|'away') => {
      setTargetTeamForAdd(team); setSearchTerm(''); setSearchResults([]); setModalAddPlayerOpen(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSearching(true);
      setTimeout(() => {
          const mockResults = [{ id: `db_${Date.now()}`, number: 99, name: `Jugador ${searchTerm}` }];
          setSearchResults(mockResults); setIsSearching(false);
      }, 500);
  };

  const confirmAddPlayer = (player: any) => {
      addPlayerToBench(targetTeamForAdd, player); setModalAddPlayerOpen(false);
  };

  // --- MANEJADORES ACCIÓN ---
  const handleJerseyClick = (player: any, team: 'home' | 'away') => {
    setSelectedPlayer({ ...player, team });
    setModalActionOpen(true);
  };

  const handleSubConfirm = (playerIn: any) => {
      if(!selectedPlayer) return;
      substitutePlayer(selectedPlayer.team, selectedPlayer.id, playerIn);
      setModalSubOpen(false); setModalActionOpen(false); setSelectedPlayer(null);
  };

  // --- FIRMAS ---
  const clearSig = () => {
      const ctx = sigPadRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, sigPadRef.current!.width, sigPadRef.current!.height);
  };
  const saveSig = () => {
      const dataUrl = sigPadRef.current?.toDataURL() || null;
      if(closingStep === 1) setSignatures(p => ({...p, capHome: dataUrl}));
      if(closingStep === 2) setSignatures(p => ({...p, capAway: dataUrl}));
      if(closingStep === 3) setSignatures(p => ({...p, ref1: dataUrl}));
      clearSig();
      setClosingStep(p => p + 1);
  };
  const startDraw = (e: any) => {
      const ctx = sigPadRef.current?.getContext('2d'); if(!ctx) return;
      ctx.lineWidth=2; ctx.strokeStyle='#000';
      const rect = sigPadRef.current!.getBoundingClientRect();
      const x = (e.touches?e.touches[0].clientX:e.clientX) - rect.left;
      const y = (e.touches?e.touches[0].clientY:e.clientY) - rect.top;
      ctx.beginPath(); ctx.moveTo(x,y);
  };
  const moveDraw = (e: any) => {
      if(e.buttons!==1 && e.type!=='touchmove') return;
      const ctx = sigPadRef.current?.getContext('2d'); if(!ctx) return;
      const rect = sigPadRef.current!.getBoundingClientRect();
      const x = (e.touches?e.touches[0].clientX:e.clientX) - rect.left;
      const y = (e.touches?e.touches[0].clientY:e.clientY) - rect.top;
      ctx.lineTo(x,y); ctx.stroke();
  };

  // --- ENVÍO A BASE DE DATOS ---
  const submitMatchSheet = async () => {
    try {
      if (!matchId) {
        alert("Modo Prueba: No hay ID de partido en la URL. (En producción esto guardaría en DB)");
        // En producción descomentar return;
      }

      const finalSheetData = {
         submittedAt: new Date().toISOString(),
         sets_history: sets,
         final_score: { 
            home: sets[currentSetIdx].home,
            away: sets[currentSetIdx].away  
         },
         roster_home: [...posHome, ...benchHome].map(p => ({ number: p.number, name: p.name })),
         roster_away: [...posAway, ...benchAway].map(p => ({ number: p.number, name: p.name })),
         staff: staff,
         signatures: signatures,
         observations: observations,
         metadata: {
            category: 'Mayores',
            gender: 'Masculino',
            competition: 'Apertura 2026'
         }
      };

      // Si tenemos ID, guardamos en Supabase
      if (matchId) {
          const { error } = await supabase
            .from('matches')
            .update({ 
                sheet_data: finalSheetData,
                sheet_status: 'submitted',
                status: 'finalizado'
            })
            .eq('id', matchId);
          
          if (error) throw error;
      }

      alert("¡Planilla enviada correctamente a la Federación!");
      router.push('/planillero');

    } catch (error: any) {
      console.error("Error:", error);
      alert("Error al guardar: " + error.message);
    }
  };

  // --- COMPONENTE CAMISETA ---
  const Jersey = ({ player, team, isPos1 }: { player: any, team: 'home'|'away', isPos1?: boolean }) => {
      if (!player) return <div className="w-14 h-14 bg-slate-100 rounded-full animate-pulse"/>;
      const isServing = servingTeam === team && isPos1;
      return (
        <div onClick={() => handleJerseyClick(player, team)} className="relative flex flex-col items-center group cursor-pointer">
            <div className={`w-16 h-14 flex items-center justify-center rounded-xl shadow-sm border-b-4 transition-transform active:scale-95 ${team === 'home' ? 'bg-white border-blue-600 text-blue-900' : 'bg-white border-red-600 text-red-900'}`}>
                <span className="font-black text-2xl">{player.number}</span>
            </div>
            {isServing && (
                <div className="absolute -top-3 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1.5 shadow-sm border-2 border-white animate-bounce z-10">
                    <Volleyball size={14} className="fill-current"/>
                </div>
            )}
            <span className="mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 rounded-full truncate max-w-[70px]">{player.name}</span>
        </div>
      );
  };

  const activeBench = selectedPlayer?.team === 'home' ? benchHome : benchAway;
  const fullRosterHome = [...posHome, ...benchHome].sort((a,b) => a.number - b.number);
  const fullRosterAway = [...posAway, ...benchAway].sort((a,b) => a.number - b.number);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* HEADER APP (Con Logout) */}
      <header className={`bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-20 ${closingStep === 4 ? 'hidden' : ''}`}>
          <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase"><Calendar size={14}/> HOY</div>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase"><Clock size={14}/> 20:00</div>
              <div className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase bg-blue-50 px-3 py-1 rounded-full"><Trophy size={14}/> Fase Regular</div>
          </div>
          
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold text-green-700">EN VIVO</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                  <LogoutButton />
              </div>
          </div>
      </header>

      {/* ÁREA DE JUEGO */}
      <div className={`flex-1 flex overflow-hidden p-4 gap-4 ${closingStep === 4 ? 'hidden' : ''}`}>
          
          {/* LOCAL */}
          <aside className="w-56 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 bg-blue-600 text-white text-center"><h2 className="font-black text-lg">LOCAL</h2></div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  <button onClick={() => openAddPlayerModal('home')} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 hover:text-blue-600 transition flex items-center justify-center gap-2"><Search size={16}/> + Agregar</button>
                  {benchHome.map(p => (
                      <div key={p.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                          <span className="font-black text-slate-700">#{p.number}</span> <span className="text-xs font-medium text-slate-600">{p.name}</span>
                      </div>
                  ))}
              </div>
          </aside>

          {/* CENTRAL */}
          <main className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full max-w-4xl">
                      <div className="flex flex-col items-center gap-2">
                          <div className="text-6xl font-black text-blue-600">{sets[currentSetIdx].home}</div>
                          <div className="flex gap-2">
                             <button onClick={()=>addPoint('home')} className="bg-blue-600 text-white w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition">+</button>
                             <button onClick={()=>subtractPoint('home')} className="bg-slate-100 text-slate-500 hover:text-red-500 w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition border border-slate-200">-</button>
                          </div>
                      </div>
                      <div className="flex flex-col gap-2 w-64 text-center">
                          <h1 className="text-slate-300 font-black text-4xl uppercase tracking-widest">SETS</h1>
                          <div className="border-2 border-slate-100 rounded-lg p-2 font-bold text-slate-600">SET {sets[currentSetIdx].number}: {sets[currentSetIdx].home} - {sets[currentSetIdx].away}</div>
                          {!sets[currentSetIdx].finished ? (
                              <button onClick={() => {if(confirm("Cerrar set?")) finishSet()}} className="w-full py-1 bg-slate-800 text-white rounded text-xs font-bold">Cerrar Set</button>
                          ) : (
                              <button onClick={() => {if(confirm("Iniciar sig set?")) finishSet()}} className="w-full py-1 bg-green-600 text-white rounded text-xs font-bold">Iniciar Set {sets.length+1}</button>
                          )}
                          <button onClick={()=>setServingTeam(prev=>prev==='home'?'away':'home')} className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1 uppercase"><ArrowRightLeft size={10}/> Saque</button>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                          <div className="text-6xl font-black text-red-600">{sets[currentSetIdx].away}</div>
                          <div className="flex gap-2">
                             <button onClick={()=>addPoint('away')} className="bg-red-600 text-white w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition">+</button>
                             <button onClick={()=>subtractPoint('away')} className="bg-slate-100 text-slate-500 hover:text-red-500 w-10 h-10 rounded-lg font-bold text-xl active:scale-95 transition border border-slate-200">-</button>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">1er Árbitro</label>
                      <select className="font-bold text-slate-700 bg-transparent outline-none text-sm" value={staff.ref1} onChange={e=>setStaff({...staff, ref1:e.target.value})}>
                          <option value="">Seleccionar...</option> {referees.map(r => <option key={r.id} value={r.id}>{r.last_name} {r.first_name}</option>)}
                      </select>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Planillero</label>
                      <input className="font-bold text-slate-700 bg-transparent outline-none text-sm" placeholder="Nombre..." value={staff.scorer} onChange={e=>setStaff({...staff, scorer:e.target.value})}/>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">2do Árbitro</label>
                      <select className="font-bold text-slate-700 bg-transparent outline-none text-sm" value={staff.ref2} onChange={e=>setStaff({...staff, ref2:e.target.value})}>
                          <option value="">Opcional</option> {referees.map(r => <option key={r.id} value={r.id}>{r.last_name} {r.first_name}</option>)}
                      </select>
                  </div>
              </div>

              <div className="bg-white rounded-3xl shadow-lg border-4 border-slate-800 relative aspect-[1.8/1] w-full grid grid-cols-2 overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-1.5 bg-slate-800 z-10 shadow-xl"></div>
                  <div className="relative border-r border-slate-200/50 bg-blue-50/30">
                      <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-4">
                          <div className="row-start-1 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[3]} team="home"/></div>
                          <div className="row-start-2 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[2]} team="home"/></div>
                          <div className="row-start-3 col-start-2 flex justify-center items-center"><Jersey player={posHome[1]} team="home"/></div>
                          <div className="row-start-1 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[4]} team="home"/></div>
                          <div className="row-start-2 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posHome[5]} team="home"/></div>
                          <div className="row-start-3 col-start-1 flex justify-center items-center"><Jersey player={posHome[0]} team="home" isPos1={true}/></div>
                      </div>
                  </div>
                  <div className="relative bg-red-50/30">
                      <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-4">
                          <div className="row-start-1 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[1]} team="away"/></div>
                          <div className="row-start-2 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[2]} team="away"/></div>
                          <div className="row-start-3 col-start-1 flex justify-center items-center"><Jersey player={posAway[3]} team="away"/></div>
                          <div className="row-start-1 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[0]} team="away" isPos1={true}/></div>
                          <div className="row-start-2 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300"><Jersey player={posAway[5]} team="away"/></div>
                          <div className="row-start-3 col-start-2 flex justify-center items-center"><Jersey player={posAway[4]} team="away"/></div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end pt-4 pb-10">
                  <button onClick={() => { if(confirm("¿Finalizar Encuentro?")) setClosingFlow(true); }} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-black transition"><Check size={16}/> Finalizar Encuentro</button>
              </div>
          </main>

          {/* VISITA */}
          <aside className="w-56 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 bg-red-600 text-white text-center"><h2 className="font-black text-lg">VISITA</h2></div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  <button onClick={() => openAddPlayerModal('away')} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 hover:text-red-600 transition flex items-center justify-center gap-2"><Search size={16}/> + Agregar</button>
                  {benchAway.map(p => (
                      <div key={p.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                          <span className="font-black text-slate-700">#{p.number}</span> <span className="text-xs font-medium text-slate-600">{p.name}</span>
                      </div>
                  ))}
              </div>
          </aside>
      </div>

      {/* --- MODALES --- */}
      {modalActionOpen && selectedPlayer && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-3xl shadow-2xl w-80">
                  <h3 className="text-center font-black text-3xl mb-1 text-slate-800">#{selectedPlayer.number}</h3>
                  <div className="flex flex-col gap-3 mt-4">
                      <button onClick={()=>{setModalSubOpen(true);}} className="bg-slate-50 text-slate-800 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-100"><RefreshCw size={18}/> Sustitución</button>
                      <div className="flex gap-3"><button className="flex-1 bg-yellow-400 text-yellow-900 py-4 rounded-2xl font-black">Amarilla</button><button className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black">Roja</button></div>
                  </div>
                  <button onClick={()=>setModalActionOpen(false)} className="mt-6 w-full text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
              </div>
          </div>
      )}
      {modalSubOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] backdrop-blur-sm">
              <div className="bg-white p-6 rounded-3xl shadow-2xl w-80 h-[500px] flex flex-col">
                  <h3 className="font-black text-lg mb-4 text-slate-800">Elegir Suplente</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                      {activeBench && activeBench.length > 0 ? activeBench.map(p => (
                          <div key={p.id} onClick={()=>handleSubConfirm(p)} className="p-3 border border-slate-100 rounded-xl hover:bg-blue-50 cursor-pointer flex gap-4 items-center">
                              <span className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-700">{p.number}</span> <span className="font-bold text-slate-600">{p.name}</span>
                          </div>
                      )) : <p className="text-center text-slate-400 mt-10">No hay suplentes disponibles.</p>}
                  </div>
                  <button onClick={()=>setModalSubOpen(false)} className="mt-4 text-slate-400 font-bold hover:text-slate-600">Cerrar</button>
              </div>
          </div>
      )}
      {modalAddPlayerOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[80] backdrop-blur-sm">
              <div className="bg-white p-6 rounded-3xl shadow-2xl w-96 flex flex-col">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-black text-lg text-slate-800">Buscar Jugador</h3><button onClick={()=>setModalAddPlayerOpen(false)}><X size={20} className="text-slate-400"/></button></div>
                  <form onSubmit={handleSearch} className="flex gap-2 mb-4"><input className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" placeholder="Apellido..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus/><button type="submit" className="bg-slate-800 text-white p-3 rounded-xl"><Search size={18}/></button></form>
                  <div className="flex-1 h-64 overflow-y-auto border-t border-slate-100 pt-2 space-y-2">
                      {isSearching && <p className="text-center text-slate-400 text-xs py-4">Buscando...</p>}
                      {searchResults.map(player => (
                          <div key={player.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100"><span className="block font-black text-slate-800">#{player.number} {player.name}</span><button onClick={() => confirmAddPlayer(player)} className="bg-green-500 text-white p-2 rounded-lg"><Plus size={16}/></button></div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- WIZARD DE CIERRE --- */}
      {closingFlow && (
          <div className="fixed inset-0 bg-slate-100 z-[70] flex flex-col animate-in fade-in overflow-y-auto">
              <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm sticky top-0 z-50">
                  <h2 className="font-black text-slate-800 text-lg">Cierre de Encuentro - Paso {closingStep + 1}/5</h2>
                  <button onClick={()=>setClosingFlow(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={18}/></button>
              </div>

              {/* 0. OBS */}
              {closingStep === 0 && (
                  <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
                      <h3 className="font-black text-2xl text-slate-800 mb-4">Observaciones del Árbitro</h3>
                      <textarea className="w-full h-64 bg-white border-2 border-slate-200 rounded-2xl p-6 text-lg outline-none focus:border-blue-500 transition resize-none" placeholder="Escriba aquí cualquier incidencia..." value={observations} onChange={e=>setObservations(e.target.value)}></textarea>
                      <button onClick={()=>setClosingStep(1)} className="mt-6 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold float-right shadow-lg">Siguiente: Firmas</button>
                  </div>
              )}

              {/* 1-3. FIRMAS */}
              {(closingStep >= 1 && closingStep <= 3) && (
                  <div className="flex-1 flex flex-col">
                      <div className="bg-blue-50 p-4 text-center">
                          <span className="font-black text-xl text-blue-900 uppercase tracking-widest">
                              FIRMA: {closingStep===1 ? 'CAPITÁN LOCAL' : closingStep===2 ? 'CAPITÁN VISITA' : '1ER ÁRBITRO'}
                          </span>
                      </div>
                      <div className="flex-1 relative bg-white touch-none cursor-crosshair shadow-inner">
                          <canvas ref={sigPadRef} className="w-full h-full" width={window.innerWidth} height={window.innerHeight*0.6} onMouseDown={startDraw} onMouseMove={moveDraw} onTouchStart={startDraw} onTouchMove={moveDraw}/>
                          <p className="absolute bottom-10 left-0 right-0 text-center text-slate-200 font-black text-5xl pointer-events-none select-none">FIRMAR AQUÍ</p>
                      </div>
                      <div className="p-6 bg-white border-t border-slate-200 flex gap-4 justify-center">
                          <button onClick={clearSig} className="px-8 py-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">Borrar</button>
                          <button onClick={saveSig} className="px-12 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg">Confirmar Firma</button>
                      </div>
                  </div>
              )}

              {/* 4. PREVIEW A4 REAL (DEFINITIVO) */}
              {closingStep === 4 && (
                  <div className="flex-1 bg-slate-200 py-10 px-4 flex justify-center">
                      {/* HOJA A4 */}
                      <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-10 flex flex-col relative text-slate-900">
                          
                          {/* HEADER OFICIAL */}
                          <div className="border-b-4 border-slate-900 pb-6 mb-8 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-2xl">FVU</div>
                                  <div>
                                      <h1 className="text-2xl font-black uppercase tracking-tight leading-none">Federación de Voley</h1>
                                      <h2 className="text-xl font-bold text-slate-600 uppercase tracking-widest">Ushuaia</h2>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <h3 className="text-3xl font-black text-slate-900 uppercase">Planilla Oficial</h3>
                                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase">ID: {Date.now().toString().slice(-8)}</p>
                              </div>
                          </div>

                          {/* DATOS ENCUENTRO (7 CAMPOS COMPLETO) */}
                          <div className="grid grid-cols-4 gap-4 mb-8 text-xs uppercase bg-slate-50 p-4 border border-slate-200 rounded-lg">
                              <div><strong className="block text-slate-400 mb-1">Fecha</strong> {new Date().toLocaleDateString()}</div>
                              <div><strong className="block text-slate-400 mb-1">Hora</strong> 20:00</div>
                              <div><strong className="block text-slate-400 mb-1">Gimnasio</strong> Polivalente</div>
                              <div><strong className="block text-slate-400 mb-1">Instancia</strong> Fase Regular</div>
                              {/* NUEVOS CAMPOS */}
                              <div><strong className="block text-slate-400 mb-1">Competencia</strong> Apertura 2026</div>
                              <div><strong className="block text-slate-400 mb-1">Categoría</strong> Mayores</div>
                              <div><strong className="block text-slate-400 mb-1">Género</strong> Masculino</div>
                          </div>

                          {/* MARCADOR GLOBAL */}
                          <div className="flex items-center justify-between mb-8 px-8">
                              <div className="text-center w-1/3">
                                  <h2 className="text-2xl font-black text-blue-800">CLUB A LOCAL</h2>
                                  <div className="w-full h-1 bg-blue-800 mt-2 mx-auto"></div>
                              </div>
                              <div className="text-6xl font-black text-slate-800 px-8 border-x-2 border-slate-100">
                                  {sets[currentSetIdx].home} - {sets[currentSetIdx].away}
                              </div>
                              <div className="text-center w-1/3">
                                  <h2 className="text-2xl font-black text-red-800">CLUB B VISITA</h2>
                                  <div className="w-full h-1 bg-red-800 mt-2 mx-auto"></div>
                              </div>
                          </div>

                          {/* TABLA DE SETS */}
                          <table className="w-full mb-8 text-sm text-center border-collapse border border-slate-200">
                              <thead className="bg-slate-900 text-white font-bold uppercase">
                                  <tr>
                                      <th className="py-2">Set</th>
                                      <th>Puntos Local</th>
                                      <th>Puntos Visita</th>
                                      <th>Estado</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {sets.map((s, i) => (
                                      <tr key={i} className="border-b border-slate-200 even:bg-slate-50">
                                          <td className="py-2 font-bold">{s.number}</td>
                                          <td>{s.home}</td>
                                          <td>{s.away}</td>
                                          {/* ESTADO LIMPIO: Si no terminó, no muestra nada */}
                                          <td className="text-xs font-bold uppercase text-slate-500">{s.finished ? 'Finalizado' : ''}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          {/* LISTAS DE JUGADORES */}
                          <div className="grid grid-cols-2 gap-8 mb-8 flex-1">
                              {/* Local Roster */}
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                  <div className="bg-blue-100 p-2 text-center font-bold text-blue-900 text-xs uppercase border-b border-blue-200">Plantel Local</div>
                                  <ul className="text-xs p-2 space-y-1">
                                      {fullRosterHome.map(p => (
                                          <li key={p.id} className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="font-bold">#{p.number}</span> <span>{p.name}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              {/* Away Roster */}
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                  <div className="bg-red-100 p-2 text-center font-bold text-red-900 text-xs uppercase border-b border-red-200">Plantel Visita</div>
                                  <ul className="text-xs p-2 space-y-1">
                                      {fullRosterAway.map(p => (
                                          <li key={p.id} className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="font-bold">#{p.number}</span> <span>{p.name}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>

                          {/* OBSERVACIONES */}
                          <div className="bg-yellow-50 border border-yellow-200 p-4 mb-8 text-xs rounded-lg">
                              <strong className="block text-yellow-700 uppercase mb-2">Observaciones del Árbitro</strong>
                              <p className="italic text-slate-700">{observations || "Sin observaciones."}</p>
                          </div>

                          {/* FIRMAS */}
                          <div className="grid grid-cols-3 gap-8 mb-8 mt-auto">
                              <div className="text-center border-t border-slate-300 pt-2">
                                  {signatures.capHome && <img src={signatures.capHome} className="h-12 mx-auto mb-1"/>}
                                  <p className="text-[10px] font-bold uppercase text-slate-500">Capitán Local</p>
                              </div>
                              <div className="text-center border-t border-slate-300 pt-2">
                                  {signatures.capAway && <img src={signatures.capAway} className="h-12 mx-auto mb-1"/>}
                                  <p className="text-[10px] font-bold uppercase text-slate-500">Capitán Visita</p>
                              </div>
                              <div className="text-center border-t border-slate-300 pt-2">
                                  {signatures.ref1 && <img src={signatures.ref1} className="h-12 mx-auto mb-1"/>}
                                  <p className="text-[10px] font-bold uppercase text-slate-500">1er Árbitro: {referees.find(r=>r.id===staff.ref1)?.last_name}</p>
                              </div>
                          </div>

                          {/* FOOTER */}
                          <div className="flex justify-between items-end text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                              <div>
                                  <p>Planillero: <span className="font-bold text-slate-600">{staff.scorer}</span></p>
                                  {staff.ref2 && <p>2do Árbitro: <span className="font-bold text-slate-600">{referees.find(r=>r.id===staff.ref2)?.last_name}</span></p>}
                              </div>
                              <div className="flex items-center gap-2">
                                  <QrCode size={32} className="text-slate-800"/>
                                  <div className="text-right">
                                      <p className="font-bold">VALIDACIÓN DIGITAL</p>
                                      <p>Escanee para verificar</p>
                                  </div>
                              </div>
                          </div>

                      </div>

                      {/* BOTONES ACCIÓN FLOTANTES */}
                      <div className="fixed bottom-8 right-8 flex gap-4 z-50 print:hidden">
                          <button onClick={()=>window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-black transition"><Download size={16}/> Imprimir</button>
                          <button onClick={submitMatchSheet} className="bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 transition"><Check size={16}/> Finalizar y Enviar</button>
                      </div>
                  </div>
              )}
          </div>
      )}

    </div>
  );
}