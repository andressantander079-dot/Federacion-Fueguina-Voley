// src/app/admin/mensajes/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link'; // <--- Importante para la navegación
import { 
  Mail, Send, Inbox, Plus, AlertCircle, 
  CheckCircle, Clock, Search, ChevronRight, Eye, 
  Paperclip, X, ShieldAlert, Check, Square, CheckSquare,
  ArrowLeft, Archive, Upload, FileText, Info, Zap, Users, Menu,
  Home // <--- Icono para el inicio
} from 'lucide-react';

export default function MensajesPage() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [seccion, setSeccion] = useState<'recibidos' | 'enviados' | 'redactar' | 'solicitudes'>('recibidos');
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- ESTADOS DEL CHAT ---
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketActivo, setTicketActivo] = useState<any>(null);
  const [mensajesChat, setMensajesChat] = useState<any[]>([]);
  const [filtroDepto, setFiltroDepto] = useState<'Todos' | 'Federación' | 'Tribunal'>('Todos');
  const [busqueda, setBusqueda] = useState('');

  // --- ESTADOS AUXILIARES ---
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]); 
  const [categorias, setCategorias] = useState<any[]>([]);

  // --- FORMULARIO REDACTAR ---
  const [form, setForm] = useState({
    title: '', content: '', priority: 'info', audience: 'all', target_category_id: ''
  });
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  
  // MODAL DE VISTA PREVIA
  const [showPreview, setShowPreview] = useState(false);
  
  // Chat
  const [respuesta, setRespuesta] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, [seccion]);

  useEffect(() => {
    if (ticketActivo) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajesChat, ticketActivo]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    cargarDatosComunes();
    if (seccion === 'recibidos') cargarTickets();
    if (seccion === 'enviados') cargarAnuncios();
    if (seccion === 'solicitudes') cargarSolicitudes();
  }

  async function cargarDatosComunes() {
    const { data: teams } = await supabase.from('teams').select('id, name, logo_url').order('name');
    setEquipos(teams || []);
    if (teams) setSelectedClubIds(teams.map(t => t.id)); 
    const { data: cats } = await supabase.from('categories').select('id, name');
    setCategorias(cats || []);
  }

  // --- LÓGICA MESA DE ENTRADA ---
  async function cargarTickets() {
    const { data } = await supabase
      .from('tickets')
      .select(`*, team:teams(name, logo_url), messages:ticket_messages(content, created_at, sender_id)`)
      .order('updated_at', { ascending: false });

    const processed = data?.map(t => {
        const msgs = t.messages || [];
        msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastMsg = msgs[msgs.length - 1];
        return {
            ...t,
            last_message_content: lastMsg?.content || '(Sin mensajes)',
            last_sender_id: lastMsg?.sender_id,
            last_message_time: lastMsg?.created_at || t.created_at
        };
    }) || [];
    setTickets(processed);
  }

  async function abrirTicket(ticket: any) {
    setTicketActivo(ticket);
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setMensajesChat(data || []);
    setMobileMenuOpen(false);
  }

  async function enviarRespuesta(e: React.FormEvent) {
    e.preventDefault();
    if (!respuesta.trim()) return;
    await supabase.from('ticket_messages').insert([{ ticket_id: ticketActivo.id, sender_id: userId, content: respuesta }]);
    await supabase.from('tickets').update({ updated_at: new Date(), status: 'abierto' }).eq('id', ticketActivo.id);
    setRespuesta('');
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketActivo.id).order('created_at', { ascending: true });
    setMensajesChat(data || []);
    cargarTickets();
  }

  async function resolverTicket() {
      if (!confirm("¿Marcar RESUELTO?")) return;
      await supabase.from('tickets').update({ status: 'cerrado' }).eq('id', ticketActivo.id);
      setTicketActivo(null);
      cargarTickets();
  }

  // --- LÓGICA ANUNCIOS ---
  async function cargarAnuncios() {
    const { data } = await supabase.from('announcements').select('*, announcement_reads(team_id)').order('created_at', { ascending: false });
    setAnuncios(data || []);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleOpenPreview = () => {
    if (!form.title || !form.content) return alert("Falta Asunto o Mensaje.");
    if (form.audience === 'specific' && selectedClubIds.length === 0) return alert("Selecciona clubes.");
    setShowPreview(true);
  };

  async function enviarAnuncio(esBorrador = false) {
    const status = esBorrador ? 'draft' : 'sent';
    let attachmentUrl = null;

    if (attachment) {
      const fileExt = attachment.name.split('.').pop();
      const fileName = `ann-${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from('announcement-files').upload(fileName, attachment);
      if (upErr) return alert("Error subida: " + upErr.message);
      const { data: urlData } = supabase.storage.from('announcement-files').getPublicUrl(fileName);
      attachmentUrl = urlData.publicUrl;
    }
    
    const payload = {
      ...form, status, attachment_url: attachmentUrl,
      target_category_id: form.audience === 'category' ? form.target_category_id : null,
      target_team_ids: form.audience === 'specific' ? selectedClubIds : null
    };
    
    const { error } = await supabase.from('announcements').insert([payload]);
    if (!error) {
       alert(esBorrador ? "Guardado" : "¡Enviado con éxito!");
       setForm({ title: '', content: '', priority: 'info', audience: 'all', target_category_id: '' });
       setAttachment(null);
       setShowPreview(false);
       setSeccion('enviados');
    } else {
       alert("Error: " + error.message);
    }
  }

  // --- SOLICITUDES Y HELPERS ---
  async function cargarSolicitudes() {
      const { data } = await supabase.from('access_requests').select('*').eq('status', 'pending');
      setSolicitudes(data || []);
  }
  async function procesarSolicitud(id: string, accion: 'approved' | 'rejected') {
    if(!confirm("¿Confirmar?")) return;
    await supabase.from('access_requests').update({ status: accion }).eq('id', id);
    cargarSolicitudes();
  }

  const ticketsFiltrados = tickets.filter(t => {
      const matchTexto = t.team?.name.toLowerCase().includes(busqueda.toLowerCase()) || t.subject.toLowerCase().includes(busqueda.toLowerCase());
      const matchDepto = filtroDepto === 'Todos' || t.category === filtroDepto;
      return matchTexto && matchDepto && t.status === 'abierto';
  });

  const toggleClub = (id: string) => {
    if (selectedClubIds.includes(id)) setSelectedClubIds(selectedClubIds.filter(cid => cid !== id));
    else setSelectedClubIds([...selectedClubIds, id]);
  };
  const toggleAllClubs = () => selectedClubIds.length === equipos.length ? setSelectedClubIds([]) : setSelectedClubIds(equipos.map(t => t.id));

  return (
    <div className="h-screen bg-slate-50 md:p-4 flex flex-col md:flex-row gap-4 font-sans overflow-hidden">
      
      {/* HEADER MÓVIL (Con navegación simple) */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="p-1 text-slate-500 hover:text-slate-800"><Home size={20}/></Link>
            <ChevronRight size={16} className="text-slate-300"/>
            <h1 className="font-bold text-slate-800">Mensajería</h1>
         </div>
         <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
            {mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
         </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
          fixed inset-0 z-50 bg-white md:static md:bg-transparent md:z-auto
          md:w-60 flex flex-col gap-2 shrink-0 h-full p-4 md:p-0
          transition-transform duration-300 transform
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
         <div className="md:hidden flex justify-end mb-4">
            <button onClick={() => setMobileMenuOpen(false)} className="p-2"><X/></button>
         </div>

         <button onClick={() => { setSeccion('redactar'); setTicketActivo(null); setMobileMenuOpen(false); }} className="bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md transition">
           <Plus size={18}/> Redactar
         </button>

         <nav className="flex flex-col gap-1 bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex-1 md:flex-none md:h-auto overflow-y-auto">
            <button onClick={() => { setSeccion('recibidos'); setTicketActivo(null); setMobileMenuOpen(false); }} className={`p-3 rounded-md text-left flex items-center justify-between text-sm ${seccion === 'recibidos' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-3"><Inbox size={18}/> Entrada</div>
               {tickets.filter(t => t.last_sender_id !== userId && t.status === 'abierto').length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{tickets.filter(t => t.last_sender_id !== userId && t.status === 'abierto').length}</span>}
            </button>
            <button onClick={() => { setSeccion('enviados'); setMobileMenuOpen(false); }} className={`p-3 rounded-md text-left flex items-center justify-between text-sm ${seccion === 'enviados' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-3"><Send size={18}/> Enviados</div>
            </button>
            <button onClick={() => { setSeccion('solicitudes'); setMobileMenuOpen(false); }} className={`p-3 rounded-md text-left flex items-center justify-between text-sm ${seccion === 'solicitudes' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-3"><ShieldAlert size={18}/> Solicitudes</div>
               {solicitudes.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 rounded-full">{solicitudes.length}</span>}
            </button>
         </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 bg-white md:rounded-xl shadow-sm border-t md:border border-slate-200 overflow-hidden flex flex-col h-full w-full relative">
        
        {/* --- BARRA DE NAVEGACIÓN SUPERIOR (BREADCRUMB) --- */}
        <div className="hidden md:flex items-center gap-2 px-6 pt-4 pb-2 text-sm text-slate-400 font-medium select-none">
            <Link href="/admin/dashboard" className="hover:text-slate-800 flex items-center gap-1 transition-colors">
                <Home size={14}/> Inicio
            </Link>
            <ChevronRight size={14}/>
            <span className="text-slate-800">Mensajería</span>
        </div>

        {/* --- MESA DE ENTRADA --- */}
        {seccion === 'recibidos' && !ticketActivo && (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 pt-2 border-b border-slate-100 bg-white">
                    <h2 className="font-bold text-slate-700 text-lg">Mesa de Entrada</h2>
                    <div className="flex bg-slate-50 border p-0.5 rounded-md">
                        {['Todos', 'Admin', 'Tribunal'].map(f => (
                           <button key={f} onClick={() => setFiltroDepto(f === 'Admin' ? 'Federación' : f as any)} className={`px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold ${filtroDepto === (f === 'Admin' ? 'Federación' : f) ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                        ))}
                    </div>
                </div>
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                    <input className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300" placeholder="Buscar por club o asunto..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {ticketsFiltrados.length === 0 ? <p className="text-center text-slate-400 text-sm mt-10">Bandeja vacía.</p> : 
                        ticketsFiltrados.map(t => {
                            const isUnread = t.last_sender_id !== userId; 
                            return (
                                <div key={t.id} onClick={() => abrirTicket(t)} className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 hover:bg-slate-50 ${isUnread ? 'bg-blue-50/30 border-blue-100' : 'border-slate-100'}`}>
                                    {isUnread && <div className="w-2 h-2 bg-red-500 rounded-full shrink-0"></div>}
                                    <img src={t.team?.logo_url || '/placeholder.png'} className="w-8 h-8 rounded bg-slate-200 object-contain"/>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between">
                                            <h4 className={`text-sm truncate ${isUnread?'font-bold text-slate-800':'font-medium text-slate-600'}`}>{t.subject}</h4>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(t.last_message_time).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{t.last_message_content}</p>
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        )}

        {/* --- CHAT ACTIVO --- */}
        {seccion === 'recibidos' && ticketActivo && (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-3 border-b bg-white">
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                        <button onClick={() => setTicketActivo(null)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ArrowLeft size={18}/></button>
                        <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-800 truncate">{ticketActivo.subject}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-bold text-blue-600 truncate">{ticketActivo.team?.name}</span> • <span>{ticketActivo.category}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={resolverTicket} className="shrink-0 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200 text-xs hover:bg-emerald-100">Resolver</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {mensajesChat.map(msg => {
                        const soyYo = msg.sender_id === userId;
                        return (
                            <div key={msg.id} className={`flex ${soyYo ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${soyYo ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    {msg.attachment_url && (
                                        <a href={msg.attachment_url} target="_blank" className={`mt-2 flex items-center gap-2 p-2 rounded bg-black/10 text-xs font-bold hover:bg-black/20`}>
                                            <Paperclip size={12}/> Adjunto
                                        </a>
                                    )}
                                    <div className="text-[9px] text-right mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={enviarRespuesta} className="p-3 border-t bg-white flex gap-2">
                    <input className="flex-1 p-2 border rounded-md text-sm outline-none focus:border-blue-400 bg-slate-50" placeholder="Escribir respuesta..." value={respuesta} onChange={e => setRespuesta(e.target.value)}/>
                    <button disabled={!respuesta.trim()} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"><Send size={18}/></button>
                </form>
            </div>
        )}

        {/* --- REDACTAR (Responsive: Arriba Config, Abajo Contenido) --- */}
        {seccion === 'redactar' && (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Nuevo Comunicado</h2>
                    <button onClick={handleOpenPreview} className="md:hidden bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"><Eye size={14}/> Previa</button>
                </div>
                
                {/* En móvil usamos flex-col (orden natural), en PC flex-row-reverse (Config a derecha) */}
                <div className="flex-1 flex flex-col lg:flex-row-reverse overflow-hidden">
                    
                    {/* 1. CONFIGURACIÓN */}
                    <div className="w-full lg:w-80 p-4 md:p-6 bg-slate-50 flex flex-col gap-6 overflow-y-auto border-b lg:border-b-0 lg:border-l border-slate-100 shrink-0">
                        {/* Prioridad */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Prioridad</label>
                            <div className="flex flex-col gap-2">
                                {[
                                    { id: 'info', label: 'Informativo', color: 'blue' },
                                    { id: 'important', label: 'Importante', color: 'yellow' },
                                    { id: 'urgent', label: 'Urgente', color: 'red' }
                                ].map((p) => (
                                    <button key={p.id} onClick={() => setForm({...form, priority: p.id})}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-bold transition
                                        ${form.priority === p.id 
                                            ? (p.id === 'urgent' ? 'bg-red-50 border-red-300 text-red-700' : p.id === 'important' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-blue-50 border-blue-300 text-blue-700')
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        {p.label}
                                        {form.priority === p.id && <CheckCircle size={14}/>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Audiencia */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Destinatarios</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none mb-3" 
                               value={form.audience} onChange={e => setForm({...form, audience: e.target.value})}>
                               <option value="all">Todos los Clubes</option>
                               <option value="specific">Seleccionar Manualmente</option>
                               <option value="category">Por Categoría</option>
                            </select>

                            {/* Sub-selectores */}
                            {form.audience === 'category' && (
                               <select className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none" value={form.target_category_id} onChange={e => setForm({...form, target_category_id: e.target.value})}>
                                  <option value="">Elegir Categoría...</option>
                                  {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                               </select>
                            )}

                            {form.audience === 'specific' && (
                                <div className="border border-slate-200 rounded-lg bg-white max-h-48 lg:max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b flex justify-between items-center bg-slate-50 sticky top-0">
                                        <span className="text-xs font-bold text-slate-500">Clubes</span>
                                        <button onClick={toggleAllClubs} className="text-[10px] text-blue-600 font-bold hover:underline">Alternar Todos</button>
                                    </div>
                                    <div className="p-1 grid grid-cols-2 lg:grid-cols-1 gap-1">
                                        {equipos.map(e => (
                                            <div key={e.id} onClick={() => toggleClub(e.id)} 
                                              className={`cursor-pointer px-2 py-1.5 rounded flex items-center gap-2 text-xs select-none
                                              ${selectedClubIds.includes(e.id) ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                {selectedClubIds.includes(e.id) ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                <span className="truncate">{e.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:block lg:flex-1"></div>

                        {/* Botones PC */}
                        <div className="hidden md:grid grid-cols-2 gap-2 mt-auto">
                            <button onClick={() => enviarAnuncio(true)} className="py-3 rounded-lg border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50">
                                Borrador
                            </button>
                            <button onClick={handleOpenPreview} className="py-3 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-black shadow-lg flex items-center justify-center gap-2">
                                <Eye size={16}/> Vista Previa
                            </button>
                        </div>
                    </div>

                    {/* 2. CONTENIDO (EDITOR) */}
                    <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asunto</label>
                            <input 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700" 
                                placeholder="Ej: Suspensión de fecha..." 
                                value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                            />
                        </div>
                        
                        <div className="flex-1 flex flex-col min-h-[200px]">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mensaje</label>
                            <textarea 
                                className="w-full flex-1 p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 resize-none text-sm leading-relaxed" 
                                placeholder="Escribe aquí el contenido..." 
                                value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                            ></textarea>
                        </div>

                        {/* INPUT ARCHIVO */}
                        <div>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf"/>
                             {attachment ? (
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                       <FileText size={16} className="text-blue-600 shrink-0"/>
                                       <span className="text-xs font-bold text-blue-900 truncate">{attachment.name}</span>
                                    </div>
                                    <button onClick={() => setAttachment(null)} className="text-blue-400 hover:text-red-500"><X size={16}/></button>
                                </div>
                             ) : (
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-xs font-bold py-2">
                                    <Paperclip size={14}/> Adjuntar PDF o Imagen
                                </button>
                             )}
                        </div>
                    </div>

                </div>
            </div>
        )}

        {/* --- VISTAS SIMPLES (ENVIADOS) --- */}
        {(seccion === 'enviados' || seccion === 'solicitudes') && (
            <div className="p-4 md:p-6 overflow-y-auto">
                 {seccion === 'enviados' && (
                     <div className="space-y-2">
                        <h2 className="font-bold text-slate-700 mb-4">Historial Enviado</h2>
                        {anuncios.map(a => (
                           <div key={a.id} className="border p-3 rounded-lg bg-white flex justify-between items-center text-sm">
                              <div className="flex items-center gap-3">
                                 <div className={`w-1.5 h-1.5 rounded-full ${a.priority==='urgent'?'bg-red-500':'bg-blue-500'}`}></div>
                                 <span className="font-bold truncate max-w-[150px] md:max-w-md">{a.title}</span>
                              </div>
                              <span className="text-slate-400 text-xs shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                           </div>
                        ))}
                     </div>
                 )}
                 {seccion === 'solicitudes' && (
                     <div className="space-y-2">
                        <h2 className="font-bold text-slate-700 mb-4">Solicitudes de Acceso</h2>
                        {solicitudes.length === 0 && <p className="text-slate-400 text-sm">Sin solicitudes.</p>}
                        {solicitudes.map(s => (
                           <div key={s.id} className="border p-3 rounded-lg bg-white flex flex-col md:flex-row md:justify-between md:items-center text-sm gap-3">
                              <div><span className="font-bold block">{s.club_name}</span><span className="text-xs text-slate-400">{s.official_email}</span></div>
                              <div className="flex gap-2 self-end md:self-auto"><button onClick={()=>procesarSolicitud(s.id,'approved')} className="bg-green-100 text-green-700 p-2 rounded"><Check size={16}/></button><button onClick={()=>procesarSolicitud(s.id,'rejected')} className="bg-red-100 text-red-700 p-2 rounded"><X size={16}/></button></div>
                           </div>
                        ))}
                     </div>
                 )}
            </div>
        )}

      </main>

      {/* --- MODAL DE VISTA PREVIA --- */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className={`p-4 flex justify-between items-center text-white font-bold ${form.priority === 'urgent' ? 'bg-red-600' : form.priority === 'important' ? 'bg-yellow-500' : 'bg-blue-600'}`}>
                 <span className="flex items-center gap-2"><Eye size={20}/> Vista Previa</span>
                 <button onClick={() => setShowPreview(false)} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                 <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase">Comunicado Oficial</span>
                        <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight">{form.title}</h3>
                    <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{form.content}</p>
                    {attachment && (
                       <div className="mt-6 pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                             <div className="bg-blue-50 p-2 rounded text-blue-600"><FileText size={20}/></div>
                             <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{attachment.name}</p>
                                <p className="text-[10px] text-slate-400">Adjunto descargable</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
                 <div className="text-center text-xs text-slate-400 mb-6">
                    Se enviará a: <span className="font-bold text-slate-600">
                       {form.audience === 'all' ? 'Todos los Clubes' : form.audience === 'specific' ? `${selectedClubIds.length} Clubes Seleccionados` : 'Categoría Específica'}
                    </span>
                 </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button onClick={() => setShowPreview(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition">Corregir</button>
                 <button onClick={() => enviarAnuncio(false)} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition flex items-center justify-center gap-2">Confirmar y Enviar <Send size={16}/></button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}