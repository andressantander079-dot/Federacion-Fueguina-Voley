'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
   Mail, Send, Inbox, Plus, Search,
   ChevronRight, ArrowLeft, Clock,
   AlertCircle, CheckCircle, FileText,
   User, Shield
} from 'lucide-react';

export default function ClubMensajesPage() {
   const router = useRouter();
   const supabase = createClient();

   // Estados de carga y usuario
   const [loading, setLoading] = useState(true);
   const [userId, setUserId] = useState<string | null>(null);
   const [clubId, setClubId] = useState<string | null>(null);

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
   const [sending, setSending] = useState(false);

   useEffect(() => {
      init();
   }, []);

   async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
      if (profile?.club_id) {
         setClubId(profile.club_id);
         await fetchMessages(profile.club_id, user.id);
      }
      setLoading(false);
   }

   async function fetchMessages(cId: string, uId: string) {
      // 1. INBOX: Mensajes donde el club es destinatario (tabla message_recipients)
      // Traemos el mensaje asociado (type='comunicado')
      const { data: inboxData } = await supabase
         .from('message_recipients')
         .select(`
        *,
        message:messages (
          id, subject, body, created_at, priority, type, sender_id
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
   }

   async function handleSendMessage(e: React.FormEvent) {
      e.preventDefault();
      if (!newMsg.subject || !newMsg.body) return alert("Completa asunto y mensaje.");

      setSending(true);
      try {
         const { error } = await supabase.from('messages').insert([{
            sender_id: userId,
            subject: newMsg.subject,
            body: newMsg.body,
            priority: newMsg.priority,
            type: 'consulta'
            // No creamos recipients porque la admin lee todo lo que sea type='consulta'
         }]);

         if (error) throw error;

         alert("Mensaje enviado a la Federación.");
         setNewMsg({ subject: '', body: '', priority: 'normal' });
         setActiveTab('sent');
         if (clubId && userId) fetchMessages(clubId, userId);

      } catch (error: any) {
         alert("Error: " + error.message);
      } finally {
         setSending(false);
      }
   }

   async function markAsRead(msg: any) {
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

   if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Cargando Mensajería...</div>;

   return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col md:flex-row overflow-hidden">

         {/* SIDEBAR / LISTA */}
         <div className={`${selectedMessage || activeTab === 'compose' ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] flex-col border-r border-zinc-800 bg-zinc-900/50`}>

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
               {filteredList.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">
                     <Mail size={32} className="mx-auto mb-2 opacity-20" />
                     <p className="text-sm">No hay mensajes.</p>
                  </div>
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
                        <p className="text-xs text-zinc-500 line-clamp-2">
                           {msg.body}
                        </p>

                        {activeTab === 'inbox' && !msg.read_at && (
                           <div className="absolute right-4 bottom-4 w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                        )}
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* MAIN CONTENT / READING / COMPOSING */}
         <div className={`flex-1 flex flex-col bg-zinc-950 ${!selectedMessage && activeTab !== 'compose' ? 'hidden md:flex' : 'flex'}`}>

            {/* HEADER MOVIL PARA VOLVER */}
            <div className="md:hidden p-4 border-b border-zinc-800 flex items-center gap-3">
               <button onClick={() => { setSelectedMessage(null); if (activeTab === 'compose') setActiveTab('inbox'); }} className="text-zinc-400">
                  <ArrowLeft size={20} />
               </button>
               <h2 className="font-bold text-white">
                  {activeTab === 'compose' ? 'Redactar' : 'Lectura'}
               </h2>
            </div>

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
                           <p className="text-white font-bold text-lg">Administración FVU</p>
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

                        <div className="min-h-[300px] bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                           <textarea
                              className="w-full h-full bg-transparent text-zinc-300 placeholder-zinc-700 outline-none resize-none"
                              placeholder="Escribe tu mensaje aquí..."
                              value={newMsg.body}
                              onChange={e => setNewMsg({ ...newMsg, body: e.target.value })}
                              rows={12}
                           />
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