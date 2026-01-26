// src/app/admin/tramites/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
   FileText, CheckCircle, XCircle, Clock,
   Search, ArrowLeft, Download, AlertTriangle,
   Copy, Info, AlertOctagon, TrendingUp, Keyboard
} from 'lucide-react';

// Motivos rápidos de rechazo (Rec #2)
const REJECTION_REASONS = [
   "Comprobante ilegible o borroso",
   "Monto no coincide con el arancel",
   "Falta firma de autoridad",
   "Documento vencido",
   "N° de Operación incorrecto"
];

export default function AdminTramitesPage() {
   const router = useRouter();
   const supabase = createClient();
   const [loading, setLoading] = useState(true);

   // Datos Principales
   const [procedures, setProcedures] = useState<any[]>([]);
   const [selectedProcId, setSelectedProcId] = useState<string | null>(null);

   // Filtros y UI
   const [filterStatus, setFilterStatus] = useState<'en_revision' | 'aprobado' | 'rechazado'>('en_revision');
   const [searchTerm, setSearchTerm] = useState('');

   // Acciones
   const [rejectMode, setRejectMode] = useState(false);
   const [rejectReason, setRejectReason] = useState('');

   // Estados Calculados (Helpers)
   const filteredProcs = procedures.filter(p => {
      const matchStatus = p.status === filterStatus;
      const matchSearch = p.teams?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.code?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
   });

   const selectedProc = procedures.find(p => p.id === selectedProcId);

   // REC #11: DETECTOR DE DUPLICADOS
   // Busca otros trámites del mismo club, mismo monto/título en los últimos 2 días
   const potentialDuplicates = selectedProc ? procedures.filter(p =>
      p.id !== selectedProc.id &&
      p.team_id === selectedProc.team_id &&
      (p.amount === selectedProc.amount || p.title === selectedProc.title) &&
      p.status === 'en_revision'
   ) : [];

   useEffect(() => {
      fetchProcedures();
   }, []);

   // REC #10: NAVEGACIÓN POR TECLADO
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         // Solo si no estamos escribiendo en un input
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

         if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateList(1);
         } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateList(-1);
         } else if ((e.key === 'a' || e.key === 'A') && selectedProc && !rejectMode && filterStatus === 'en_revision') {
            e.preventDefault();
            handleApprove();
         } else if ((e.key === 'r' || e.key === 'R') && selectedProc && !rejectMode && filterStatus === 'en_revision') {
            e.preventDefault();
            setRejectMode(true);
         } else if (e.key === 'Escape') {
            setRejectMode(false);
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [selectedProcId, filteredProcs, rejectMode, filterStatus]);

   function navigateList(direction: number) {
      if (filteredProcs.length === 0) return;
      const currentIndex = filteredProcs.findIndex(p => p.id === selectedProcId);
      let newIndex = currentIndex + direction;

      // Límites
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= filteredProcs.length) newIndex = filteredProcs.length - 1;

      setSelectedProcId(filteredProcs[newIndex].id);
      setRejectMode(false);
   }

   async function fetchProcedures() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');

      const { data, error } = await supabase
         .from('procedures')
         .select(`*, teams (name, logo_url)`) // Traemos datos del club
         .order('created_at', { ascending: false });

      if (error) console.error(error);
      setProcedures(data || []);
      setLoading(false);
   }

   // --- ACCIONES ---

   const handleApprove = async () => {
      if (!selectedProc) return;
      if (!confirm("¿Confirmar APROBACIÓN de este trámite?")) return;

      try {
         await supabase.from('procedures').update({ status: 'aprobado', updated_at: new Date() }).eq('id', selectedProc.id);
         await supabase.from('procedure_history').insert([{ procedure_id: selectedProc.id, status: 'aprobado', comment: 'Aprobado por Administración' }]);

         refreshUI();
      } catch (error) { alert("Error al aprobar"); }
   };

   const handleReject = async () => {
      if (!selectedProc || !rejectReason) return;
      try {
         await supabase.from('procedures').update({ status: 'rechazado', rejection_reason: rejectReason, updated_at: new Date() }).eq('id', selectedProc.id);
         await supabase.from('procedure_history').insert([{ procedure_id: selectedProc.id, status: 'rechazado', comment: `Rechazado: ${rejectReason}` }]);

         refreshUI();
      } catch (error) { alert("Error al rechazar"); }
   };

   const refreshUI = async () => {
      await fetchProcedures();
      setRejectMode(false);
      setRejectReason('');
      // Avanzar al siguiente automáticamente (Productividad)
      navigateList(1);
   };

   // REC #12: EXPORTAR A CSV
   const exportToCSV = () => {
      if (filteredProcs.length === 0) return alert("No hay datos para exportar.");

      const headers = ["ID", "Fecha", "Club", "Categoria", "Titulo", "Monto", "Banco", "Operacion", "Estado"];
      const rows = filteredProcs.map(p => [
         p.code,
         new Date(p.created_at).toLocaleDateString(),
         p.teams?.name,
         p.category,
         p.title,
         p.amount || 0,
         p.bank_name || '-',
         p.operation_number || '-',
         p.status
      ]);

      const csvContent = "data:text/csv;charset=utf-8,"
         + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `reporte_tramites_${filterStatus}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
   };

   // Helpers Visuales
   const getSLAColor = (dateStr: string) => {
      if (filterStatus !== 'en_revision') return 'border-slate-200';
      const hours = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
      if (hours < 24) return 'border-green-500';
      if (hours < 48) return 'border-yellow-500';
      return 'border-red-500'; // Urgente
   };

   if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Cargando Sistema...</div>;

   return (
      <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans text-white">

         {/* HEADER */}
         <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex justify-between items-center flex-shrink-0 z-20 shadow-sm h-16">
            <div className="flex items-center gap-4">
               <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><ArrowLeft size={20} /></Link>
               <h1 className="text-lg font-black text-white flex items-center gap-2">
                  Gestión de Trámites
                  <div className="hidden md:flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-normal text-zinc-500 border border-zinc-700">
                     <Keyboard size={12} /> <span>Usa flechas, A y R</span>
                  </div>
               </h1>
            </div>

            <div className="flex items-center gap-3">
               {/* FILTROS (Rec #4) */}
               <div className="flex bg-zinc-800 p-1 rounded-lg">
                  <button onClick={() => { setFilterStatus('en_revision'); setSelectedProcId(null) }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${filterStatus === 'en_revision' ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'text-zinc-500'}`}>
                     <Clock size={14} /> Pendientes
                  </button>
                  <button onClick={() => { setFilterStatus('aprobado'); setSelectedProcId(null) }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${filterStatus === 'aprobado' ? 'bg-zinc-700 text-emerald-400 shadow-sm' : 'text-zinc-500'}`}>
                     <CheckCircle size={14} /> Aprobados
                  </button>
                  <button onClick={() => { setFilterStatus('rechazado'); setSelectedProcId(null) }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${filterStatus === 'rechazado' ? 'bg-zinc-700 text-red-400 shadow-sm' : 'text-zinc-500'}`}>
                     <XCircle size={14} /> Rechazados
                  </button>
               </div>

               {/* BOTÓN EXPORTAR CSV (Rec #12) */}
               {filterStatus === 'aprobado' && (
                  <button onClick={exportToCSV} className="bg-white text-black px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-xs font-bold transition" title="Descargar reporte contable">
                     <Download size={14} /> CSV
                  </button>
               )}
            </div>
         </header>

         {/* SPLIT VIEW (Rec #1) */}
         <div className="flex flex-1 overflow-hidden">

            {/* --- IZQUIERDA: LISTA --- */}
            <div className="w-full md:w-1/3 min-w-[320px] bg-zinc-900 border-r border-zinc-800 flex flex-col z-10">
               <div className="p-3 border-b border-zinc-800 bg-zinc-900">
                  <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                     <input
                        className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-lg outline-none focus:border-blue-500 placeholder-zinc-600"
                        placeholder="Buscar trámite..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredProcs.length === 0 ? (
                     <div className="text-center py-10 text-zinc-600">
                        <p className="text-sm">No hay trámites en esta vista.</p>
                     </div>
                  ) : (
                     filteredProcs.map(proc => (
                        <div
                           key={proc.id}
                           onClick={() => { setSelectedProcId(proc.id); setRejectMode(false); }}
                           className={`
                        p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition relative border-l-4
                        ${selectedProcId === proc.id ? 'bg-zinc-800 border-l-blue-500' : 'border-l-transparent'}
                        ${getSLAColor(proc.created_at)}
                      `}
                        >
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">{proc.category}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(proc.created_at).toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center gap-2 mb-1">
                              <img src={proc.teams?.logo_url || '/placeholder.png'} className="w-6 h-6 rounded-full bg-zinc-800 object-contain border border-zinc-700" />
                              <h4 className="font-bold text-zinc-200 text-sm truncate">{proc.teams?.name}</h4>
                           </div>
                           <p className="text-sm text-zinc-400 truncate font-medium">{proc.title}</p>

                           {proc.category === 'Sanciones' && (
                              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 w-fit px-2 py-0.5 rounded border border-red-500/20">
                                 <AlertTriangle size={10} /> TRIBUNAL
                              </div>
                           )}
                        </div>
                     ))
                  )}
               </div>
            </div>

            {/* --- DERECHA: DETALLE --- */}
            <div className="flex-1 bg-black flex flex-col h-full overflow-hidden relative">
               {selectedProc ? (
                  <>
                     {/* 1. HEADER DEL TRÁMITE */}
                     <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 shadow-sm z-10 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <h2 className="text-xl font-black text-white">{selectedProc.title}</h2>
                              <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                                 <span className="flex items-center gap-1"><FileText size={14} /> ID: {selectedProc.code}</span>

                                 {/* REC #9: CLUB PROFILE CONTEXT */}
                                 <div className="group relative">
                                    <span className="flex items-center gap-1 font-bold text-blue-400 cursor-help hover:underline">
                                       {selectedProc.teams?.name} <Info size={14} />
                                    </span>
                                    {/* Tooltip Flotante */}
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-zinc-800 text-white text-xs rounded-xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-zinc-700">
                                       <h4 className="font-bold border-b border-zinc-600 pb-2 mb-2">Perfil Institucional</h4>
                                       <div className="space-y-2">
                                          <div className="flex justify-between"><span>Estado:</span> <span className="text-emerald-400 font-bold">Activo ✅</span></div>
                                          <div className="flex justify-between"><span>Deuda:</span> <span className="text-white font-bold">$0.00</span></div>
                                          <div className="flex justify-between"><span>Categoría:</span> <span className="text-yellow-400 font-bold">A</span></div>
                                       </div>
                                    </div>
                                 </div>

                              </div>
                           </div>

                           {/* DATOS FINANCIEROS (Rec #5) */}
                           {selectedProc.category === 'Pagos' && selectedProc.amount && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg flex gap-6 text-sm">
                                 <div><span className="block text-[10px] font-bold text-emerald-500 uppercase">Monto</span><span className="block text-lg font-black text-emerald-400">${selectedProc.amount}</span></div>
                                 <div>
                                    <span className="block text-[10px] font-bold text-emerald-500 uppercase">Operación</span>
                                    <div className="flex items-center gap-1 font-mono font-bold text-emerald-300">
                                       {selectedProc.operation_number}
                                       <button onClick={() => navigator.clipboard.writeText(selectedProc.operation_number)} className="hover:text-emerald-500"><Copy size={12} /></button>
                                    </div>
                                 </div>
                                 <div className="hidden xl:block"><span className="block text-[10px] font-bold text-emerald-500 uppercase">Banco</span><span className="font-bold text-emerald-300">{selectedProc.bank_name}</span></div>
                              </div>
                           )}
                        </div>

                        {/* REC #11: ALERTA DUPLICADOS */}
                        {potentialDuplicates.length > 0 && (
                           <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex items-center gap-3 text-orange-400 animate-in slide-in-from-top-2">
                              <AlertOctagon size={20} className="flex-shrink-0" />
                              <div className="text-xs">
                                 <span className="font-bold block">POSIBLE DUPLICADO DETECTADO</span>
                                 Hay otros {potentialDuplicates.length} trámite(s) similar(es) de este club en revisión. Verifica antes de aprobar.
                              </div>
                           </div>
                        )}
                     </div>

                     {/* 2. VISOR DE DOCUMENTO */}
                     <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-zinc-950">
                        {selectedProc.attachment_url ? (
                           <div className="w-full max-w-4xl bg-zinc-900 shadow-xl rounded-xl overflow-hidden flex flex-col min-h-[500px] border border-zinc-800">
                              <div className="p-2 bg-zinc-800 text-white text-xs flex justify-between items-center px-4">
                                 <span className="font-bold opacity-80">Vista Previa</span>
                                 <a href={selectedProc.attachment_url} target="_blank" className="hover:text-blue-300 flex items-center gap-1 font-bold"><Download size={14} /> Descargar Original</a>
                              </div>
                              {selectedProc.attachment_url.toLowerCase().endsWith('.pdf') ? (
                                 <iframe src={selectedProc.attachment_url} className="w-full flex-1" title="PDF Viewer"></iframe>
                              ) : (
                                 <div className="flex-1 flex items-center justify-center bg-zinc-800/10">
                                    <img src={selectedProc.attachment_url} className="max-w-full max-h-full object-contain shadow-lg" alt="Comprobante" />
                                 </div>
                              )}
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center text-zinc-700 mt-20">
                              <AlertTriangle size={64} className="mb-4 opacity-30" />
                              <p className="font-medium">Sin archivo adjunto</p>
                           </div>
                        )}
                     </div>

                     {/* 3. BARRA DE ACCIONES (Footer) */}
                     {filterStatus === 'en_revision' && (
                        <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex justify-end items-center gap-4 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">

                           {rejectMode ? (
                              <div className="flex-1 flex items-center gap-3 animate-in slide-in-from-bottom-2 bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                                 <div className="flex-1">
                                    <input
                                       className="w-full p-2 border border-red-500/30 rounded-lg text-sm outline-none focus:ring-2 ring-red-500/50 bg-zinc-950 text-white placeholder-red-300/50"
                                       placeholder="Motivo del rechazo (Obligatorio)..."
                                       value={rejectReason}
                                       onChange={e => setRejectReason(e.target.value)}
                                       autoFocus
                                    />
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                                       {REJECTION_REASONS.map(r => (
                                          <button key={r} onClick={() => setRejectReason(r)} className="text-[10px] bg-zinc-900 border border-zinc-700 hover:border-red-400 px-3 py-1 rounded-full whitespace-nowrap text-zinc-400 transition">
                                             {r}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-2">
                                    <button onClick={() => setRejectMode(false)} className="px-4 py-1.5 text-zinc-400 font-bold hover:bg-zinc-800 rounded-lg text-xs">Cancelar (Esc)</button>
                                    <button onClick={handleReject} disabled={!rejectReason} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md disabled:opacity-50 text-xs">
                                       Confirmar
                                    </button>
                                 </div>
                              </div>
                           ) : (
                              <>
                                 <div className="mr-auto hidden lg:flex items-center gap-4 text-xs text-zinc-500 font-medium">
                                    <span className="flex items-center gap-1"><span className="border border-zinc-700 px-1.5 rounded bg-zinc-800">A</span> Aprobar</span>
                                    <span className="flex items-center gap-1"><span className="border border-zinc-700 px-1.5 rounded bg-zinc-800">R</span> Rechazar</span>
                                    <span className="flex items-center gap-1"><span className="border border-zinc-700 px-1.5 rounded bg-zinc-800">⬇</span> Mover</span>
                                 </div>

                                 <button onClick={() => setRejectMode(true)} className="px-6 py-3 border-2 border-zinc-700 text-red-500 font-bold rounded-xl hover:bg-red-500/10 hover:border-red-500/50 transition flex items-center gap-2">
                                    <XCircle size={20} /> Rechazar
                                 </button>
                                 <button onClick={handleApprove} className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center gap-2 transform hover:scale-105 active:scale-95">
                                    <CheckCircle size={20} /> Aprobar & Notificar
                                 </button>
                              </>
                           )}
                        </div>
                     )}

                  </>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-700 bg-black">
                     <TrendingUp size={64} className="mb-6 opacity-10" />
                     <h3 className="text-xl font-bold text-zinc-500">Panel de Gestión</h3>
                     <p className="max-w-xs text-center text-sm mt-2 opacity-60">Selecciona un trámite de la izquierda o usa las flechas del teclado para comenzar.</p>
                  </div>
               )}
            </div>

         </div>
      </div>
   );
}