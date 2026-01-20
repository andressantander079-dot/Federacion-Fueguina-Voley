// src/app/club/mensajes/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Inbox, Send, Plus, Paperclip, FileText, 
  ChevronRight, ArrowLeft, Eye, Clock, CheckCircle,
  AlertCircle, Download, X, Search
} from 'lucide-react';

export default function ClubMensajesPage() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [seccion, setSeccion] = useState<'recibidos' | 'enviados' | 'redactar'>('recibidos');
  const [loading, setLoading] = useState(true);
  
  // --- DATOS USUARIO ---
  const [clubId, setClubId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // --- BANDEJAS ---
  const [recibidos, setRecibidos] = useState<any[]>([]); // Anuncios
  const [enviados, setEnviados] = useState<any[]>([]);   // Mis Tickets/Consultas
  
  // --- DETALLE / LECTURA ---
  const [mensajeActivo, setMensajeActivo] = useState<any>(null); // El mensaje que estoy leyendo
  const [hiloChat, setHiloChat] = useState<any[]>([]); // Si es una conversación
  
  // --- FORMULARIO REDACTAR / RESPONDER ---
  const [form, setForm] = useState({
    asunto: '',
    contenido: '',
    categoria: 'Federación' // Admin o Tribunal
  });
  const [adjunto, setAdjunto] = useState<File | null>(null);
  const [respuesta, setRespuesta] = useState(''); // Para el chat rápido
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, [seccion]); // Recargar al cambiar de sección

  // Scroll al fondo del chat
  useEffect(() => {
    if (mensajeActivo && seccion === 'enviados') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hiloChat, mensajeActivo]);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       setUserId(user.id);
       const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
       if (profile?.team_id) {
          setClubId(profile.team_id);
          
          if (seccion === 'recibidos') await cargarRecibidos(profile.team_id);
          if (seccion === 'enviados') await cargarEnviados(profile.team_id);
       }
    }
    setLoading(false);
  }

  // --- 1. CARGA DE DATOS ---
  async function cargarRecibidos(teamId: string) {
    // Traemos anuncios enviados. 
    // NOTA: Deberíamos filtrar por 'target_team_ids' o 'audience'='all'. 
    // Aquí simplificamos trayendo todos los 'sent'.
    const { data: anuncios } = await supabase
        .from('announcements')
        .select('*, announcement_reads(team_id)')
        .eq('status', 'sent')
        .order('created_at', { ascending: false });
    
    // Procesar lectura (punto rojo)
    const procesados = anuncios?.map(a => {
        const leido = a.announcement_reads.some((r: any) => r.team_id === teamId);
        return { ...a, leido }; // Agregamos flag visual
    });

    setRecibidos(procesados || []);
  }

  async function cargarEnviados(teamId: string) {
    // Mis tickets iniciados
    const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('team_id', teamId)
        .order('updated_at', { ascending: false });
    setEnviados(data || []);
  }

  // --- 2. LÓGICA DE DETALLE Y LECTURA ---
  async function abrirMensaje(mensaje: any, tipo: 'anuncio' | 'ticket') {
      setMensajeActivo({ ...mensaje, tipo });
      
      if (tipo === 'anuncio' && !mensaje.leido && clubId) {
          // Marcar como leído en la base de datos
          await supabase.from('announcement_reads').insert([{ announcement_id: mensaje.id, team_id: clubId }]);
          // Actualizar localmente para quitar punto rojo
          setRecibidos(prev => prev.map(m => m.id === mensaje.id ? { ...m, leido: true } : m));
      }

      if (tipo === 'ticket') {
          // Cargar historial del chat
          const { data } = await supabase
              .from('ticket_messages')
              .select('*')
              .eq('ticket_id', mensaje.id)
              .order('created_at', { ascending: true });
          setHiloChat(data || []);
      }
  }

  // --- 3. ENVIAR NUEVO MENSAJE (REDACTAR) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAdjunto(e.target.files[0]);
  };

  async function enviarNuevoMensaje() {
      if (!form.asunto || !form.contenido) return alert("Falta asunto o contenido.");
      if (!clubId) return;

      let fileUrl = null;
      // Subir adjunto si existe
      if (adjunto) {
          const fileName = `club-${clubId}-${Date.now()}.${adjunto.name.split('.').pop()}`;
          const { error: upErr } = await supabase.storage.from('ticket-files').upload(fileName, adjunto);
          if (upErr) return alert("Error al subir archivo: " + upErr.message);
          const { data } = supabase.storage.from('ticket-files').getPublicUrl(fileName);
          fileUrl = data.publicUrl;
      }

      // 1. Crear Ticket (Cabecera)
      const { data: ticket, error } = await supabase.from('tickets').insert([{
          team_id: clubId,
          subject: form.asunto,
          category: form.categoria,
          status: 'abierto'
      }]).select().single();

      if (error) return alert("Error al crear mensaje: " + error.message);

      // 2. Crear Primer Mensaje (Cuerpo + Adjunto)
      await supabase.from('ticket_messages').insert([{
          ticket_id: ticket.id,
          sender_id: userId,
          content: form.contenido,
          attachment_url: fileUrl
      }]);

      alert("Mensaje enviado correctamente.");
      setForm({ asunto: '', contenido: '', categoria: 'Federación' });
      setAdjunto(null);
      setSeccion('enviados');
  }

  // --- 4. RESPONDER EN EL HILO ---
  async function enviarRespuesta() {
      if (!respuesta.trim() || !mensajeActivo) return;
      
      // Si respondo un ANUNCIO -> Creo un Ticket referenciándolo
      if (mensajeActivo.tipo === 'anuncio') {
          if(!confirm("Esto abrirá una nueva consulta con la Federación sobre este anuncio. ¿Continuar?")) return;
          
          const { data: ticket } = await supabase.from('tickets').insert([{
              team_id: clubId,
              subject: `RE: ${mensajeActivo.title}`,
              category: 'Federación',
              status: 'abierto'
          }]).select().single();

          if(ticket) {
              await supabase.from('ticket_messages').insert([{
                  ticket_id: ticket.id,
                  sender_id: userId,
                  content: respuesta
              }]);
              alert("Consulta iniciada. Puedes verla en 'Enviados'.");
              setRespuesta('');
              setSeccion('enviados');
          }
          return;
      }

      // Si respondo un TICKET (Chat normal)
      await supabase.from('ticket_messages').insert([{
          ticket_id: mensajeActivo.id,
          sender_id: userId,
          content: respuesta
      }]);
      
      await supabase.from('tickets').update({ updated_at: new Date(), status: 'abierto' }).eq('id', mensajeActivo.id);
      
      setRespuesta('');
      // Recargar chat
      const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', mensajeActivo.id).order('created_at', { ascending: true });
      setHiloChat(data || []);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans flex flex-col md:flex-row gap-6">
      
      {/* --- SIDEBAR DE NAVEGACIÓN --- */}
      <aside className="w-full md:w-64 flex flex-col gap-2 shrink-0">
         <button onClick={() => { setSeccion('redactar'); setMensajeActivo(null); }} className="bg-slate-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-black transition mb-2">
            <Plus size={20}/> Nuevo Mensaje
         </button>

         <nav className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button onClick={() => { setSeccion('recibidos'); setMensajeActivo(null); }} 
               className={`w-full p-4 text-left flex items-center justify-between border-l-4 transition ${seccion === 'recibidos' ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-3"><Inbox size={18}/> Recibidos</div>
               {recibidos.filter(r => !r.leido).length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{recibidos.filter(r => !r.leido).length}</span>}
            </button>
            <div className="h-px bg-slate-100"></div>
            <button onClick={() => { setSeccion('enviados'); setMensajeActivo(null); }} 
               className={`w-full p-4 text-left flex items-center justify-between border-l-4 transition ${seccion === 'enviados' ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-3"><Send size={18}/> Enviados</div>
            </button>
         </nav>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[85vh]">
         
         {/* A. LISTA DE MENSAJES (Si no hay activo) */}
         {!mensajeActivo && seccion !== 'redactar' && (
            <div className="flex flex-col h-full">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="font-bold text-slate-800 text-lg capitalize">{seccion}</h2>
                  <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                     <input className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" placeholder="Buscar..."/>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-2">
                  {seccion === 'recibidos' ? (
                     recibidos.length === 0 ? <div className="text-center py-20 text-slate-400">No hay mensajes recibidos.</div> :
                     recibidos.map(msg => (
                        <div key={msg.id} onClick={() => abrirMensaje(msg, 'anuncio')} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition flex gap-4 ${!msg.leido ? 'bg-blue-50/30' : ''}`}>
                           <div className="mt-1">{!msg.leido ? <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm"></div> : <div className="w-2.5 h-2.5 bg-slate-200 rounded-full"></div>}</div>
                           <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                 <span className="font-bold text-slate-800 text-sm">{msg.title}</span>
                                 <span className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1">{msg.content}</p>
                              {msg.priority === 'urgent' && <span className="mt-2 inline-block text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase">Urgente</span>}
                           </div>
                        </div>
                     ))
                  ) : (
                     // ENVIADOS
                     enviados.length === 0 ? <div className="text-center py-20 text-slate-400">No has enviado mensajes aún.</div> :
                     enviados.map(msg => (
                        <div key={msg.id} onClick={() => abrirMensaje(msg, 'ticket')} className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition flex gap-4">
                           <div className={`mt-1 w-2.5 h-2.5 rounded-full ${msg.status === 'abierto' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                           <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                 <span className="font-bold text-slate-800 text-sm">{msg.subject}</span>
                                 <span className="text-xs text-slate-400">{new Date(msg.updated_at).toLocaleDateString()}</span>
                              </div>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{msg.category}</span>
                           </div>
                           <ChevronRight size={16} className="text-slate-300 self-center"/>
                        </div>
                     ))
                  )}
               </div>
            </div>
         )}

         {/* B. DETALLE DEL MENSAJE (Lectura/Chat) */}
         {mensajeActivo && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4">
               {/* Header Detalle */}
               <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white shadow-sm z-10">
                  <button onClick={() => setMensajeActivo(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                  <div className="flex-1">
                     <h3 className="font-black text-lg text-slate-800 leading-tight">
                        {mensajeActivo.tipo === 'anuncio' ? mensajeActivo.title : mensajeActivo.subject}
                     </h3>
                     <p className="text-xs text-slate-500 flex items-center gap-2">
                        {mensajeActivo.tipo === 'anuncio' ? 'De: Federación' : `Para: ${mensajeActivo.category}`}
                        <span className="text-slate-300">•</span>
                        {new Date(mensajeActivo.created_at || mensajeActivo.updated_at).toLocaleString()}
                     </p>
                  </div>
                  {mensajeActivo.status === 'cerrado' && <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">Cerrado</span>}
               </div>

               {/* Contenido */}
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  
                  {/* SI ES ANUNCIO (Lectura) */}
                  {mensajeActivo.tipo === 'anuncio' && (
                     <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed mb-6">{mensajeActivo.content}</div>
                        
                        {mensajeActivo.attachment_url && (
                           <a href={mensajeActivo.attachment_url} target="_blank" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition group">
                              <div className="bg-white p-2 rounded-lg text-blue-600"><FileText size={24}/></div>
                              <div>
                                 <p className="font-bold text-blue-900 text-sm">Archivo Adjunto Oficial</p>
                                 <p className="text-xs text-blue-500 group-hover:underline">Clic para descargar</p>
                              </div>
                           </a>
                        )}
                     </div>
                  )}

                  {/* SI ES TICKET (Chat) */}
                  {mensajeActivo.tipo === 'ticket' && (
                     <div className="space-y-4">
                        {hiloChat.map(msg => {
                           const soyYo = msg.sender_id === userId; 
                           return (
                              <div key={msg.id} className={`flex ${soyYo ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${soyYo ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    
                                    {msg.attachment_url && (
                                       <a href={msg.attachment_url} target="_blank" className={`mt-3 flex items-center gap-2 p-2 rounded bg-black/20 text-xs font-bold hover:bg-black/30`}>
                                          <Paperclip size={14}/> Ver Adjunto
                                       </a>
                                    )}
                                    
                                    <span className={`block text-[9px] text-right mt-1.5 ${soyYo ? 'text-slate-400' : 'text-slate-300'}`}>
                                       {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                 </div>
                              </div>
                           )
                        })}
                        <div ref={chatEndRef} />
                     </div>
                  )}
               </div>

               {/* Footer Responder */}
               <div className="p-4 bg-white border-t border-slate-200">
                  {mensajeActivo.status !== 'cerrado' ? (
                     <form onSubmit={(e) => { e.preventDefault(); enviarRespuesta(); }} className="flex gap-2">
                        <input 
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-blue-100" 
                           placeholder={mensajeActivo.tipo === 'anuncio' ? "Escribe para iniciar una consulta sobre este tema..." : "Escribe tu respuesta..."}
                           value={respuesta}
                           onChange={e => setRespuesta(e.target.value)}
                        />
                        <button disabled={!respuesta.trim()} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-100">
                           <Send size={20}/>
                        </button>
                     </form>
                  ) : (
                     <div className="text-center text-slate-400 text-sm bg-slate-50 p-2 rounded-lg">Esta conversación ha finalizado.</div>
                  )}
               </div>
            </div>
         )}

         {/* C. REDACTAR NUEVO */}
         {seccion === 'redactar' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
               <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <button onClick={() => setSeccion('recibidos')} className="p-2 hover:bg-slate-50 rounded-full md:hidden"><ArrowLeft size={20}/></button>
                  <h2 className="font-bold text-xl text-slate-800">Nuevo Mensaje</h2>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <div className="max-w-2xl mx-auto space-y-6">
                     {/* Destinatario */}
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Destinatario</label>
                        <div className="flex gap-4">
                           <button onClick={()=>setForm({...form, categoria: 'Federación'})} className={`flex-1 py-3 border rounded-xl font-bold text-sm transition ${form.categoria==='Federación'?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>Administración</button>
                           <button onClick={()=>setForm({...form, categoria: 'Tribunal'})} className={`flex-1 py-3 border rounded-xl font-bold text-sm transition ${form.categoria==='Tribunal'?'border-red-500 bg-red-50 text-red-700':'border-slate-200 text-slate-500'}`}>Tribunal</button>
                        </div>
                     </div>

                     {/* Asunto */}
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Asunto</label>
                        <input 
                           className="w-full p-4 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 transition" 
                           placeholder="Ej: Consulta pago enero..." 
                           value={form.asunto} onChange={e => setForm({...form, asunto: e.target.value})}
                        />
                     </div>

                     {/* Cuerpo */}
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mensaje</label>
                        <textarea 
                           className="w-full h-40 p-4 border border-slate-200 rounded-xl resize-none outline-none focus:border-blue-500 transition leading-relaxed" 
                           placeholder="Describe tu consulta detalladamente..."
                           value={form.contenido} onChange={e => setForm({...form, contenido: e.target.value})}
                        ></textarea>
                     </div>

                     {/* Adjunto */}
                     <div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf"/>
                        {adjunto ? (
                           <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-xl">
                              <div className="flex items-center gap-3">
                                 <FileText className="text-blue-600" size={20}/>
                                 <span className="text-sm font-bold text-blue-900 truncate max-w-[200px]">{adjunto.name}</span>
                              </div>
                              <button onClick={() => setAdjunto(null)} className="text-blue-400 hover:text-red-500"><X size={18}/></button>
                           </div>
                        ) : (
                           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-blue-600 transition">
                              <Paperclip size={18}/> Adjuntar Comprobante/PDF
                           </button>
                        )}
                     </div>

                     <button onClick={enviarNuevoMensaje} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-2">
                        Enviar Mensaje <Send size={18}/>
                     </button>
                  </div>
               </div>
            </div>
         )}

      </main>
    </div>
  );
}