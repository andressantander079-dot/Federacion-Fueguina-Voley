'use client';
import { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function R5Demo() {
    const [r5Form, setR5Form] = useState<(any | null)[]>([null, null, null, null, null, null]);
    const [r5Libero, setR5Libero] = useState<any | null>(null);
    const [activeR5Box, setActiveR5Box] = useState<number>(0);
    const [showModal, setShowModal] = useState(true);

    const bench = [
        { id: '1', number: 10, name: 'Lionel Messi', isCaptain: true, isLibero: false },
        { id: '2', number: 7, name: 'Cristiano Ronaldo', isCaptain: false, isLibero: false },
        { id: '3', number: 1, name: 'Emiliano Martinez', isCaptain: false, isLibero: false },
        { id: '4', number: 12, name: 'Facundo Conte', isCaptain: false, isLibero: false },
        { id: '5', number: 5, name: 'Luciano De Cecco', isCaptain: false, isLibero: false },
        { id: '6', number: 8, name: 'Agustin Loser', isCaptain: false, isLibero: false },
        { id: '7', number: 9, name: 'Danani', isCaptain: false, isLibero: true },
    ];

    const availablePlayers = bench.filter(p => !r5Form.find(r => r?.id === p.id) && r5Libero?.id !== p.id);

    const handleSelectPlayer = (player: any) => {
        if (activeR5Box === 6) {
            setR5Libero(player);
        } else {
            const newForm = [...r5Form];
            newForm[activeR5Box] = player;
            setR5Form(newForm);
            const nextEmpty = newForm.findIndex((p, idx) => idx > activeR5Box && p === null);
            if (nextEmpty !== -1) setActiveR5Box(nextEmpty);
            else if (newForm.every(p => p !== null)) setActiveR5Box(6);
        }
    };

    const isComplete = r5Form.every(p => p !== null);
    const teamColor = 'blue';
    const teamName = 'Ushuaia Voley';

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white font-black text-xl uppercase px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                R5 LOCAL
            </button>

            {showModal && (
                 <div className="fixed inset-0 bg-slate-900/80 z-[100] flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-full md:max-h-[85vh]">
                        <div className={`bg-${teamColor}-600 p-4 text-white flex justify-between items-center relative shrink-0`}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md p-1">
                                    <img src="https://gmqvyskslwfxocshwuxr.supabase.co/storage/v1/object/public/public_assets/logo.png" alt="FDFV" className="w-[80%] h-[80%] object-contain" onError={e => e.currentTarget.src='https://ui-avatars.com/api/?name=FDFV&background=fff&color=000'} />
                                </div>
                                <div>
                                    <div className="text-xl md:text-3xl font-black tracking-widest leading-none">R5 DIGITAL - SET 1</div>
                                    <div className="text-xs md:text-sm font-bold opacity-90 uppercase mt-1 text-yellow-300">EQUIPO LOCAL: <span className="text-white">{teamName}</span></div>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[500px] bg-slate-50">
                            {/* COLUMNA IZQUIERDA: BANCA */}
                            <div className="w-full md:w-5/12 p-4 md:p-6 flex flex-col bg-white border-b md:border-b-0 md:border-r border-slate-200">
                                <h3 className="font-black text-slate-500 uppercase tracking-widest text-[10px] md:text-xs mb-3">Plantel Disponible {activeR5Box === 6 ? '(Líbero)' : '(Formación)'}</h3>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {availablePlayers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                            <p className="font-bold">Plantel vacío</p>
                                        </div>
                                    ) : (
                                        availablePlayers.map(p => {
                                            const isLibSuggestion = p.isLibero && activeR5Box === 6;
                                            return (
                                                <div key={p.id} onClick={() => handleSelectPlayer(p)} className={`bg-white border md:text-lg border-slate-100 p-2.5 md:p-3 flex items-center gap-3 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group rounded-2xl ${isLibSuggestion ? 'ring-2 ring-purple-300 bg-purple-50/20' : ''}`}>
                                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg bg-slate-50 text-slate-500 group-hover:bg-${teamColor}-600 group-hover:text-white transition-colors ${isLibSuggestion ? 'bg-purple-600 text-white' : ''}`}>{p.number}</span>
                                                    <span className="font-bold text-slate-700 flex-1 truncate">{p.name}</span>
                                                    {p.isLibero && <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase hidden md:inline-block">Líbero</span>}
                                                    {p.isCaptain && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase hidden md:inline-block">Capitán</span>}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                            
                            {/* COLUMNA DERECHA: EL PAPEL R5 PREMIUM */}
                            <div className="w-full md:w-7/12 p-4 md:p-8 flex flex-col items-center justify-center overflow-y-auto">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                     <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px] md:text-xs">Formación Oficial</h3>
                                     <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Obligatorio</span>
                                </div>
                                
                                {/* LA "HOJA" PREMIUM */}
                                <div className="bg-white p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 w-full max-w-[360px] md:max-w-[400px] rounded-[2rem] relative flex flex-col items-center">
                                    {/* Grid de Cancha */}
                                    <div className="w-full relative bg-slate-50/50 rounded-2xl border border-slate-100 p-3 mb-4 grid grid-cols-3 gap-2 md:gap-3">
                                        <div className="absolute top-0 inset-x-4 h-[3px] bg-red-400 rounded-full shadow-sm"></div>
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black bg-red-50 text-red-500 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-red-100">RED</div>
                                        
                                        {[
                                            { rIdx: 3, label: 'IV' },
                                            { rIdx: 2, label: 'III' },
                                            { rIdx: 1, label: 'II' },
                                            { rIdx: 4, label: 'V' },
                                            { rIdx: 5, label: 'VI' },
                                            { rIdx: 0, label: 'I' },
                                        ].map(({ rIdx, label }) => {
                                            const isLocked = rIdx > 0 && r5Form[rIdx-1] === null;
                                            const isActive = activeR5Box === rIdx;
                                            const player = r5Form[rIdx];

                                            return (
                                                <div key={rIdx} onClick={() => !isLocked && setActiveR5Box(rIdx)}
                                                    className={`aspect-[4/3] rounded-xl border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative ${isActive ? 'border-blue-500 bg-blue-50 shadow-md ring-4 ring-blue-50 z-10 scale-105' : (isLocked ? 'border-dashed border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-50' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm')} ${player && !isActive ? 'bg-white border-slate-200' : ''}`}>
                                                    
                                                    {player && isActive && (
                                                        <button onClick={(e) => { e.stopPropagation(); const n = [...r5Form]; n[rIdx] = null; setR5Form(n); setActiveR5Box(rIdx); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"><X size={12}/></button>
                                                    )}

                                                    {!player ? (
                                                        <div className="flex flex-col items-center justify-center opacity-40">
                                                            <span className="text-xl md:text-2xl font-black">{label}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center w-full h-full gap-1 p-1">
                                                            <span className="text-[10px] font-black text-slate-300 mb-[-2px]">{label}</span>
                                                            <div className="bg-blue-100 text-blue-700 w-full rounded-lg py-1.5 flex flex-col items-center justify-center px-1">
                                                                 <span className="font-black text-sm md:text-base leading-none">#{player.number}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* SECCIÓN LÍBERO PREM */}
                                    <div className={`w-full flex items-center justify-between border-2 rounded-2xl p-3 cursor-pointer transition-all ${activeR5Box === 6 ? 'border-purple-500 bg-purple-50 shadow-md ring-4 ring-purple-50 scale-105' : (!isComplete ? 'border-dashed border-slate-200 opacity-50 cursor-not-allowed' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm')}`} onClick={() => isComplete && setActiveR5Box(6)}>
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-black text-lg md:text-xl rounded-xl transition-colors ${activeR5Box === 6 || r5Libero ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                L
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">Líbero</div>
                                                <div className="font-bold text-sm md:text-base text-slate-700">
                                                    {r5Libero ? <span className="text-purple-700">#{r5Libero.number} {r5Libero.name}</span> : <span className="text-slate-400 font-medium text-xs md:text-sm">Asignar Líbero...</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {r5Libero && activeR5Box === 6 && (
                                            <button onClick={(e) => { e.stopPropagation(); setR5Libero(null); setActiveR5Box(6); }} className="bg-red-500 text-white rounded-full p-1.5 shadow-md hover:scale-110 mr-1"><X size={14}/></button>
                                        )}
                                    </div>
                                    
                                </div>

                                <div className="mt-6 w-full max-w-[360px] md:max-w-[400px]">
                                    <button 
                                        disabled={!isComplete} 
                                        onClick={() => setShowModal(false)}
                                        className={`w-full py-4 rounded-2xl font-black text-sm md:text-base shadow-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isComplete ? 'bg-green-500 hover:bg-green-400 text-white hover:scale-[1.02] active:scale-95 hover:shadow-2xl hover:shadow-green-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                    >
                                        <Check size={20} /> Guardar Formación
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
