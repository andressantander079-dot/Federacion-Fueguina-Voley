// src/app/admin/mensajes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Mail, Send, Inbox, FileText, Plus, AlertCircle, 
  CheckCircle, Clock, Users, ChevronRight, Eye, 
  Trash2, Paperclip, X, ShieldAlert, Check, Square, CheckSquare
} from 'lucide-react';

export default function MensajesPage() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [seccion, setSeccion] = useState<'recibidos' | 'enviados' | 'redactar' | 'solicitudes'>('recibidos');
  const [modalPreview, setModalPreview] = useState(false);
  const [modalLecturas, setModalLecturas] = useState<any>(null);

  // --- DATOS ---
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [recibidos, setRecibidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]); 
  const [categorias, setCategorias] = useState<any[]>([]);

  // --- FORMULARIO NUEVO MENSAJE ---
  const [form, setForm] = useState({
    title: '', content: '', priority: 'info', audience: 'all', target_category_id: '', attachment_url: ''
  });
  
  // Nuevo Estado: Lista de IDs de clubes seleccionados manualmente
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [seccion]);

  async function cargarDatos() {
    // 1. Cargar Equipos y Categorías
    const { data: teams } = await supabase.from('teams').select('id, name, logo_url').order('name');
    setEquipos(teams || []);
    // Inicializamos la selección manual con TODOS los equipos por defecto para facilitar
    if (teams) setSelectedClubIds(teams.map(t => t.id));

    const { data: cats } = await supabase.from('categories').select('id, name');
    setCategorias(cats || []);

    // 2. Cargar según sección
    if (seccion === 'enviados') {
      const { data } = await supabase
        .from('announcements')
        .select('*, announcement_reads(team_id)')
        .order('created_at', { ascending: false });
      setAnuncios(data || []);
    } else if (seccion === 'solicitudes') {
      const { data } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending');
      setSolicitudes(data || []);
    } else if (seccion === 'recibidos') {
       const { data } = await supabase
         .from('inbox_messages')
         .select('*, team:teams(name)')
         .order('created_at', { ascending: false });
       setRecibidos(data || []);
    }
  }

  // --- LOGICA DE SELECCIÓN MANUAL ---
  const toggleClub = (id: string) => {
    if (selectedClubIds.includes(id)) {
      setSelectedClubIds(selectedClubIds.filter(clubId => clubId !== id));
    } else {
      setSelectedClubIds([...selectedClubIds, id]);
    }
  };

  const toggleAllClubs = () => {
    if (selectedClubIds.length === equipos.length) {
      setSelectedClubIds([]); // Desmarcar todos
    } else {
      setSelectedClubIds(equipos.map(t => t.id)); // Marcar todos
    }
  };

  // --- LÓGICA DE ENVÍO ---
  async function enviarMensaje(esBorrador = false) {
    const status = esBorrador ? 'draft' : 'sent';
    
    // Validaciones
    if (!form.title || !form.content) return alert("Completa el asunto y el contenido.");
    if (form.audience === 'specific' && selectedClubIds.length === 0) return alert("Debes seleccionar al menos un club.");

    const payload = {
      ...form,
      status: status,
      target_category_id: form.audience === 'category' ? form.target_category_id : null,
      target_team_ids: form.audience === 'specific' ? selectedClubIds : null
    };
    
    const { error } = await supabase.from('announcements').insert([payload]);

    if (!error) {
      alert(esBorrador ? "Guardado en borradores" : "¡Mensaje enviado correctamente!");
      setModalPreview(false);
      setForm({ title: '', content: '', priority: 'info', audience: 'all', target_category_id: '', attachment_url: '' });
      setSeccion('enviados');
    } else {
      alert("Error al enviar: " + error.message);
    }
  }

  // --- LOGICA DE SOLICITUDES Y LECTURAS ---
  async function procesarSolicitud(id: string, accion: 'approved' | 'rejected') {
    if(!confirm(`¿Estás seguro de ${accion === 'approved' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return;
    await supabase.from('access_requests').update({ status: accion }).eq('id', id);
    setSolicitudes(solicitudes.filter(s => s.id !== id));
  }

  function getEstadoLectura(lecturas: any[]) {
     const totalEquipos = equipos.length;
     const leidos = lecturas.length;
     return { leidos, total: totalEquipos, porcentaje: (leidos / totalEquipos) * 100 };
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col md:flex-row gap-6">
      
      {/* ================= BARRA LATERAL ================= */}
      <aside className="w-full md:w-64 flex flex-col gap-2 shrink-0">
         <button 
           onClick={() => setSeccion('redactar')}
           className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mb-4 transition"
         >
           <Plus size={20}/> Redactar Nuevo
         </button>

         <nav className="flex flex-col gap-1">
            <button onClick={() => setSeccion('recibidos')} className={`p-3 rounded-xl text-left flex items-center justify-between group ${seccion === 'recibidos' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
               <div className="flex items-center gap-3"><Inbox size={18}/> Recibidos</div>
               {recibidos.filter(r => !r.is_read).length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{recibidos.filter(r => !r.is_read).length}</span>}
            </button>
            <button onClick={() => setSeccion('enviados')} className={`p-3 rounded-xl text-left flex items-center justify-between group ${seccion === 'enviados' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
               <div className="flex items-center gap-3"><Send size={18}/> Enviados</div>
            </button>
            <button onClick={() => setSeccion('solicitudes')} className={`p-3 rounded-xl text-left flex items-center justify-between group ${seccion === 'solicitudes' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
               <div className="flex items-center gap-3"><ShieldAlert size={18}/> Solicitudes</div>
               {solicitudes.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{solicitudes.length}</span>}
            </button>
         </nav>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
        
        {/* --- VISTA: REDACTAR --- */}
        {seccion === 'redactar' && (
          <div className="max-w-2xl mx-auto animate-in fade-in">
             <h2 className="text-2xl font-black text-slate-800 mb-6">Nuevo Comunicado</h2>
             <div className="space-y-6">
                
                {/* 1. Prioridad */}
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nivel de Prioridad</label>
                   <div className="flex gap-4">
                      {['info', 'important', 'urgent'].map(p => (
                        <button 
                          key={p}
                          onClick={() => setForm({...form, priority: p})}
                          className={`flex-1 py-3 rounded-xl border-2 font-bold capitalize transition flex items-center justify-center gap-2
                            ${form.priority === p 
                              ? (p === 'urgent' ? 'border-red-500 bg-red-50 text-red-600' : p === 'important' ? 'border-yellow-400 bg-yellow-50 text-yellow-600' : 'border-green-500 bg-green-50 text-green-600')
                              : 'border-slate-100 text-slate-400 hover:border-slate-300'
                            }
                          `}
                        >
                           {p === 'urgent' && <AlertCircle size={18}/>}
                           {p === 'info' ? 'Informativo' : p === 'important' ? 'Importante' : 'Urgente'}
                        </button>
                      ))}
                   </div>
                </div>

                {/* 2. Audiencia (Selectores) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Audiencia</label>
                      <select 
                        className="w-full p-3 border rounded-xl bg-slate-50 font-medium focus:ring-2 focus:ring-blue-100 outline-none" 
                        value={form.audience} 
                        onChange={e => setForm({...form, audience: e.target.value})}
                      >
                         <option value="all">Todos los Clubes</option>
                         <option value="specific">Selección Manual de Clubes</option> {/* NUEVO */}
                         <option value="category">Por Categoría</option>
                         <option value="delegates">Solo Delegados</option>
                      </select>
                   </div>
                   
                   {/* Sub-selector Categoría */}
                   {form.audience === 'category' && (
                     <div className="animate-in fade-in">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Seleccionar Categoría</label>
                        <select className="w-full p-3 border rounded-xl bg-slate-50 font-medium" value={form.target_category_id} onChange={e => setForm({...form, target_category_id: e.target.value})}>
                           <option value="">Elegir...</option>
                           {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                   )}
                </div>

                {/* NUEVO: PANEL DE SELECCIÓN MANUAL (Estilo Video) */}
                {form.audience === 'specific' && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 animate-in slide-in-from-top-2">
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-slate-700">Seleccionar Destinatarios ({selectedClubIds.length})</span>
                        <button onClick={toggleAllClubs} className="text-xs text-blue-600 font-bold hover:underline">
                           {selectedClubIds.length === equipos.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                        </button>
                     </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {equipos.map(equipo => (
                           <div 
                              key={equipo.id} 
                              onClick={() => toggleClub(equipo.id)}
                              className={`
                                cursor-pointer p-2 rounded-lg border flex items-center gap-2 transition-all
                                ${selectedClubIds.includes(equipo.id) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                              `}
                           >
                              {selectedClubIds.includes(equipo.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                              <span className="text-xs font-bold truncate">{equipo.name}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                )}

                {/* 3. Contenido Mensaje */}
                <div className="space-y-3">
                  <input 
                    className="w-full p-3 text-lg font-bold border-b border-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-300 transition-colors" 
                    placeholder="Asunto del comunicado..."
                    value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  />
                  <textarea 
                    className="w-full h-40 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-100 resize-none text-slate-600" 
                    placeholder="Escribe el contenido oficial aquí..."
                    value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  ></textarea>
                </div>

                {/* 4. Adjuntos */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                   <div className="relative overflow-hidden">
                      <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm px-3 py-2 rounded-lg hover:bg-slate-50 transition">
                         <Paperclip size={18}/> {form.attachment_url ? 'Cambiar Archivo' : 'Adjuntar PDF/Imagen'}
                      </button>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" title="Simulado: Pega un link en el campo de texto si quieres probar" />
                   </div>
                   {form.attachment_url && <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Adjunto OK</span>}
                </div>

                {/* 5. Acciones Finales */}
                <div className="pt-4 flex gap-3">
                   <button onClick={() => enviarMensaje(true)} className="flex-1 border border-slate-200 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-50 transition">
                     Guardar Borrador
                   </button>
                   <button onClick={() => setModalPreview(true)} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black flex items-center justify-center gap-2 shadow-lg transition transform hover:-translate-y-0.5">
                      <Eye size={18}/> Vista Previa & Enviar
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* --- VISTA: ENVIADOS (Historial) --- */}
        {seccion === 'enviados' && (
           <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-slate-700 mb-4">Historial de Comunicados</h2>
              {anuncios.map(anuncio => {
                 const stats = getEstadoLectura(anuncio.announcement_reads);
                 return (
                   <div key={anuncio.id} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition flex flex-col md:flex-row gap-4 items-start bg-white">
                      <div className={`shrink-0 w-1.5 self-stretch rounded-full 
                        ${anuncio.priority === 'urgent' ? 'bg-red-500' : anuncio.priority === 'important' ? 'bg-yellow-400' : 'bg-green-500'}
                      `}></div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded 
                               ${anuncio.status === 'draft' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}
                            `}>
                               {anuncio.status === 'draft' ? 'Borrador' : 'Enviado'}
                            </span>
                            <span className="text-xs text-slate-400">{new Date(anuncio.created_at).toLocaleDateString()}</span>
                            {/* Chip de Audiencia */}
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                               {anuncio.audience === 'all' ? 'Todos' : anuncio.audience === 'specific' ? 'Manual' : anuncio.audience}
                            </span>
                         </div>
                         <h3 className="font-bold text-slate-800 text-lg truncate">{anuncio.title}</h3>
                         <p className="text-slate-500 text-sm line-clamp-2">{anuncio.content}</p>
                      </div>

                      {/* Contador Lecturas */}
                      {anuncio.status === 'sent' && (
                        <div onClick={() => setModalLecturas({ anuncio, leidos: anuncio.announcement_reads })} className="cursor-pointer bg-slate-50 hover:bg-blue-50 px-4 py-2 rounded-xl text-center border border-slate-200 min-w-[90px] shrink-0 transition">
                           <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Leído por</div>
                           <div className="text-lg font-black text-slate-700">{stats.leidos}<span className="text-slate-300 text-xs font-normal">/{stats.total}</span></div>
                        </div>
                      )}
                   </div>
                 )
              })}
           </div>
        )}

        {/* --- VISTA: SOLICITUDES --- */}
        {seccion === 'solicitudes' && (
           <div className="animate-in fade-in">
              <h2 className="text-xl font-bold text-slate-700 mb-4">Solicitudes de Acceso</h2>
              {solicitudes.length === 0 ? (
                 <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No hay solicitudes nuevas.</div>
              ) : (
                 <div className="grid gap-4">
                    {solicitudes.map(sol => (
                       <div key={sol.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                          <div>
                             <h3 className="font-bold text-lg text-slate-800">{sol.club_name}</h3>
                             <p className="text-slate-500 flex items-center gap-2 text-sm"><Mail size={14}/> {sol.official_email}</p>
                             <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold mt-2 inline-block">Pendiente</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => procesarSolicitud(sol.id, 'rejected')} className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50" title="Rechazar"><X size={20}/></button>
                             <button onClick={() => procesarSolicitud(sol.id, 'approved')} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg shadow-green-200" title="Aprobar"><Check size={20}/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        )}
        
        {/* --- VISTA: RECIBIDOS --- */}
        {seccion === 'recibidos' && (
           <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Inbox size={48} className="mx-auto text-slate-300 mb-4"/>
              <p className="text-slate-400">No hay mensajes nuevos de los clubes.</p>
           </div>
        )}

      </main>

      {/* ================= MODAL: VISTA PREVIA ================= */}
      {modalPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl scale-100 transition-transform">
              <div className={`p-4 text-white font-bold flex justify-between items-center
                 ${form.priority === 'urgent' ? 'bg-red-600' : form.priority === 'important' ? 'bg-yellow-500' : 'bg-blue-600'}
              `}>
                 <span className="flex items-center gap-2"><ShieldAlert size={18}/> CONFIRMAR ENVÍO</span>
                 <button onClick={() => setModalPreview(false)} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
              </div>
              <div className="p-6">
                 <p className="text-xs text-slate-400 uppercase font-bold mb-4">Así verán el comunicado los clubes:</p>
                 
                 <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 mb-6 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-3">{form.title || '(Sin Asunto)'}</h3>
                    <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{form.content || '(Sin Contenido)'}</p>
                    {form.attachment_url && (
                       <div className="mt-4 flex items-center gap-2 text-blue-600 bg-blue-50 p-2.5 rounded-lg border border-blue-100 text-xs font-bold">
                          <Paperclip size={14}/> Archivo Adjunto Incluido
                       </div>
                    )}
                 </div>

                 <div className="text-center mb-6">
                    <p className="text-xs text-slate-400 mb-1">Se enviará a:</p>
                    <p className="text-sm font-bold text-slate-800">
                       {form.audience === 'all' ? 'Todos los Clubes' : 
                        form.audience === 'specific' ? `Selección Manual (${selectedClubIds.length} Clubes)` : 
                        form.audience === 'category' ? 'Categoría Seleccionada' : 'Solo Delegados'}
                    </p>
                 </div>
                 
                 <button onClick={() => enviarMensaje(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-xl transition transform active:scale-95">
                    Confirmar y Publicar Ahora
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ================= MODAL: DETALLE LECTURAS ================= */}
      {modalLecturas && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">Estado de Lectura</h3>
                  <button onClick={() => setModalLecturas(null)} className="p-1 hover:bg-slate-100 rounded"><X/></button>
               </div>
               
               <div className="space-y-2">
                  {equipos.map(equipo => {
                     const leyo = modalLecturas.leidos.some((l:any) => l.team_id === equipo.id);
                     return (
                        <div key={equipo.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                           <div className="flex items-center gap-3">
                              {/* Bolita de estado */}
                              <div className={`w-2 h-2 rounded-full ${leyo ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                              <span className="font-bold text-slate-700 text-sm">{equipo.name}</span>
                           </div>
                           {leyo ? (
                              <span className="text-[10px] font-bold text-green-700 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                 <CheckCircle size={10}/> LEÍDO
                              </span>
                           ) : (
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                                 <Clock size={10}/> PENDIENTE
                              </span>
                           )}
                        </div>
                     )
                  })}
               </div>
            </div>
         </div>
      )}

    </div>
  );
}