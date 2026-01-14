// src/app/admin/equipos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Users, ChevronLeft, Plus, User, 
  CreditCard, Activity, X, Camera, Trash2, 
  Shield, Trophy, ChevronRight
} from 'lucide-react';

export default function EquiposPage() {
  // --- ESTADOS DE NAVEGACIÓN (El Mapa) ---
  const [vista, setVista] = useState<'clubes' | 'categorias' | 'jugadores'>('clubes');
  
  // --- DATOS SELECCIONADOS ---
  const [clubSeleccionado, setClubSeleccionado] = useState<any>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<any>(null);
  
  // --- DATOS CRUD ---
  const [equipos, setEquipos] = useState<any[]>([]); 
  const [categorias, setCategorias] = useState<any[]>([]); 
  const [jugadores, setJugadores] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // --- MODAL CARNET / EDICIÓN ---
  const [jugadoraCarnet, setJugadoraCarnet] = useState<any>(null);
  const [modoEdicionJugador, setModoEdicionJugador] = useState(false);

  // --- FORMULARIO ---
  const [formData, setFormData] = useState({
    name: '', last_name: '', dni: '', number: '', 
    birth_date: '', photo_url: '', medical_fit: false
  });

  // 1. CARGA INICIAL
  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: teams } = await supabase.from('teams').select('*').order('name');
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      if (teams) setEquipos(teams);
      if (cats) setCategorias(cats);
      setLoading(false);
    }
    init();
  }, []);

  // 2. NAVEGACIÓN
  const irACategorias = (club: any) => {
    setClubSeleccionado(club);
    setVista('categorias');
  };

  const irAJugadores = async (cat: any) => {
    setCategoriaSeleccionada(cat);
    setLoading(true);
    // Buscamos SOLO jugadores de este club Y esta categoría
    const { data } = await supabase
      .from('players')
      .select('*, category:categories(name)')
      .eq('team_id', clubSeleccionado.id)
      .eq('category_id', cat.id)
      .order('name');
    
    setJugadores(data || []);
    setVista('jugadores');
    setLoading(false);
  };

  const volverAtras = () => {
    if (vista === 'jugadores') setVista('categorias');
    else if (vista === 'categorias') setVista('clubes');
  };

  // 3. GUARDAR JUGADOR
  async function guardarJugador(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.last_name) return alert("Faltan datos");

    const payload = {
      name: formData.name,
      last_name: formData.last_name,
      dni: formData.dni,
      number: parseInt(formData.number) || 0,
      birth_date: formData.birth_date || null,
      photo_url: formData.photo_url,
      medical_fit: formData.medical_fit,
      category_id: categoriaSeleccionada.id, // Ya sabemos la categoría
      team_id: clubSeleccionado.id // Ya sabemos el club
    };

    let error;
    if (modoEdicionJugador && jugadoraCarnet?.id) {
       const res = await supabase.from('players').update(payload).eq('id', jugadoraCarnet.id).select();
       error = res.error;
       if(res.data) irAJugadores(categoriaSeleccionada); // Recargar lista
    } else {
       const res = await supabase.from('players').insert([payload]).select();
       error = res.error;
       if(res.data) setJugadores([...jugadores, { ...res.data[0], category: categoriaSeleccionada }]);
    }

    if (!error) cerrarModal();
    else alert("Error: " + error.message);
  }

  // --- HELPERS MODAL ---
  function prepararNuevoJugador() {
    setFormData({
      name: '', last_name: '', dni: '', number: '', birth_date: '', photo_url: '', medical_fit: false
    });
    setModoEdicionJugador(true);
    setJugadoraCarnet({});
  }

  function abrirCarnet(jugador: any) {
    setJugadoraCarnet(jugador);
    setModoEdicionJugador(false);
    setFormData({
      name: jugador.name, last_name: jugador.last_name || '', dni: jugador.dni || '',
      number: jugador.number, birth_date: jugador.birth_date || '', 
      photo_url: jugador.photo_url || '', medical_fit: jugador.medical_fit || false
    });
  }

  function cerrarModal() {
    setJugadoraCarnet(null);
    setModoEdicionJugador(false);
  }

  async function eliminarJugador(id: string) {
    if(!confirm("¿Eliminar?")) return;
    await supabase.from('players').delete().eq('id', id);
    setJugadores(jugadores.filter(j => j.id !== id));
    cerrarModal();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* =========================================================
            NIVEL 1: CLUBES (Raíz)
           ========================================================= */}
        {vista === 'clubes' && (
           <div className="animate-in fade-in duration-300">
             <div className="mb-8">
               <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                  <Shield className="text-blue-600" size={32} /> Clubes Afiliados
               </h1>
               <p className="text-slate-500 mt-1">Selecciona una institución para ver sus categorías.</p>
             </div>

             {loading ? <div className="text-center py-20 text-slate-400">Cargando...</div> : (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {equipos.map(equipo => (
                   <div 
                     key={equipo.id} 
                     onClick={() => irACategorias(equipo)}
                     className="bg-white rounded-3xl p-6 cursor-pointer border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 group text-center"
                   >
                     <div className="w-24 h-24 mx-auto bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-lg mb-4 group-hover:scale-110 transition-transform">
                        {equipo.logo_url ? (
                          <img src={equipo.logo_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-4xl font-black text-slate-300 group-hover:text-blue-500">{equipo.name.charAt(0)}</span>
                        )}
                     </div>
                     <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 truncate">{equipo.name}</h3>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

        {/* =========================================================
            NIVEL 2: CATEGORÍAS (Dentro del Club)
           ========================================================= */}
        {vista === 'categorias' && clubSeleccionado && (
           <div className="animate-in slide-in-from-right duration-300">
             <div className="flex items-center gap-4 mb-8">
               <button onClick={volverAtras} className="p-3 bg-white rounded-full border shadow-sm hover:bg-slate-100 text-slate-600"><ChevronLeft size={24}/></button>
               <div>
                  <h1 className="text-3xl font-black text-slate-800">{clubSeleccionado.name}</h1>
                  <p className="text-slate-500">Selecciona la categoría</p>
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {categorias.map(cat => (
                 <div 
                   key={cat.id} 
                   onClick={() => irAJugadores(cat)}
                   className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <Trophy size={24} />
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600">{cat.name}</h3>
                          <span className="text-xs text-slate-400">{cat.gender === 'female' ? 'Femenino' : 'Masculino'}</span>
                       </div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
                 </div>
               ))}
             </div>
           </div>
        )}

        {/* =========================================================
            NIVEL 3: JUGADORES (Dentro de la Categoría)
           ========================================================= */}
        {vista === 'jugadores' && clubSeleccionado && categoriaSeleccionada && (
           <div className="animate-in slide-in-from-right duration-300">
             
             {/* Header Navegación */}
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
               <div className="flex items-center gap-3">
                 <button onClick={volverAtras} className="p-3 bg-white rounded-full border shadow-sm hover:bg-slate-100 text-slate-600"><ChevronLeft size={24}/></button>
                 <div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-bold uppercase mb-1">
                       <span>{clubSeleccionado.name}</span>
                       <ChevronRight size={14}/>
                       <span className="text-blue-600">{categoriaSeleccionada.name}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800">Plantel de Jugadores</h1>
                 </div>
               </div>
               <button onClick={prepararNuevoJugador} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
                  <Plus size={20}/> Agregar Jugador
               </button>
             </div>

             {/* Grid Jugadores */}
             {loading ? <div className="text-center py-20 text-slate-400">Cargando plantel...</div> : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                 {jugadores.map(jugador => (
                   <div 
                     key={jugador.id} 
                     onClick={() => abrirCarnet(jugador)}
                     className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-lg cursor-pointer transition-all group flex items-center gap-4 relative overflow-hidden"
                   >
                     <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${jugador.medical_fit ? 'bg-green-500' : 'bg-red-500'}`}></div>
                     
                     <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-white shadow-md flex-shrink-0 overflow-hidden">
                        {jugador.photo_url ? (
                          <img src={jugador.photo_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={24}/></div>
                        )}
                     </div>

                     <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 text-lg leading-tight truncate group-hover:text-blue-600">
                          {jugador.last_name}
                        </h3>
                        <p className="text-sm font-medium text-slate-600 truncate">{jugador.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                           <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">#{jugador.number}</span>
                        </div>
                     </div>
                   </div>
                 ))}

                 {jugadores.length === 0 && (
                   <div className="col-span-3 py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <Users size={40} className="mx-auto text-slate-300 mb-2"/>
                      <p className="text-slate-500">No hay jugadores cargados en esta categoría aún.</p>
                   </div>
                 )}
               </div>
             )}
           </div>
        )}

      </div>

      {/* =========================================================
          MODAL: CARNET / FORMULARIO (Mismo de antes)
         ========================================================= */}
      {jugadoraCarnet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
           
           {!modoEdicionJugador ? (
             /* CARNET */
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative">
                <div className="h-28 bg-gradient-to-br from-slate-800 to-slate-900 relative p-6 flex justify-between items-start">
                   <div className="text-white/20"><CreditCard size={60}/></div>
                   {clubSeleccionado.logo_url && <img src={clubSeleccionado.logo_url} className="w-12 h-12 rounded-full border-2 border-white/20" />}
                </div>

                <div className="px-6 pb-6 -mt-12 relative">
                   <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-xl mb-4">
                      {jugadoraCarnet.photo_url ? (
                        <img src={jugadoraCarnet.photo_url} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center"><User size={30} className="text-slate-300"/></div>
                      )}
                   </div>

                   <div className="text-center mb-6">
                      <h2 className="text-2xl font-black text-slate-800 uppercase leading-none">{jugadoraCarnet.last_name}</h2>
                      <p className="text-lg font-medium text-slate-500">{jugadoraCarnet.name}</p>
                      <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                         {categoriaSeleccionada.name} • #{jugadoraCarnet.number}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">DNI</span>
                        <span className="font-mono font-bold text-slate-700">{jugadoraCarnet.dni || '-'}</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${jugadoraCarnet.medical_fit ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        <span className="text-[10px] font-bold uppercase block opacity-70">Apto Médico</span>
                        <span className="font-bold flex items-center gap-1 text-sm"><Activity size={14}/> {jugadoraCarnet.medical_fit ? 'AL DÍA' : 'VENCIDO'}</span>
                      </div>
                   </div>

                   <div className="flex gap-2">
                      <button onClick={() => setModoEdicionJugador(true)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-black transition">Editar</button>
                      <button onClick={cerrarModal} className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Cerrar</button>
                   </div>
                </div>
             </div>
           ) : (
             /* FORMULARIO */
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{jugadoraCarnet.id ? 'Editar Datos' : 'Alta en ' + categoriaSeleccionada.name}</h2>
                  <button onClick={() => jugadoraCarnet.id ? setModoEdicionJugador(false) : cerrarModal()} className="text-slate-400 hover:text-slate-600"><X/></button>
                </div>
                
                <form onSubmit={guardarJugador} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Apellido</label><input required className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.last_name} onChange={e=>setFormData({...formData, last_name:e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Nombre</label><input required className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/></div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">DNI</label><input className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.dni} onChange={e=>setFormData({...formData, dni:e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Camiseta #</label><input type="number" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.number} onChange={e=>setFormData({...formData, number:e.target.value})}/></div>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Fecha Nacimiento</label>
                      <input type="date" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.birth_date} onChange={e=>setFormData({...formData, birth_date:e.target.value})}/>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Foto URL</label>
                      <div className="flex gap-2">
                        <input placeholder="https://..." className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.photo_url} onChange={e=>setFormData({...formData, photo_url:e.target.value})}/>
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border">
                           {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover rounded-lg"/> : <Camera size={18}/>}
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <input type="checkbox" id="fit" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={formData.medical_fit} onChange={e=>setFormData({...formData, medical_fit:e.target.checked})}/>
                      <label htmlFor="fit" className="text-sm font-bold text-slate-700 cursor-pointer">Apto Médico vigente</label>
                   </div>

                   <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                      <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">Guardar</button>
                      {jugadoraCarnet.id && (
                        <button type="button" onClick={() => eliminarJugador(jugadoraCarnet.id)} className="px-4 border border-red-200 text-red-500 rounded-xl hover:bg-red-50"><Trash2 size={20}/></button>
                      )}
                   </div>
                </form>
             </div>
           )}

        </div>
      )}
    </div>
  );
}