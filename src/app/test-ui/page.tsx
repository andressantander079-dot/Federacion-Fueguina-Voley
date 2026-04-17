'use client';
import { AlertTriangle, AlertCircle, Users, Camera, IdCard, ShieldCheck, DollarSign, Plus, FileText, Send, Paperclip } from 'lucide-react';

export default function TestUIPage() {
   return (
      <div className="min-h-screen bg-zinc-950 p-8 space-y-12">
         {/* 1. Modulo 1: Modal PIN */}
         <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl relative h-[400px] flex items-center justify-center">
            <h2 className="absolute top-4 left-4 text-white font-bold opacity-50">1. Módulo 1 (Modal Delete PIN)</h2>
            <div className="bg-zinc-900 rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-2xl border border-zinc-800 text-center relative z-10">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                     <AlertTriangle size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Eliminar Partido</h3>
                  <p className="text-sm text-zinc-400 mb-6">Para confirmar la eliminación, ingrese el PIN de Administrador Oficial.</p>
                  
                  <input 
                     type="password" 
                     maxLength={4}
                     placeholder="****"
                     className="w-full bg-zinc-950 border border-zinc-800 focus:border-tdf-blue p-4 text-center text-3xl tracking-[1em] rounded-xl outline-none text-white font-mono mb-2"
                     readOnly
                     value="0 2 5 8"
                  />
                  
                  <div className="flex gap-3 mt-6">
                     <button type="button" className="flex-1 py-3 border border-zinc-800 hover:bg-zinc-800 rounded-xl font-bold text-zinc-400 transition">Cancelar</button>
                     <button type="button" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">Eliminar</button>
                  </div>
               </div>
         </div>

         {/* 2. Modulo 4: Banner & Dual Tag */}
         <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <h2 className="text-white font-bold opacity-50 mb-4">2. Módulo 4: Banner y Jugadores Faltantes</h2>
            
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                   <AlertCircle size={24} className="text-orange-500 animate-pulse" />
                </div>
                <div>
                   <h3 className="text-orange-500 font-bold text-lg">Documentación Faltante en Planteles Activos</h3>
                   <p className="text-orange-400/80 text-sm">
                     Hay <strong className="text-white">3 jugador/es</strong> en tu club que no han cargado todos sus documentos (CEMAD o Comprobante).
                   </p>
                </div>
             </div>
             <div className="shrink-0 bg-orange-500 text-white px-4 py-2 rounded-xl text-center">
                <span className="block text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Fecha Límite</span>
                <span className="block font-black text-xl">8 MAY 2026</span>
             </div>
            </div>

            {/* Fila Jugador Faltante */}
            <div className="border border-zinc-800/80 bg-zinc-900 p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
               <div className="w-10 h-10 shrink-0 bg-zinc-800 rounded-full flex items-center justify-center font-black text-white text-sm">9</div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                     <h4 className="font-bold text-white text-base">Juan Pérez</h4>
                     <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-sm bg-orange-500/20 text-orange-500">
                        Habilitado (Falta CEMAD)
                     </span>
                     <span className="text-[10px] font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-sm">
                        Habilitado (Falta Comprobante)
                     </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                     <span>DNI 12345678</span> • <span>Punta</span>
                  </div>
               </div>
               <div className="flex gap-2 items-center justify-end shrink-0">
                  <label className="cursor-pointer bg-orange-600 text-white p-2 rounded-lg flex items-center gap-1">
                     <Plus size={16} /> <FileText size={16} />
                  </label>
                  <label className="cursor-pointer bg-green-600 text-white p-2 rounded-lg flex items-center gap-1">
                     <Plus size={16} /> <DollarSign size={16} />
                  </label>
               </div>
            </div>
         </div>

         {/* 3. Modulo 3: Mensaje Box Scroll Overflow */}
         <div className="bg-slate-50/50 dark:bg-transparent border border-zinc-800 p-8 rounded-2xl relative h-[450px] overflow-hidden flex flex-col justify-start">
            <h2 className="absolute top-4 left-4 text-white font-bold opacity-50 z-20">3. Módulo 3: Formulario de Mensajería (Scroll Interno Evita Bloqueo)</h2>
            <div className="overflow-y-auto w-full p-4 md:p-8 flex-1 mt-12 border border-dashed border-zinc-600/50 rounded-xl relative">
               <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm shrink-0 mx-auto">
                     <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-6">
                        <div>
                           <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Alta Prioridad</span>
                           <h2 className="text-3xl font-black mt-3 text-white">Solicitud de Inscripción Faltante</h2>
                        </div>
                     </div>
                     <div className="space-y-4 mb-8 text-slate-600 dark:text-zinc-400 leading-relaxed text-sm h-[300px]">
                        <p>Estimados, enviamos por este medio...</p>
                        <div className="p-4 bg-zinc-800/50 rounded-xl text-center text-zinc-500 my-10">Texto extremadamente largo que empuja el botón hacia abajo...</div>
                        <div className="p-4 bg-zinc-800/50 rounded-xl text-center text-zinc-500 my-10">Texto extremadamente largo que empuja el botón hacia abajo...</div>
                     </div>

                     <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 mt-6 relative z-10 bottom-0">
                        <textarea className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue mb-4 text-slate-800 dark:text-white" placeholder="Escribir respuesta..." />
                        <div className="flex justify-between items-center">
                           <button className="p-3 text-slate-400 hover:text-slate-600 dark:text-zinc-500 hover:dark:text-zinc-300 transition-colors"><Paperclip size={20} /></button>
                           <div className="flex gap-3">
                              <button className="px-6 py-3 font-bold rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800">Cancelar</button>
                              <button className="flex items-center gap-2 px-6 py-3 font-bold rounded-xl bg-tdf-blue text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"><Send size={18} /> Enviar Respuesta</button>
                           </div>
                        </div>
                     </div>
               </div>
            </div>
         </div>
      </div>
   );
}
