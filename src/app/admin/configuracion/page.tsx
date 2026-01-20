// src/app/admin/configuracion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Settings, Calendar, DollarSign, MapPin, 
  Shield, Database, AlertTriangle, 
  ToggleLeft, ToggleRight, Plus, Trash2, Save,
  Image as ImageIcon, FileText, Globe, Key, UserCog,
  Building2, Mail, CreditCard, ChevronRight,
  Users, Info // <--- ¡Agregados aquí para solucionar el error!
} from 'lucide-react';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'deportiva' | 'economica' | 'sedes' | 'legal' | 'sistema'>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- ESTADO MAESTRO DE CONFIGURACIÓN ---
  const [config, setConfig] = useState({
    temporada_actual: 'Apertura 2026',
    libro_pases_abierto: true,
    listas_buena_fe_cerradas: false,
    mensaje_global: '', 
    url_web: 'www.voleyushuaia.com',
    url_instagram: '@federacionvoley',
    email_soporte: 'soporte@voley.com',
    email_notificaciones: 'no-reply@voley.com',
    arancel_jugador: 5000,
    arancel_equipo: 50000,
    arancel_pase: 15000,
    banco_nombre: 'Banco Provincia',
    banco_cbu: '0140999803200099911',
    banco_alias: 'VOLEY.TIERRA.FUEGO',
    banco_titular: 'Federación Fueguina de Voley',
    terminos_legales: 'El jugador declara estar apto físicamente y conocer el reglamento...'
  });

  // Listas Auxiliares
  const [sedes, setSedes] = useState([
    { id: 1, nombre: 'Gimnasio Petrina', direccion: 'Calle Falsa 123' },
    { id: 2, nombre: 'Polideportivo Municipal', direccion: 'Av. Siempre Viva 742' },
  ]);

  const [categorias, setCategorias] = useState([
    { id: 'sub14', nombre: 'Sub-14', anios: '2012-2013' },
    { id: 'sub18', nombre: 'Sub-18', anios: '2008-2009' },
    { id: 'mayores', nombre: 'Mayores', anios: 'Libre' },
  ]);

  const [tiposPase, setTiposPase] = useState([
    { id: 1, nombre: 'Definitivo' },
    { id: 2, nombre: 'Préstamo (1 Torneo)' },
    { id: 3, nombre: 'Inter-Federativo' }
  ]);

  const [roles, setRoles] = useState([
    { id: 'admin', label: 'Administrador General', permisos: 'Acceso Total' },
    { id: 'tribunal', label: 'Tribunal de Disciplina', permisos: 'Sanciones, Mensajes' },
    { id: 'tesorero', label: 'Tesoreria', permisos: 'Pagos, Configuración Económica' },
    { id: 'planillero', label: 'Planillero', permisos: 'Carga de Resultados, Planillas' },
  ]);

  // --- HANDLERS ---
  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    alert("¡Configuración Global Actualizada! Los cambios impactan inmediatamente en los clubes.");
  };

  const toggleSwitch = (key: keyof typeof config) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key as keyof typeof config] }));
  };

  const removeItem = (setter: any, list: any[], id: any) => setter(list.filter(i => i.id !== id));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="text-slate-400"/> Panel Maestro
          </h1>
          <p className="text-slate-500 font-medium mt-1">Centro de control operativo de la Federación</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl hover:bg-black transition disabled:opacity-70 transform active:scale-95"
        >
          {saving ? <Database className="animate-spin" size={20}/> : <Save size={20}/>}
          {saving ? 'Guardando...' : 'Guardar Cambios Globales'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* --- SIDEBAR DE NAVEGACIÓN --- */}
        <aside className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
          {[
            { id: 'general', label: 'Identidad & Web', icon: Globe, desc: 'Logos, Redes, Avisos' },
            { id: 'deportiva', label: 'Gestión Deportiva', icon: Calendar, desc: 'Pases, Fechas, Categorías' },
            { id: 'economica', label: 'Economía & Banco', icon: DollarSign, desc: 'Aranceles, CBU' },
            { id: 'sedes', label: 'Sedes Oficiales', icon: MapPin, desc: 'Canchas habilitadas' },
            { id: 'legal', label: 'Legales & Staff', icon: Shield, desc: 'TyC, Permisos, Email' },
            { id: 'sistema', label: 'Sistema', icon: Database, desc: 'Logs, Backups' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-4 rounded-2xl text-left flex items-start gap-4 transition-all duration-200 group
                ${activeTab === tab.id 
                  ? 'bg-white shadow-lg shadow-slate-200 border border-slate-100' 
                  : 'hover:bg-white/60 hover:shadow-sm text-slate-500'}
              `}
            >
              <div className={`p-2 rounded-xl shrink-0 ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                 <tab.icon size={20}/>
              </div>
              <div>
                 <span className={`block font-bold ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-600'}`}>{tab.label}</span>
                 <span className="text-[10px] text-slate-400 font-medium">{tab.desc}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* --- ÁREA DE CONTENIDO --- */}
        <main className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-10 min-h-[700px]">
          
          {/* ================= TAB: GENERAL ================= */}
          {activeTab === 'general' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Identidad Visual */}
              <section>
                 <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                    <ImageIcon className="text-purple-500"/> Identidad Visual
                 </h2>
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group">
                       <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition shadow-inner">
                          <ImageIcon size={40}/>
                       </div>
                       <p className="font-bold text-slate-700">Logo Federación (Header)</p>
                       <p className="text-xs text-slate-400 mt-1">PNG Transparente (200x200)</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group">
                       <div className="w-full h-24 bg-slate-100 rounded-xl mb-4 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition shadow-inner">
                          <ImageIcon size={40}/>
                       </div>
                       <p className="font-bold text-slate-700">Banner Sponsors (Footer)</p>
                       <p className="text-xs text-slate-400 mt-1">PNG/JPG (1200x200)</p>
                    </div>
                 </div>
              </section>

              {/* Redes Sociales */}
              <section>
                 <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                    <Globe className="text-blue-500"/> Contacto Público
                 </h2>
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid md:grid-cols-2 gap-6">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase ml-1">Sitio Web Oficial</label>
                       <input value={config.url_web} onChange={e=>setConfig({...config, url_web: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-medium"/>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase ml-1">Instagram / Redes</label>
                       <input value={config.url_instagram} onChange={e=>setConfig({...config, url_instagram: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-medium"/>
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Soporte (Footer)</label>
                       <input value={config.email_soporte} onChange={e=>setConfig({...config, email_soporte: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-medium"/>
                    </div>
                 </div>
              </section>

              {/* Mensaje Global */}
              <section>
                 <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl shadow-sm">
                    <label className="block text-xs font-black text-orange-600 uppercase mb-3 flex items-center gap-2">
                       <AlertTriangle size={16}/> Anuncio Global (Banner de Emergencia)
                    </label>
                    <input 
                      placeholder="Escribe aquí para mostrar una alerta en todos los clubes..."
                      value={config.mensaje_global}
                      onChange={(e) => setConfig({...config, mensaje_global: e.target.value})}
                      className="w-full p-4 bg-white border border-orange-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 ring-orange-100 transition"
                    />
                    <p className="text-[10px] text-orange-400 mt-2 font-medium ml-1">Si dejas este campo vacío, la alerta desaparecerá.</p>
                 </div>
              </section>
            </div>
          )}

          {/* ================= TAB: DEPORTIVA ================= */}
          {activeTab === 'deportiva' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
               
               {/* SEMÁFOROS CRÍTICOS */}
               <section className="grid md:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between h-40 ${config.libro_pases_abierto ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="font-black text-lg text-slate-800">Libro de Pases</h3>
                            <p className="text-xs font-medium mt-1 opacity-70">
                               {config.libro_pases_abierto ? '🟢 ABIERTO: Se permiten fichajes.' : '🔴 CERRADO: Nadie entra ni sale.'}
                            </p>
                         </div>
                         <button onClick={() => toggleSwitch('libro_pases_abierto')} className={`${config.libro_pases_abierto ? 'text-green-600' : 'text-slate-300'}`}>
                            {config.libro_pases_abierto ? <ToggleRight size={48}/> : <ToggleLeft size={48}/>}
                         </button>
                      </div>
                  </div>

                  <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between h-40 ${config.listas_buena_fe_cerradas ? 'border-red-500 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="font-black text-lg text-slate-800">Listas de Buena Fe</h3>
                            <p className="text-xs font-medium mt-1 opacity-70">
                               {config.listas_buena_fe_cerradas ? '🔒 CONGELADAS: No editables.' : '🔓 ABIERTAS: Clubes pueden editar.'}
                            </p>
                         </div>
                         <button onClick={() => toggleSwitch('listas_buena_fe_cerradas')} className={`${config.listas_buena_fe_cerradas ? 'text-red-600' : 'text-blue-400'}`}>
                            {config.listas_buena_fe_cerradas ? <ToggleRight size={48}/> : <ToggleLeft size={48}/>}
                         </button>
                      </div>
                  </div>
               </section>

               {/* Tipos de Pase */}
               <section>
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                     <h2 className="text-lg font-black text-slate-800">Tipos de Pase Habilitados</h2>
                     <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"><Plus size={14}/> Nuevo</button>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                     {tiposPase.map(tipo => (
                        <div key={tipo.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                           <span className="font-bold text-sm text-slate-700">{tipo.nombre}</span>
                           <button onClick={()=>removeItem(setTiposPase, tiposPase, tipo.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                     ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 ml-2">Estos son los motivos que aparecerán en el formulario de solicitud de pase del club.</p>
               </section>

               {/* Categorías */}
               <section>
                   <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="text-purple-500"/> Categorías (Edades)</h2>
                      <button className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-100"><Plus size={14}/> Nueva</button>
                   </div>
                   <div className="grid md:grid-cols-2 gap-3">
                      {categorias.map(cat => (
                         <div key={cat.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition">
                            <div className="flex items-center gap-3">
                               <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">{cat.id}</span>
                               <div>
                                  <p className="font-bold text-slate-800 text-sm">{cat.nombre}</p>
                                  <p className="text-xs text-slate-400 font-medium">Años: {cat.anios}</p>
                               </div>
                            </div>
                            <button className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                         </div>
                      ))}
                   </div>
               </section>
            </div>
          )}

          {/* ================= TAB: ECONOMICA ================= */}
          {activeTab === 'economica' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
               
               {/* Aranceles */}
               <section>
                  <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                     <DollarSign className="text-emerald-600"/> Tabla de Aranceles (Automáticos)
                  </h2>
                  <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 relative overflow-hidden group">
                         <div className="absolute -right-4 -top-4 bg-emerald-100 w-20 h-20 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
                         <label className="text-xs font-black text-emerald-700 uppercase block mb-3 relative z-10">Fichaje Jugador</label>
                         <div className="flex items-center gap-1 relative z-10">
                            <span className="text-emerald-600 font-black text-xl">$</span>
                            <input type="number" value={config.arancel_jugador} onChange={e=>setConfig({...config, arancel_jugador: +e.target.value})} className="bg-white p-2 rounded-xl w-full font-mono font-bold text-2xl text-emerald-900 shadow-sm outline-none"/>
                         </div>
                      </div>
                      <div className="p-5 bg-white rounded-3xl border border-slate-200">
                         <label className="text-xs font-black text-slate-400 uppercase block mb-3">Inscripción Equipo</label>
                         <div className="flex items-center gap-1">
                            <span className="text-slate-300 font-black text-xl">$</span>
                            <input type="number" value={config.arancel_equipo} onChange={e=>setConfig({...config, arancel_equipo: +e.target.value})} className="bg-slate-50 p-2 rounded-xl w-full font-mono font-bold text-2xl text-slate-700 outline-none"/>
                         </div>
                      </div>
                      <div className="p-5 bg-white rounded-3xl border border-slate-200">
                         <label className="text-xs font-black text-slate-400 uppercase block mb-3">Costo Pase</label>
                         <div className="flex items-center gap-1">
                            <span className="text-slate-300 font-black text-xl">$</span>
                            <input type="number" value={config.arancel_pase} onChange={e=>setConfig({...config, arancel_pase: +e.target.value})} className="bg-slate-50 p-2 rounded-xl w-full font-mono font-bold text-2xl text-slate-700 outline-none"/>
                         </div>
                      </div>
                  </div>
               </section>

               {/* Datos Bancarios */}
               <section className="bg-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden">
                  <div className="relative z-10">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Building2 className="text-blue-400"/> Datos Bancarios (Visibles para Clubes)</h2>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                          <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Banco</label>
                             <input value={config.banco_nombre} onChange={e=>setConfig({...config, banco_nombre: e.target.value})} className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-white font-medium focus:bg-white/20 outline-none transition"/>
                          </div>
                          <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Titular de Cuenta</label>
                             <input value={config.banco_titular} onChange={e=>setConfig({...config, banco_titular: e.target.value})} className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-white font-medium focus:bg-white/20 outline-none transition"/>
                          </div>
                          <div className="md:col-span-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">CBU / CVU</label>
                             <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <input value={config.banco_cbu} onChange={e=>setConfig({...config, banco_cbu: e.target.value})} className="w-full bg-white/10 border border-white/10 rounded-xl p-3 pl-10 text-white font-mono text-lg tracking-wider focus:bg-white/20 outline-none transition"/>
                             </div>
                          </div>
                          <div className="md:col-span-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">ALIAS</label>
                             <input value={config.banco_alias} onChange={e=>setConfig({...config, banco_alias: e.target.value})} className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-yellow-400 font-black text-xl uppercase tracking-widest focus:bg-white/20 outline-none transition text-center"/>
                          </div>
                      </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
               </section>
            </div>
          )}

          {/* ================= TAB: SEDES ================= */}
          {activeTab === 'sedes' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <section>
                   <div className="flex justify-between items-center mb-6 border-b pb-2">
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MapPin className="text-red-500"/> Sedes Oficiales</h2>
                      <button className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-black transition"><Plus size={16}/> Nueva Sede</button>
                   </div>
                   
                   <div className="grid gap-4">
                      {sedes.map(sede => (
                         <div key={sede.id} className="group flex justify-between items-center p-6 border border-slate-200 rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-5">
                               <div className="bg-red-50 p-4 rounded-2xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors"><MapPin size={24}/></div>
                               <div>
                                  <h3 className="font-bold text-slate-800 text-xl">{sede.nombre}</h3>
                                  <p className="text-sm text-slate-400 font-medium flex items-center gap-1"><MapPin size={12}/> {sede.direccion}</p>
                               </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => removeItem(setSedes, sedes, sede.id)} className="px-4 py-2 text-xs font-bold border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition flex items-center gap-2">Eliminar <Trash2 size={14}/></button>
                            </div>
                         </div>
                      ))}
                   </div>
                </section>
             </div>
          )}

          {/* ================= TAB: LEGAL & STAFF ================= */}
          {activeTab === 'legal' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Email Remitente */}
                <section className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                   <h2 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Mail size={16}/> Configuración de Correo
                   </h2>
                   <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                         <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Remitente (Reply-To)</label>
                         <input value={config.email_notificaciones} onChange={e=>setConfig({...config, email_notificaciones: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-bold text-slate-700"/>
                      </div>
                      <div className="text-xs text-slate-400 max-w-xs">
                         <Info size={14} className="inline mr-1 mb-0.5"/>
                         Si un club responde a una notificación automática, el correo llegará a esta dirección.
                      </div>
                   </div>
                </section>

                {/* Términos Legales */}
                <section>
                   <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-slate-500"/> Términos Legales (Inscripción)</h2>
                   <textarea 
                      className="w-full h-48 p-5 border border-slate-200 rounded-3xl bg-slate-50 text-sm text-slate-600 focus:outline-none focus:bg-white focus:ring-4 ring-blue-50 transition resize-none leading-relaxed shadow-inner"
                      defaultValue={config.terminos_legales}
                      onChange={e=>setConfig({...config, terminos_legales: e.target.value})}
                   ></textarea>
                   <p className="text-[10px] text-slate-400 mt-2 text-right font-medium">Este texto es vinculante y aparecerá en cada ficha de jugador.</p>
                </section>

                {/* Roles Staff */}
                <section>
                   <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><UserCog className="text-slate-500"/> Roles de Staff (Permisos)</h2>
                   <div className="grid md:grid-cols-2 gap-4">
                      {roles.map(rol => (
                         <div key={rol.id} className="p-5 border border-slate-200 rounded-2xl flex justify-between items-start hover:bg-slate-50 transition cursor-pointer">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-slate-800">{rol.label}</h4>
                               </div>
                               <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-mono border border-slate-200 uppercase">{rol.id}</span>
                               <p className="text-xs text-slate-500 mt-3 font-medium bg-white p-2 rounded-lg border border-slate-100 inline-block">{rol.permisos}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300"/>
                         </div>
                      ))}
                   </div>
                </section>
             </div>
          )}

          {/* ================= TAB: SISTEMA ================= */}
          {activeTab === 'sistema' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Backup */}
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col md:flex-row justify-between items-center shadow-2xl">
                   <div className="relative z-10 mb-6 md:mb-0">
                      <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><Database className="text-emerald-400"/> Copia de Seguridad</h2>
                      <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                         Descarga una copia completa de la base de datos (Jugadores, Equipos, Pases y Resultados) en formato JSON compatible para resguardo local.
                      </p>
                   </div>
                   <button className="relative z-10 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-emerald-50 hover:text-emerald-900 transition shadow-lg transform hover:-translate-y-1">
                      Descargar Backup .JSON
                   </button>
                   <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>
                </div>

                {/* Logs */}
                <section>
                   <h2 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2"><Key size={18}/> Auditoría Reciente</h2>
                   <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left">
                         <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider">
                            <tr>
                               <th className="p-4">Usuario</th>
                               <th className="p-4">Acción</th>
                               <th className="p-4 text-right">Hace</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 bg-white">
                            {[1,2,3].map(i => (
                               <tr key={i} className="hover:bg-slate-50 transition">
                                  <td className="p-4 font-bold text-slate-700">admin@federacion.com</td>
                                  <td className="p-4 text-slate-600 font-medium">Modificó arancel pases</td>
                                  <td className="p-4 text-slate-400 font-mono text-right">2h</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </section>
             </div>
          )}

        </main>
      </div>
    </div>
  );
}