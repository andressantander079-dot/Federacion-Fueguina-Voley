'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
   FileText, CheckCircle, XCircle, Clock,
   Search, ArrowLeft, Download, AlertTriangle,
   Info, AlertOctagon, TrendingUp, Keyboard, Users, Shield, UserCheck, Loader2
} from 'lucide-react';

// Unified Type
type DashboardItem = {
   id: string;
   type: 'procedure' | 'player';
   title: string;
   subtitle: string;
   status: string; // Keep generic string to match DB values exactly
   date: string;
   team_name: string;
   team_logo?: string;
   originalData: any;
};

export default function AdminTramitesPage() {
   const router = useRouter();
   const supabase = createClient();
   const [loading, setLoading] = useState(true);

   // Datos Principales
   const [items, setItems] = useState<DashboardItem[]>([]);
   const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

   // Filtros y UI
   const [filterStatus, setFilterStatus] = useState<'pendientes' | 'aprobados' | 'rechazados'>('pendientes');
   const [searchTerm, setSearchTerm] = useState('');

   // Acciones
   const [processingAction, setProcessingAction] = useState(false);

   // Estados Calculados (Helpers)
   const filteredItems = items.filter(p => {
      // Normalize Status for Filter
      // Pendiente: 'en_revision' (tramites), 'pending' (players)
      // Aprobado: 'aprobado' (tramites), 'active' (players)
      // Rechazado: 'rechazado' (tramites), 'rejected' (players)

      const s = p.status.toLowerCase();
      const isPending = s === 'en_revision' || s === 'pending';
      const isApproved = s === 'aprobado' || s === 'active';
      const isRejected = s === 'rechazado' || s === 'rejected';

      let matchStatus = false;
      if (filterStatus === 'pendientes') matchStatus = isPending;
      if (filterStatus === 'aprobados') matchStatus = isApproved;
      if (filterStatus === 'rechazados') matchStatus = isRejected;

      const matchSearch = p.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
   });

   const selectedItem = items.find(p => p.id === selectedItemId);

   useEffect(() => {
      fetchAll();
   }, []);

   async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');

      // 1. Procedures
      const { data: proceduresData } = await supabase
         .from('procedures')
         .select(`*, teams (name, logo_url)`)
         .order('created_at', { ascending: false });

      // 2. Players (Validations)
      const { data: playersData } = await supabase
         .from('players')
         .select(`*, team:teams(name)`)
         .order('created_at', { ascending: false });

      const mappedProcedures: DashboardItem[] = (proceduresData || []).map((p: any) => ({
         id: p.id,
         type: 'procedure',
         title: p.title,
         subtitle: p.category,
         status: p.status,
         date: p.created_at,
         team_name: p.teams?.name || 'Club',
         originalData: p
      }));

      const mappedPlayers: DashboardItem[] = (playersData || []).map((p: any) => ({
         id: p.id,
         type: 'player',
         title: `Validación: ${p.name}`,
         subtitle: `DNI: ${p.dni}`,
         status: p.status,
         date: p.created_at,
         team_name: p.team?.name || 'Club',
         originalData: p
      }));

      // Merge and sort
      const allItems = [...mappedProcedures, ...mappedPlayers].sort((a, b) =>
         new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setItems(allItems);
      setLoading(false);
   }

   // --- ACCIONES GENÉRICAS ---

   const handleApprove = async () => {
      if (!selectedItem) return;
      if (!confirm("¿Confirmar APROBACIÓN de este trámite/jugador?")) return;
      setProcessingAction(true);

      try {
         // 1. Obtener Cuenta de Tesorería y Configuración (Fee)
         const { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'ACTIVO').limit(1);
         const { data: settings } = await supabase.from('settings').select('player_fee').single();

         const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;
         const playerFee = settings?.player_fee || 0; // Default to 0 if not set

         if (selectedItem.type === 'procedure') {
            // == TRÁMITE ==
            if (accountId) {
               const { error: treasuryError } = await supabase.from('treasury_movements').insert([{
                  type: 'INGRESO',
                  amount: Number(selectedItem.originalData.amount) || 0,
                  description: `Trámite: ${selectedItem.title} - Op: ${selectedItem.originalData.code || 'S/N'}`,
                  entity_name: selectedItem.team_name,
                  date: new Date(),
                  account_id: accountId
               }]);
               if (treasuryError) console.error("Error creating treasury movement for procedure:", treasuryError);
            }
            await supabase.from('procedures').update({ status: 'aprobado', updated_at: new Date() }).eq('id', selectedItem.id);
            alert("Trámite aprobado y registrado en Tesorería.");
         } else {
            // == JUGADOR ==
            if (accountId && playerFee > 0) {
               const { error: treasuryError } = await supabase.from('treasury_movements').insert([{
                  type: 'INGRESO',
                  amount: playerFee,
                  description: `Inscripción Jugador: ${selectedItem.originalData.name} - DNI ${selectedItem.originalData.dni}`,
                  entity_name: selectedItem.team_name,
                  date: new Date(),
                  account_id: accountId
               }]);
               if (treasuryError) console.error("Error creating treasury movement for player:", treasuryError);
            }
            // Update Player Status
            await supabase.from('players').update({ status: 'active', rejection_reason: null }).eq('id', selectedItem.id);
            alert(playerFee > 0 ? `Jugador validado. Se generó un ingreso de $${playerFee} en Tesorería.` : "Jugador validado correctamente.");
         }

         await fetchAll();
      } catch (error: any) {
         console.error(error);
         alert("Error al aprobar: " + error.message);
      }
      finally { setProcessingAction(false); }
   };

   const handleReject = async () => {
      if (!selectedItem) return;

      const reason = prompt("Ingrese el motivo del rechazo (Visible para el Club):");
      if (reason === null) return; // Cancelled
      if (!reason.trim()) return alert("Debe ingresar un motivo para rechazar.");

      setProcessingAction(true);
      try {
         if (selectedItem.type === 'procedure') {
            await supabase.from('procedures').update({ status: 'rechazado', rejection_reason: reason, updated_at: new Date() }).eq('id', selectedItem.id);
         } else {
            // Players use 'rejected' status
            await supabase.from('players').update({ status: 'rejected', rejection_reason: reason }).eq('id', selectedItem.id);
         }

         alert("Rechazado correctamente.");
         await fetchAll();
      } catch (error) { alert("Error al rechazar"); }
      finally { setProcessingAction(false); }
   };


   // Helpers Visuales
   const getSLAColor = (dateStr: string) => {
      if (filterStatus !== 'pendientes') return 'border-slate-200';
      const hours = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
      return hours < 24 ? 'border-green-500' : 'border-red-500';
   };

   // Determine if we should show Actions Footer
   const showActions = selectedItem && (
      selectedItem.status === 'en_revision' ||
      selectedItem.status === 'pending'
   );

   if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Cargando Sistema...</div>;

   return (
      <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans text-white">

         {/* HEADER */}
         <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex justify-between items-center flex-shrink-0 z-20 shadow-sm h-16">
            <div className="flex items-center gap-4">
               <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><ArrowLeft size={20} /></Link>
               <h1 className="text-lg font-black text-white flex items-center gap-2">
                  Mesa de Entrada
               </h1>
            </div>

            <div className="flex items-center gap-3">
               {/* FILTROS */}
               <div className="flex bg-zinc-800 p-1 rounded-lg">
                  <button onClick={() => { setFilterStatus('pendientes'); setSelectedItemId(null) }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${filterStatus === 'pendientes' ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'text-zinc-500'}`}>
                     <Clock size={14} /> Pendientes
                  </button>
                  <button onClick={() => { setFilterStatus('aprobados'); setSelectedItemId(null) }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${filterStatus === 'aprobados' ? 'bg-zinc-700 text-emerald-400 shadow-sm' : 'text-zinc-500'}`}>
                     <CheckCircle size={14} /> Aprobados
                  </button>
                  <button onClick={() => { setFilterStatus('rechazados'); setSelectedItemId(null) }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${filterStatus === 'rechazados' ? 'bg-zinc-700 text-red-400 shadow-sm' : 'text-zinc-500'}`}>
                     <XCircle size={14} /> Rechazados
                  </button>
               </div>
            </div>
         </header>

         {/* SPLIT VIEW */}
         <div className="flex flex-1 overflow-hidden">

            {/* --- IZQUIERDA: LISTA --- */}
            <div className="w-full md:w-1/3 min-w-[320px] bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 transition-all">
               <div className="p-3 border-b border-zinc-800 bg-zinc-900">
                  <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                     <input
                        className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-lg outline-none focus:border-blue-500 placeholder-zinc-600"
                        placeholder="Buscar trámite o jugador..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredItems.length === 0 ? (
                     <div className="text-center py-10 text-zinc-600">
                        <p className="text-sm">No hay ítems en esta vista.</p>
                     </div>
                  ) : (
                     filteredItems.map(item => (
                        <div
                           key={item.id}
                           onClick={() => setSelectedItemId(item.id)}
                           className={`
                        p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition relative border-l-4
                        ${selectedItemId === item.id ? 'bg-zinc-800 border-l-blue-500' : 'border-l-transparent'}
                        ${getSLAColor(item.date)}
                      `}
                        >
                           <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${item.type === 'player' ? 'text-orange-500' : 'text-zinc-500'}`}>
                                 {item.type === 'player' ? <Users size={10} /> : <FileText size={10} />}
                                 {item.type === 'player' ? 'Lista de Buena Fe' : item.subtitle}
                              </span>
                              <span className="text-[10px] text-zinc-500">{new Date(item.date).toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-zinc-200 text-sm truncate">{item.team_name}</h4>
                           </div>
                           <p className="text-sm text-zinc-400 truncate font-medium">{item.title}</p>
                        </div>
                     ))
                  )}
               </div>
            </div>

            {/* --- DERECHA: DETALLE --- */}
            <div className="flex-1 bg-black flex flex-col h-full overflow-hidden relative">
               {selectedItem ? (
                  <>
                     {/* Render different content based on TYPE */}
                     {selectedItem.type === 'procedure' ? (
                        // --- VISTA TRAMITE NORMAL ---
                        <div className="flex-1 flex flex-col overflow-hidden">
                           <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
                              <h2 className="text-xl font-black text-white">{selectedItem.title}</h2>
                              <p className="text-zinc-400 text-sm">Trámite Administrativo - {selectedItem.team_name}</p>
                           </div>
                           <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-zinc-950">
                              {selectedItem.originalData.attachment_url ? (
                                 <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden min-h-[500px]">
                                    <iframe src={selectedItem.originalData.attachment_url} className="w-full h-full" />
                                 </div>
                              ) : <div className="text-zinc-500 mt-20">Sin adjunto</div>}
                           </div>
                        </div>
                     ) : (
                        // --- VISTA JUGADOR (VALIDATION) ---
                        <div className="flex-1 flex flex-col overflow-hidden">
                           <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex gap-6 items-center flex-shrink-0">
                              <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700">
                                 {selectedItem.originalData.photo_url ? (
                                    <img src={selectedItem.originalData.photo_url} className="w-full h-full object-cover" />
                                 ) : <Users className="w-full h-full p-4 text-zinc-600" />}
                              </div>
                              <div>
                                 <h2 className="text-2xl font-black text-white">{selectedItem.originalData.name}</h2>
                                 <div className="flex gap-4 text-sm text-zinc-400 font-bold mt-1">
                                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-white">DNI: {selectedItem.originalData.dni}</span>
                                    <span>{selectedItem.originalData.gender}</span>
                                    <span>F. Nac: {selectedItem.originalData.birth_date}</span>
                                 </div>
                              </div>
                           </div>

                           {/* 3-COLUMN DOCUMENT GRID */}
                           <div className="flex-1 p-8 overflow-y-auto bg-black pb-32">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto h-full items-center">

                                 {/* 1. FOTO */}
                                 <DocumentCard
                                    title="Foto de Perfil"
                                    url={selectedItem.originalData.photo_url}
                                    type="image"
                                    missingText="Falta Foto"
                                 />

                                 {/* 2. FICHA MEDICA */}
                                 <DocumentCard
                                    title="Ficha Médica"
                                    url={selectedItem.originalData.medical_url}
                                    type="document"
                                    missingText="Falta Ficha Médica"
                                 />

                                 {/* 3. COMPROBANTE DE PAGO */}
                                 <DocumentCard
                                    title="Comprobante Pago"
                                    url={selectedItem.originalData.payment_url}
                                    type="document"
                                    missingText="Falta Comprobante"
                                 />

                              </div>
                              <p className="text-center text-zinc-500 mt-8 text-sm">
                                 Verifica que la documentación coincida con los datos del jugador.
                              </p>
                           </div>
                        </div>
                     )}

                     {/* BARRA DE ACCIONES COMPARTIDA */}
                     {showActions && (
                        <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-6 flex justify-end items-center gap-4 z-50 shadow-[0_-5px_30px_rgba(0,0,0,0.8)]">
                           <button
                              onClick={handleReject}
                              disabled={processingAction}
                              className="px-6 py-4 border-2 border-red-600 text-red-500 font-bold rounded-xl hover:bg-red-600 hover:text-white transition flex items-center gap-2 uppercase tracking-wide text-sm"
                           >
                              <XCircle size={18} /> Rechazar
                           </button>
                           <button
                              onClick={handleApprove}
                              disabled={processingAction}
                              className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition shadow-xl shadow-white/10 flex items-center gap-2 uppercase tracking-wide text-sm transform hover:-translate-y-1 active:translate-y-0"
                           >
                              {processingAction ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} className="text-green-600" /> Aprobar</>}
                           </button>
                        </div>
                     )}
                  </>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-700 bg-black">
                     <TrendingUp size={64} className="mb-6 opacity-10" />
                     <h3 className="text-xl font-bold text-zinc-500">Mesa de Entrada Unificada</h3>
                     <p className="max-w-xs text-center text-sm mt-2 opacity-60">Selecciona un ítem.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}

function DocumentCard({ title, url, type, missingText }: { title: string, url: string | null, type: 'image' | 'document', missingText: string }) {
   return (
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[400px] group hover:border-zinc-700 transition relative">
         <div className="bg-zinc-950/50 p-3 border-b border-zinc-800 flex justify-between items-center">
            <h4 className="font-bold text-zinc-300 text-sm">{title}</h4>
            {url && (
               <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <Download size={12} /> Abrir
               </a>
            )}
         </div>

         <div className="flex-1 relative flex items-center justify-center bg-zinc-950 p-4">
            {url ? (
               type === 'image' ? (
                  <img src={url} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
               ) : (
                  <div className="text-center">
                     <FileText size={48} className="text-zinc-600 mb-2 mx-auto" />
                     <p className="text-sm font-bold text-zinc-400">Documento PDF/IMG</p>
                     <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-4 py-2 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 text-sm font-bold">
                        Vista Previa
                     </a>
                  </div>
               )
            ) : (
               <div className="text-center opacity-40">
                  <AlertOctagon size={48} className="mx-auto mb-2" />
                  <p className="font-bold">{missingText}</p>
               </div>
            )}
         </div>
      </div>
   );
}
