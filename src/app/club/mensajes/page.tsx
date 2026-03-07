'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/ui/EmptyState';
import {
   Mail, Send, Inbox, Plus, Search,
   ChevronRight, ArrowLeft, Clock,
   AlertCircle, CheckCircle, FileText,
   User, Shield, Paperclip, Download, Loader2
} from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';

export default function ClubMensajesPage() {
   const router = useRouter();
   const supabase = createClient();

   // Estados de carga y usuario
   const { clubId, profile, loading: authLoading } = useClubAuth();
   const [loading, setLoading] = useState(true);
   // const [userId, setUserId] = useState<string | null>(null); // Use profile.id
   // const [clubId, setClubId] = useState<string | null>(null); // Use hook clubId

   // Estados de UI
   const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
   const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
   const [searchTerm, setSearchTerm] = useState('');

   // Datos
   const [inboxMessages, setInboxMessages] = useState<any[]>([]);
   const [sentMessages, setSentMessages] = useState<any[]>([]);

   // Estado Formulario
   const [newMsg, setNewMsg] = useState({
      subject: '',
      body: '',
      priority: 'normal'
   });
   const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
   const [sending, setSending] = useState(false);

   useEffect(() => {
      if (clubId && profile) {
         fetchMessages(clubId, profile.id);
      }
   }, [clubId, profile]);

   //    async function init() {
   //       // Replaced by useClubAuth
   //    }

   async function fetchMessages(cId: string, uId: string) {
      // 1. INBOX: Mensajes donde el club es destinatario (tabla message_recipients)
      // Traemos el mensaje asociado (type='comunicado')
      const { data: inboxData } = await supabase
         .from('message_recipients')
         .select(`
        *,
        message:messages (
          id, subject, body, created_at, priority, type, sender_id, attachments
        )
      `)
         .eq('recipient_club_id', cId)
         .order('created_at', { ascending: false });

      // Filtramos y aplanamos estrucura
      const formattedInbox = inboxData?.map((item: any) => ({
         ...item.message,
         read_at: item.read_at, // Fecha de lectura específica de este destinatario
         recipient_row_id: item.id // ID Para marcar como leído
      })) || [];

      setInboxMessages(formattedInbox);

      // 2. SENT: Mensajes enviados por este usuario (type='consulta')
      const { data: sentData } = await supabase
         .from('messages')
         .select('*')
         .eq('sender_id', uId)
         .eq('type', 'consulta')
         .order('created_at', { ascending: false });

      setSentMessages(sentData || []);
      setLoading(false);
   }

   async function handleSendMessage(e: React.FormEvent) {
      e.preventDefault();
      if (!newMsg.subject || !newMsg.body) return alert("Completa asunto y mensaje.");

      setSending(true);
      try {
         let attachmentUrl = null;

         // Upload attachment if present
         if (attachmentFile) {
            const fileExt = attachmentFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
               .from('message-attachments')
               .upload(`attachments/${fileName}`, attachmentFile);

            if (uploadError) {
               console.error("Upload error:", uploadError);
               throw new Error("Error subiendo el archivo adjunto.");
            }

            const { data: publicUrlData } = supabase.storage
               .from('message-attachments')
               .getPublicUrl(`attachments/${fileName}`);

            attachmentUrl = publicUrlData.publicUrl;
         }

         const { error } = await supabase.from('messages').insert([{
            sender_id: profile?.id,
            subject: newMsg.subject,
            body: newMsg.body,
            priority: newMsg.priority,
            type: 'consulta',
            attachments: attachmentUrl ? [{ url: attachmentUrl, name: attachmentFile!.name }] : null
            // No creamos recipients porque la admin lee todo lo que sea type='consulta'
         }]);

         if (error) throw error;

         alert("Mensaje enviado a la Federación.");
         setNewMsg({ subject: '', body: '', priority: 'normal' });
         setAttachmentFile(null);
         setActiveTab('sent');
         if (clubId && profile?.id) fetchMessages(clubId, profile.id);

      } catch (error: any) {
         alert("Error: " + error.message);
      } finally {
         setSending(false);
      }
   }

   async function markAsRead(msg: any) {
      if (selectedMessage?.id === msg.id) {
         setSelectedMessage(null); // Permite contraer (Acordeón mode)
         return;
      }
      if (activeTab === 'inbox' && !msg.read_at && msg.recipient_row_id) {
         await supabase.from('message_recipients')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.recipient_row_id);

         // Actualizar localmente
         setInboxMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m
         ));
      }
      setSelectedMessage(msg);
   }

   // --- RENDERS HELPERS ---

   const getPriorityBadge = (p: string) => {
      const map: any = {
         'urgente': 'bg-red-500/20 text-red-500 border-red-500/50',
         'importante': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
         'normal': 'bg-blue-500/20 text-blue-500 border-blue-500/50'
      };
      return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${map[p] || map['normal']}`}>{p}</span>;
   };

   const currentList = activeTab === 'inbox' ? inboxMessages : sentMessages;
   const filteredList = currentList.filter(m =>
      m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.body.toLowerCase().includes(searchTerm.toLowerCase())
   );

   if (loading || authLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Cargando Mensajería...</div>;

   return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col md:flex-row overflow-hidden">

         {/* SIDEBAR / LISTA (En móviles nunca se esconde salvo al redactar) */}
         <div className={`${activeTab === 'compose' ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] flex-col border-r border-zinc-800 bg-zinc-900/50`}>

            {/* Header Sidebar */}
            <div className="p-4 border-b border-zinc-800">
               <div className="flex items-center gap-3 mb-6">
                  <Link href="/club" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                     <ArrowLeft size={20} />
                  </Link>
                  <h1 className="font-black text-xl">Mesa de Entrada</h1>
               </div>

               <button
                  onClick={() => { setActiveTab('compose'); setSelectedMessage(null); }}
                  className="w-full py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition flex items-center justify-center gap-2 mb-4"
               >
                  <Plus size={20} /> Redactar Consulta
               </button>

               <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button
                     onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
                     className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition ${activeTab === 'inbox' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                     <Inbox size={14} /> Recibidos
                  </button>
                  <button
                     onClick={() => { setActiveTab('sent'); setSelectedMessage(null); }}
                     className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition ${activeTab === 'sent' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                     <Send size={14} /> Enviados
                  </button>
               </div>
            </div>

            {/* Search */}
            <div className="p-4 pt-2">
               <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-700 transition"
                     placeholder="Buscar mensaje..."
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-20">
               {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-orange-600" /></div>
               ) : filteredList.length === 0 ? (
                  <EmptyState
                     icon={<Mail size={48} />}
                     title={activeTab === 'inbox' ? 'Bandeja de Entrada Vacía' : 'Sin Mensajes Enviados'}
                     description={activeTab === 'inbox' ? 'Aún no has recibido comunicaciones ni notificaciones de la Federación.' : 'No has enviado ninguna consulta a la mesa de entrada de la administración.'}
                     actionLabel={activeTab === 'inbox' ? undefined : 'Redactar Consulta'}
                     onAction={activeTab === 'inbox' ? undefined : () => setActiveTab('compose')}
                  />
               ) : (
                  filteredList.map(msg => (
                     <div
                        key={msg.id}
                        onClick={() => markAsRead(msg)}
                        className={`p-4 rounded-xl cursor-pointer transition border border-transparent group relative ${selectedMessage?.id === msg.id ? 'bg-zinc-800 border-zinc-700' : 'hover:bg-zinc-900 hover:border-zinc-800'}`}
                     >
                        <div className="flex justify-between items-start mb-1">
                           <span className={`text-sm font-bold ${activeTab === 'inbox' && !msg.read_at ? 'text-white' : 'text-zinc-400'}`}>
                              {activeTab === 'inbox' ? 'Federación (Admin)' : 'Para: Administración'}
                           </span>
                           <span className="text-[10px] text-zinc-600 font-mono">
                              {new Date(msg.created_at).toLocaleDateString()}
                           </span>
                        </div>
                        <h3 className={`text-sm font-bold mb-1 truncate ${activeTab === 'inbox' && !msg.read_at ? 'text-white' : 'text-zinc-300'}`}>
                           {msg.subject}
                        </h3>
                        <p className={`text-xs text-zinc-500 transition-all ${selectedMessage?.id === msg.id ? 'line-clamp-none md:line-clamp-2 mt-2 leading-relaxed text-zinc-400' : 'line-clamp-2'}`}>
                           {msg.body}
                        </p>

                        {msg.attachment_url && (
                           <div className="absolute right-4 top-4 text-zinc-600">
                              <Paperclip size={14} />
                           </div>
                        )}

                        {activeTab === 'inbox' && !msg.read_at && (
                           <div className="absolute right-4 bottom-4 w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                        )}

                        {/* ACORDEÓN MÓVIL: Visible únicamente en pantallas pequeñas cuando el mensaje está expandido */}
                        {selectedMessage?.id === msg.id && (
                           <div className="md:hidden mt-4 pt-4 border-t border-zinc-800 animate-in slide-in-from-top-2 flex flex-col gap-3">
                              {msg.priority !== 'normal' && (
                                 <div>{getPriorityBadge(msg.priority)}</div>
                              )}

                              {msg.attachment_url && (
                                 <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-2 text-blue-500">
                                          <FileText size={16} />
                                          <span className="text-xs font-bold text-zinc-300 line-clamp-1">Archivo Adjunto</span>
                                       </div>
                                    </div>
                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center justify-center gap-2 bg-zinc-800 text-white border border-zinc-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-zinc-700 transition">
                                       <Download size={14} /> Descargar Archivo
                                    </a>
                                 </div>
                              )}

                              <button onClick={(e) => { e.stopPropagation(); setSelectedMessage(null); }} className="mt-2 w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold text-center">
                                 Contraer Mensaje
                              </button>
                           </div>
                        )}
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* MAIN CONTENT / READING / COMPOSING: Oculto en móviles si está en Inbox/Sent, visible si es Compose. En escritorio siempre visible */}
         <div className={`flex-1 flex flex-col bg-zinc-950 ${activeTab === 'compose' ? 'flex' : 'hidden md:flex'}`}>

            {/* HEADER MÓVIL PARA VOLVER A LA LISTA DESDE REDACTAR */}
            {activeTab === 'compose' && (
               <div className="md:hidden p-4 border-b border-zinc-800 flex items-center gap-3">
                  <button onClick={() => { setActiveTab('inbox'); }} className="text-zinc-400">
                     <ArrowLeft size={20} />
                  </button>
                  <h2 className="font-bold text-white">
                     Redactar Consulta
                  </h2>
               </div>
            )}

            {/* VISTA: REDACTAR */}
            {activeTab === 'compose' && (
               <div className="flex-1 p-6 md:p-12 overflow-y-auto animate-in slide-in-from-bottom-4">
                  <div className="max-w-2xl mx-auto space-y-6">
                     <div className="flex items-center gap-4 text-zinc-400 mb-8">
                        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                           <User size={24} />
                        </div>
                        <div>
                           <p className="text-xs font-bold uppercase tracking-wider">Destinatario</p>
                           <p className="text-white font-bold text-lg">Administración FFV</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <input
                           className="w-full bg-transparent text-3xl font-black text-white placeholder-zinc-700 outline-none border-b border-zinc-800 pb-4 focus:border-zinc-600 transition"
                           placeholder="Asunto de la consulta"
                           value={newMsg.subject}
                           onChange={e => setNewMsg({ ...newMsg, subject: e.target.value })}
                        />

                        <div className="flex gap-2">
                           {['normal', 'importante', 'urgente'].map(p => (
                              <button
                                 key={p}
                                 type="button"
                                 onClick={() => setNewMsg({ ...newMsg, priority: p })}
                                 className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition border ${newMsg.priority === p ? (p === 'urgente' ? 'bg-red-500 text-white border-red-500' : p === 'importante' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-blue-600 text-white border-blue-600') : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                              >
                                 {p}
                              </button>
                           ))}
                        </div>

                        <div className="min-h-[300px] flex flex-col bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                           <textarea
                              className="w-full h-full flex-1 bg-transparent text-zinc-300 placeholder-zinc-700 outline-none resize-none"
                              placeholder="Escribe tu mensaje aquí..."
                              value={newMsg.body}
                              onChange={e => setNewMsg({ ...newMsg, body: e.target.value })}
                           />

                           {/* ATTACHMENT UPLOAD */}
                           <div className="mt-4 pt-4 border-t border-zinc-800/50">
                              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${attachmentFile ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800 hover:text-white'}`}>
                                 <Paperclip size={14} />
                                 {attachmentFile ? attachmentFile.name : 'Adjuntar Archivo'}
                                 <input
                                    type="file"
                                    className="hidden"
                                    onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                 />
                              </label>
                              {attachmentFile && (
                                 <button onClick={() => setAttachmentFile(null)} className="ml-2 text-xs text-red-400 hover:text-red-300 transition">
                                    Quitar
                                 </button>
                              )}
                           </div>
                        </div>

                        <div className="flex justify-end pt-4">
                           <button
                              onClick={handleSendMessage}
                              disabled={sending}
                              className="bg-white text-black font-black px-8 py-3 rounded-xl hover:bg-zinc-200 transition shadow-lg shadow-white/10 flex items-center gap-2 disabled:opacity-50"
                           >
                              {sending ? 'Enviando...' : <><Send size={18} /> Enviar Consulta</>}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* VISTA: LECTURA */}
            {selectedMessage && activeTab !== 'compose' && (
               <div className="flex-1 p-6 md:p-12 overflow-y-auto animate-in fade-in">
                  <div className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">

                     <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-6">
                        <div className="space-y-4">
                           {getPriorityBadge(selectedMessage.priority)}
                           <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                              {selectedMessage.subject}
                           </h2>
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                                 {activeTab === 'inbox' ? <Shield size={18} className="text-white" /> : <User size={18} className="text-zinc-400" />}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-white">
                                    {activeTab === 'inbox' ? 'Federación de Voley' : 'Yo (Club)'}
                                 </p>
                                 <p className="text-xs text-zinc-500">
                                    {new Date(selectedMessage.created_at).toLocaleString()}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {selectedMessage.body}
                     </div>

                     {/* ATTACHMENT PREVIEW */}
                     {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                        <div className="mt-8 p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-blue-500">
                                 <FileText size={20} />
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-white">Archivo Adjunto</p>
                                 <p className="text-xs text-zinc-500">{selectedMessage.attachments[0].name || 'Documento subido en esta consulta'}</p>
                              </div>
                           </div>
                           <a href={selectedMessage.attachments[0].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-700 transition">
                              <Download size={14} />
                              Ver Documento
                           </a>
                        </div>
                     )}

                     {/* Footer Mensaje */}
                     <div className="mt-12 pt-8 border-t border-zinc-800 flex items-center gap-4 opacity-50">
                        <img src="/logo.png" alt="Logo" className="w-10 h-10 grayscale opacity-20" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <div className="text-xs text-zinc-600">
                           <p className="font-bold uppercase">Sistema de Gestión Federativa</p>
                           <p>Mensaje Oficial</p>
                        </div>
                     </div>

                  </div>
               </div>
            )}

            {/* EMPTY STATE (SIN SELECCION) */}
            {!selectedMessage && activeTab !== 'compose' && (
               <div className="flex-1 hidden md:flex flex-col items-center justify-center text-zinc-700">
                  <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 animate-pulse">
                     <Mail size={48} className="opacity-20" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-500">Selecciona un mensaje</h3>
                  <p className="text-sm text-zinc-600">Para ver el contenido completo</p>
               </div>
            )}

         </div>
      </div>
   );
}