'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
   FileText, CheckCircle, XCircle, Clock,
   Search, ArrowLeft, Download, AlertTriangle,
   Info, AlertOctagon, TrendingUp, Keyboard, Users, Shield, UserCheck, Loader2, FileSignature, X
} from 'lucide-react';
import { toast } from 'sonner';

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
         const { data: settings } = await supabase.from('settings').select('procedure_fees').single();

         const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;
         const fees = settings?.procedure_fees || [];

         const getFee = (title: string) => {
            const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const f = fees.find((x: any) => norm(x.title) === norm(title));
            return f ? Number(f.price) : 0;
         };

         if (selectedItem.type === 'procedure') {
            // == TRÁMITE ==
            const procedureFee = getFee(selectedItem.subtitle) || Number(selectedItem.originalData.amount) || 0;
            if (accountId && procedureFee > 0) {
               const { error: treasuryError } = await supabase.from('treasury_movements').insert([{
                  type: 'INGRESO',
                  amount: procedureFee,
                  description: `Trámite: ${selectedItem.title} - Op: ${selectedItem.originalData.code || 'S/N'}`,
                  entity_name: selectedItem.team_name,
                  club_id: selectedItem.originalData.club_id,
                  date: new Date(),
                  account_id: accountId
               }]);
               if (treasuryError) console.error("Error creating treasury movement for procedure:", treasuryError);
            }
            await supabase.from('procedures').update({ status: 'aprobado', updated_at: new Date() }).eq('id', selectedItem.id);

            // Check if this procedure is related to yearly Club Inscription
            const isClubInscription = selectedItem.originalData.title.toLowerCase().includes('inscripci') && selectedItem.originalData.title.toLowerCase().includes('club');
            if (isClubInscription) {
               const { error: teamUpdateError } = await supabase.from('teams').update({ has_paid_inscription: true }).eq('id', selectedItem.originalData.club_id);
               if (teamUpdateError) console.error("Error updating team inscription status:", teamUpdateError);
            }

            // === FASE 3 MMP: IN-APP NOTIFICATION ===
            // 1. Create the Message
            const { data: newMessage, error: msgError } = await supabase.from('messages').insert([{
               sender_id: (await supabase.auth.getUser()).data.user?.id,
               sender_role: 'admin',
               subject: `✅ Trámite Aprobado: ${selectedItem.title}`,
               body: `Le informamos que su trámite "${selectedItem.title}" ha sido procesado exitosamente por la Tesorería de la Federación.\n\nEl mismo se encuentra ahora en estado APROBADO.\n\nEste es un mensaje automático del sistema.`,
               priority: 'high'
            }]).select().single();

            // 2. Link recipient (Club ID)
            if (newMessage && !msgError) {
               await supabase.from('message_recipients').insert([{
                  message_id: newMessage.id,
                  recipient_id: selectedItem.originalData.club_id,
                  recipient_role: 'club'
               }]);
            }

            toast.success("Trámite aprobado y registrado en Tesorería." + (isClubInscription ? " El Club ahora está habilitado." : ""));
         } else {
            // == JUGADOR ==
            // 1. Calcular Edad Exacta
            const birthDate = new Date(selectedItem.originalData.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

            // 2. Determinar Tarifa (ID 2 = Mayor, ID 3 = Menor)
            const targetFeeId = age >= 18 ? 2 : 3;
            const feeObj = fees.find((f: any) => f.id === targetFeeId);
            const playerFeeAmount = feeObj ? Number(feeObj.price) : 0;
            const feeTitleRaw = feeObj ? feeObj.title : (targetFeeId === 2 ? 'Inscripción Mayores' : 'Inscripción Menores');

            if (accountId && playerFeeAmount > 0) {
               const { error: treasuryError } = await supabase.from('treasury_movements').insert([{
                  type: 'INGRESO',
                  amount: playerFeeAmount,
                  description: `Inscripción Jugador (${feeTitleRaw}): ${selectedItem.originalData.name} - DNI ${selectedItem.originalData.dni}`,
                  entity_name: selectedItem.team_name,
                  club_id: selectedItem.originalData.team_id,
                  date: new Date(),
                  account_id: accountId
               }]);
               if (treasuryError) console.error("Error creating treasury movement for player:", treasuryError);
            }
            // Update Player Status
            await supabase.from('players').update({ status: 'active', rejection_reason: null }).eq('id', selectedItem.id);

            // === FASE 3 MMP: IN-APP NOTIFICATION === (Player)
            const { data: newMessage, error: msgError } = await supabase.from('messages').insert([{
               sender_id: (await supabase.auth.getUser()).data.user?.id,
               sender_role: 'admin',
               subject: `✅ Jugador Habilitado: ${selectedItem.originalData.name}`,
               body: `La Federación ha validado los documentos y habilitado al jugador ${selectedItem.originalData.name} (DNI: ${selectedItem.originalData.dni}).\nYa se encuentra disponible para ser incluido en Planillas Oficiales.`,
               priority: 'normal'
            }]).select().single();

            if (newMessage && !msgError) {
               await supabase.from('message_recipients').insert([{
                  message_id: newMessage.id,
                  recipient_id: selectedItem.originalData.team_id,
                  recipient_role: 'club'
               }]);
            }

            toast.success(playerFeeAmount > 0 ? `Jugador validado. Se generó un ingreso de $${playerFeeAmount} en Tesorería.` : "Jugador validado correctamente.");
         }

         await fetchAll();
      } catch (error: any) {
         console.error(error);
         toast.error("Error al aprobar: " + error.message);
      }
      finally { setProcessingAction(false); }
   };

   const handleReject = async () => {
      if (!selectedItem) return;

      const reason = prompt("Ingrese el motivo del rechazo (Visible para el Club):");
      if (reason === null) return; // Cancelled
      if (!reason.trim()) return toast.error("Debe ingresar un motivo para rechazar.");

      setProcessingAction(true);
      try {
         if (selectedItem.type === 'procedure') {
            await supabase.from('procedures').update({ status: 'rechazado', rejection_reason: reason, updated_at: new Date() }).eq('id', selectedItem.id);

            // Rejection In-App message
            const { data: newMessage } = await supabase.from('messages').insert([{
               sender_id: (await supabase.auth.getUser()).data.user?.id,
               sender_role: 'admin',
               subject: `❌ Trámite Rechazado: ${selectedItem.title}`,
               body: `Su trámite ha sido rechazado.\n\n📌 Motivo indicado por la Administración:\n"${reason}"\n\nPor favor, corrija la documentación y vuelva a iniciar una solicitud.`,
               priority: 'high'
            }]).select().single();

            if (newMessage) {
               await supabase.from('message_recipients').insert([{
                  message_id: newMessage.id,
                  recipient_id: selectedItem.originalData.club_id,
                  recipient_role: 'club'
               }]);
            }

         } else {
            // Players use 'rejected' status
            await supabase.from('players').update({ status: 'rejected', rejection_reason: reason }).eq('id', selectedItem.id);

            // Rejection In-App message
            const { data: newMessage } = await supabase.from('messages').insert([{
               sender_id: (await supabase.auth.getUser()).data.user?.id,
               sender_role: 'admin',
               subject: `❌ Jugador Observado: ${selectedItem.originalData.name}`,
               body: `El registro del jugador ${selectedItem.originalData.name} (DNI: ${selectedItem.originalData.dni}) ha sido observado preventivamente por la Federación.\n\n📌 Motivo:\n"${reason}"\n\nPor favor, vaya al perfil del jugador para corregir estos datos o enviar un nuevo comprobante.`,
               priority: 'high'
            }]).select().single();

            if (newMessage) {
               await supabase.from('message_recipients').insert([{
                  message_id: newMessage.id,
                  recipient_id: selectedItem.originalData.team_id,
                  recipient_role: 'club'
               }]);
            }
         }

         toast.success("Elemento rechazado y club notificado.");
         await fetchAll();
      } catch (error) { toast.error("Error al rechazar"); }
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

               {/* Pases Shortcut */}
               <Link href="/admin/tramites/pases" className="ml-2 px-4 py-1.5 bg-tdf-blue hover:bg-blue-600 text-white rounded-md text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap">
                  <FileSignature size={14} /> Auditoría Pases
               </Link>
            </div>
         </header>

         {/* SPLIT VIEW */}
         <div className="flex flex-1 overflow-hidden relative">

            {/* --- IZQUIERDA: LISTA --- */}
            <div className={`w-full md:w-1/3 min-w-[320px] bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 transition-all ${selectedItemId ? 'hidden md:flex' : 'flex'}`}>
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
            <div className={`flex-1 bg-black h-full overflow-hidden relative flex-col ${selectedItemId ? 'flex w-full absolute md:relative z-20' : 'hidden md:flex'}`}>
               {selectedItem ? (
                  <>
                     {/* Render different content based on TYPE */}
                     {selectedItem.type === 'procedure' ? (
                        // --- VISTA TRAMITE NORMAL ---
                        <div className="flex-1 flex flex-col overflow-hidden">
                           <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
                              <div className="flex items-center gap-3 mb-2 md:hidden">
                                 <button onClick={() => setSelectedItemId(null)} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                                    <ArrowLeft size={20} />
                                 </button>
                                 <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Atrás</span>
                              </div>
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
                           <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center flex-shrink-0">
                              <div className="flex items-center gap-3 w-full md:w-auto md:hidden border-b border-zinc-800/50 pb-3 mb-1">
                                 <button onClick={() => setSelectedItemId(null)} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                                    <ArrowLeft size={20} />
                                 </button>
                                 <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Atrás a la lista</span>
                              </div>
                              <div className="flex gap-4 items-center">
                                 <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 shrink-0">
                                    {selectedItem.originalData.photo_url ? (
                                       <img src={selectedItem.originalData.photo_url} className="w-full h-full object-cover" />
                                    ) : <Users className="w-full h-full p-4 text-zinc-600" />}
                                 </div>
                                 <div className="min-w-0">
                                    <h2 className="text-xl md:text-2xl font-black text-white truncate">{selectedItem.originalData.name}</h2>
                                    <div className="flex flex-wrap gap-2 text-xs md:text-sm text-zinc-400 font-bold mt-2">
                                       <span className="bg-zinc-800 px-2 py-0.5 rounded text-white border border-zinc-700">DNI: {selectedItem.originalData.dni}</span>
                                       <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">{selectedItem.originalData.gender}</span>
                                       <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">F. Nac: {selectedItem.originalData.birth_date}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-zinc-950 pb-32">
                              <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-6 border-b border-zinc-800 pb-2">Documentación Adjunta</h3>
                              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 w-full max-w-6xl items-start">
                              
                                 {/* 0. AUTORIZACION DE MENORES (Condicional) */}
                                 {selectedItem.originalData.birth_date && (
                                    (() => {
                                       const bDay = new Date(selectedItem.originalData.birth_date);
                                       const tDay = new Date();
                                       let ag = tDay.getFullYear() - bDay.getFullYear();
                                       const md = tDay.getMonth() - bDay.getMonth();
                                       if (md < 0 || (md === 0 && tDay.getDate() < bDay.getDate())) ag--;
                                       return ag < 18 ? (
                                          <DocumentCard
                                             title="Autorización Familiar"
                                             url={selectedItem.originalData.family_auth_url || null}
                                             type="document"
                                             missingText="Falta Autorización (Menor)"
                                          />
                                       ) : null;
                                    })()
                                 )}

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
   const [isModalOpen, setIsModalOpen] = useState(false);
   
   return (
      <>
      <div 
         onClick={() => url && setIsModalOpen(true)}
         className={`bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-40 md:h-48 group transition relative ${url ? 'cursor-pointer hover:border-tdf-blue hover:shadow-[0_0_20px_rgba(43,99,217,0.2)]' : ''}`}>
         <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex justify-between items-center z-10">
            <h4 className="font-bold text-zinc-300 text-[11px] uppercase tracking-wider">{title}</h4>
            {url && (
               <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1 transition-colors uppercase bg-blue-500/10 px-2 py-0.5 rounded">
                  <Search size={10} /> Ampliar
               </span>
            )}
         </div>

         <div className="flex-1 relative flex items-center justify-center bg-black p-2 overflow-hidden">
            {url ? (
               type === 'image' ? (
                  <img src={url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition duration-500 rounded-lg filter grayscale group-hover:grayscale-0" alt={title} />
               ) : (
                  <div className="text-center group-hover:scale-110 transition-transform duration-300">
                     <FileText size={36} className="text-tdf-blue mb-2 mx-auto filter drop-shadow-[0_0_8px_rgba(43,99,217,0.5)]" />
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ver PDF Documento</p>
                  </div>
               )
            ) : (
               <div className="text-center opacity-30">
                  <AlertOctagon size={28} className="mx-auto mb-2 text-red-500" />
                  <p className="font-bold text-[10px] uppercase">{missingText}</p>
               </div>
            )}
         </div>
      </div>

      {/* DOCUMENT MODAL FULLSCREEN */}
      {isModalOpen && url && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-4 z-50">
               <a 
                  href={url} target="_blank" rel="noopener noreferrer" 
                  className="bg-zinc-800/80 hover:bg-zinc-700 text-white p-3 rounded-xl transition flex items-center justify-center backdrop-blur"
                  title="Descargar o Abrir en Pestaña Nueva"
               >
                  <Download size={20} />
               </a>
               <button 
                  onClick={() => setIsModalOpen(false)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 p-3 rounded-xl transition backdrop-blur"
               >
                  <X size={20} />
               </button>
            </div>
            
            <div className="w-full h-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative mt-16 md:mt-0 max-h-[90vh]">
               <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex justify-between items-center z-10">
                  <h3 className="text-lg font-black text-white">{title}</h3>
               </div>
               <div className="flex-1 overflow-hidden bg-zinc-950 p-2 md:p-6 flex justify-center items-center">
                  {type === 'image' ? (
                     <img src={url} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" alt={title} />
                  ) : (
                     <iframe src={url} className="w-full h-full rounded-xl bg-white shadow-lg" />
                  )}
               </div>
            </div>
         </div>
      )}
      </>
   );
}
