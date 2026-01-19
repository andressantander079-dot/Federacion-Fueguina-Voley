// src/app/club/mensajes/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, Inbox, Send, Search, 
  ChevronRight, Building2, Scale, 
  ArrowLeft, Paperclip, CheckCircle, X, FileText 
} from 'lucide-react';

export default function MensajeriaClub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Referencia al input de archivo
  
  // Usuario y Club
  const [userId, setUserId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Navegación
  const [activeTab, setActiveTab] = useState<'recibidos' | 'enviados'>('recibidos');
  const [viewMode, setViewMode] = useState<'lista' | 'nuevo' | 'chat'>('lista');

  // Datos
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Inputs Formulario Nuevo
  const [newTicket, setNewTicket] = useState({ 
    category: 'Federación', 
    subject: '', 
    message: '' 
  });
  
  // ESTADO PARA EL ARCHIVO ADJUNTO
  const [attachment, setAttachment] = useState<File | null>(null);
  
  // Inputs Chat
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, viewMode]);

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUserId(user.id);

    const { data: perfil } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
    if (perfil?.team_id) {
      setTeamId(perfil.team_id);
      cargarTickets(perfil.team_id);
    }
    setLoading(false);
  }

  async function cargarTickets(idClub: string) {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('team_id', idClub)
      .order('updated_at', { ascending: false });
    setTickets(data || []);
  }

  async function abrirChat(ticket: any) {
    setSelectedTicket(ticket);
    setViewMode('chat');
    
    const { data } = await supabase
      .from('ticket_messages')
      .select('*, profiles(role)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  // --- FUNCIÓN PRINCIPAL: CREAR TICKET CON ADJUNTO ---
  async function crearTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) return;
    setSending(true);

    try {
      // 1. Subir Archivo (Si existe)
      let attachmentUrl = null;
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `doc-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, attachment);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);
          
        attachmentUrl = publicUrlData.publicUrl;
      }

      // 2. Crear Ticket
      const { data: ticket, error } = await supabase.from('tickets').insert([{
        team_id: teamId,
        category: newTicket.category,
        subject: newTicket.subject,
        status: 'abierto'
      }]).select().single();

      if (error) throw error;

      // 3. Insertar Mensaje (Con el link del archivo si existe)
      await supabase.from('ticket_messages').insert([{
        ticket_id: ticket.id,
        sender_id: userId,
        content: newTicket.message,
        attachment_url: attachmentUrl // <--- Aquí guardamos el link
      }]);

      await cargarTickets(teamId!);
      
      // Limpiar Formulario
      setNewTicket({ category: 'Federación', subject: '', message: '' });
      setAttachment(null);
      
      // Redirigir
      setViewMode('lista');
      setActiveTab('recibidos');

    } catch (error: any) {
      alert("Error al enviar: " + error.message);
    } finally {
      setSending(false);
    }
  }

  async function enviarMensaje(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const tempMsg = { id: Date.now(), content: chatInput, sender_id: userId, created_at: new Date(), profiles: { role: 'club' } };
    setMessages([...messages, tempMsg]);
    setChatInput('');

    await supabase.from('ticket_messages').insert([{
      ticket_id: selectedTicket.id,
      sender_id: userId,
      content: tempMsg.content
    }]);

    await supabase.from('tickets').update({ updated_at: new Date() }).eq('id', selectedTicket.id);
  }

  // Manejador del input de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const ticketsFiltrados = tickets; 

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-100px)]">
        
        {/* --- SIDEBAR --- */}
        <div className="md:col-span-3 flex flex-col gap-6">
           <button 
             onClick={() => setViewMode('nuevo')}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2"
           >
             <Plus size={20}/> Redactar Nuevo
           </button>
           <div className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveTab('recibidos'); setViewMode('lista'); }}
                className={`w-full text-left px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-3 transition ${activeTab === 'recibidos' && viewMode === 'lista' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Inbox size={18}/> Recibidos
              </button>
              <button 
                onClick={() => { setActiveTab('enviados'); setViewMode('lista'); }}
                className={`w-full text-left px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-3 transition ${activeTab === 'enviados' && viewMode === 'lista' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Send size={18}/> Enviados
              </button>
           </div>
        </div>

        {/* --- ÁREA PRINCIPAL --- */}
        <div className="md:col-span-9 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col h-full">
           
           {/* --- VISTA NUEVO (CON BOTÓN DE ADJUNTAR FUNCIONAL) --- */}
           {viewMode === 'nuevo' && (
             <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex items-center gap-4 mb-8">
                   <h2 className="text-2xl font-black text-slate-800">Nuevo Comunicado</h2>
                </div>
                
                <form onSubmit={crearTicket} className="max-w-3xl space-y-8">
                   
                   {/* DESTINATARIO */}
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-3 block tracking-wider">Destinatario Oficial</label>
                      <div className="grid grid-cols-2 gap-4">
                          <div 
                            onClick={() => setNewTicket({...newTicket, category: 'Federación'})}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition flex items-center justify-center gap-3 ${newTicket.category === 'Federación' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                          >
                             <Building2 size={20}/> <span>Federación / Admin</span>
                             {newTicket.category === 'Federación' && <CheckCircle size={16} className="ml-auto"/>}
                          </div>
                          <div 
                            onClick={() => setNewTicket({...newTicket, category: 'Tribunal'})}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition flex items-center justify-center gap-3 ${newTicket.category === 'Tribunal' ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                          >
                             <Scale size={20}/> <span>Tribunal Disciplina</span>
                             {newTicket.category === 'Tribunal' && <CheckCircle size={16} className="ml-auto"/>}
                          </div>
                      </div>
                   </div>

                   {/* ASUNTO */}
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Asunto</label>
                      <input 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition text-slate-800 font-medium placeholder:font-normal"
                        placeholder="Escribe un título breve..."
                        value={newTicket.subject}
                        onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                      />
                   </div>

                   {/* MENSAJE */}
                   <div>
                      <textarea 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition h-48 resize-none text-slate-800 leading-relaxed placeholder:text-slate-400"
                        placeholder="Escribe el contenido oficial aquí..."
                        value={newTicket.message}
                        onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                      />
                   </div>

                   {/* FOOTER CON ADJUNTO */}
                   <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
                      
                      {/* INPUT INVISIBLE + BOTÓN PERSONALIZADO */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*,application/pdf"
                      />

                      {/* SI HAY ARCHIVO SELECCIONADO: MOSTRAR NOMBRE Y 'X' */}
                      {attachment ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                           <Paperclip size={16}/>
                           <span className="text-sm font-bold truncate max-w-[200px]">{attachment.name}</span>
                           <button type="button" onClick={() => setAttachment(null)} className="text-green-800 hover:text-red-600 ml-2">
                             <X size={16}/>
                           </button>
                        </div>
                      ) : (
                        // SI NO HAY ARCHIVO: BOTÓN NORMAL
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} // Activa el input oculto
                          className="text-slate-500 hover:text-blue-600 font-bold text-sm flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-lg transition"
                        >
                            <Paperclip size={18}/> Adjuntar PDF/Imagen
                        </button>
                      )}

                      <div className="flex gap-3 w-full md:w-auto">
                          <button 
                            type="button" 
                            onClick={() => setViewMode('lista')}
                            className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition"
                          >
                              Cancelar
                          </button>
                          <button 
                            disabled={sending} 
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition flex items-center gap-2 shadow-lg w-full md:w-auto justify-center"
                          >
                              {sending ? 'Enviando...' : <><Send size={18}/> Enviar Comunicado</>}
                          </button>
                      </div>
                   </div>
                </form>
             </div>
           )}

           {/* --- VISTA LISTA --- */}
           {viewMode === 'lista' && (
             <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                   <h3 className="font-bold text-xl text-slate-800 capitalize">{activeTab}</h3>
                   <div className="relative">
                       <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                       <input className="pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:ring-2 ring-blue-100 w-64" placeholder="Buscar..."/>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                   {ticketsFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                         <Inbox size={48} className="mb-4 opacity-20"/>
                         <p>No hay mensajes aquí.</p>
                      </div>
                   ) : (
                      ticketsFiltrados.map(t => (
                        <div key={t.id} onClick={() => abrirChat(t)} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition flex items-center gap-5 group">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${t.category === 'Tribunal' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                {t.category === 'Tribunal' ? <Scale size={20}/> : <Building2 size={20}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${t.category === 'Tribunal' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>{t.category}</span>
                                    <span className="text-xs text-slate-400 font-medium">{new Date(t.updated_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-base mb-1 truncate group-hover:text-blue-700 transition">{t.subject}</h4>
                                <p className="text-sm text-slate-500 truncate">Ver conversación...</p>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition"/>
                        </div>
                      ))
                   )}
                </div>
             </div>
           )}

           {/* --- VISTA CHAT --- */}
           {viewMode === 'chat' && selectedTicket && (
             <div className="flex-1 flex flex-col h-full">
                <div className="p-4 bg-white border-b flex items-center justify-between z-10">
                   <div className="flex items-center gap-4">
                      <button onClick={() => setViewMode('lista')} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} className="text-slate-500"/></button>
                      <div>
                         <h3 className="font-bold text-slate-800 text-lg">{selectedTicket.subject}</h3>
                         <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            {selectedTicket.category === 'Tribunal' ? <Scale size={12}/> : <Building2 size={12}/>}
                            {selectedTicket.category}
                         </p>
                      </div>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50" ref={scrollRef}>
                   {messages.map(m => {
                      const soyYo = m.sender_id === userId;
                      return (
                         <div key={m.id} className={`flex ${soyYo ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${soyYo ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'}`}>
                               <p>{m.content}</p>
                               {/* MOSTRAR ADJUNTO SI EXISTE */}
                               {m.attachment_url && (
                                  <a href={m.attachment_url} target="_blank" className={`mt-3 flex items-center gap-2 p-2 rounded-lg bg-opacity-20 ${soyYo ? 'bg-white text-white' : 'bg-blue-50 text-blue-700'} hover:bg-opacity-30 transition`}>
                                     <FileText size={16}/> <span className="font-bold text-xs underline">Ver Adjunto</span>
                                  </a>
                               )}
                               <span className={`text-[10px] block mt-2 opacity-50 text-right ${soyYo ? 'text-slate-300' : 'text-slate-400'}`}>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                         </div>
                      );
                   })}
                </div>
                <form onSubmit={enviarMensaje} className="p-5 bg-white border-t flex gap-4">
                   <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 outline-none focus:border-blue-500 focus:bg-white transition" placeholder="Escribe una respuesta..." value={chatInput} onChange={e => setChatInput(e.target.value)}/>
                   <button className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg"><Send size={20}/></button>
                </form>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}