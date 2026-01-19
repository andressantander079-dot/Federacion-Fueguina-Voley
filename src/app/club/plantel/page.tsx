// src/app/club/plantel/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, FolderPlus, Folder, ChevronRight, Save, Camera, FileText, Trash2, Home, Printer, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function PlantelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Datos
  const [teamId, setTeamId] = useState<string | null>(null);
  const [nombreEquipo, setNombreEquipo] = useState('');
  
  // Navegación
  const [vista, setVista] = useState<'categorias' | 'jugadores'>('categorias');
  const [categoriaActual, setCategoriaActual] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);

  // Formularios
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [mostrarFormJugador, setMostrarFormJugador] = useState(false);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  
  // Nuevo Jugador
  const [nuevoJugador, setNuevoJugador] = useState({
    name: '',
    dni: '',
    number: '',
    position: 'Universal',
    license_type: 'Jugador',
    photo_file: null as File | null,
    medical_file: null as File | null
  });
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // --- LÓGICA DE CARGA ---

  async function cargarDatosIniciales() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: perfil } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
      if (!perfil?.team_id) return router.push('/club/dashboard');

      setTeamId(perfil.team_id);

      const { data: equipo } = await supabase.from('teams').select('name').eq('id', perfil.team_id).single();
      if (equipo) setNombreEquipo(equipo.name);

      cargarCategorias(perfil.team_id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function cargarCategorias(idEquipo: string) {
    const { data } = await supabase.from('team_categories').select('*').eq('team_id', idEquipo).order('created_at');
    setCategorias(data || []);
  }

  async function crearCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaCategoria) return;
    setCreandoCategoria(true);
    try {
      const { data, error } = await supabase.from('team_categories').insert([{ team_id: teamId, name: nuevaCategoria }]).select().single();
      if (error) throw error;
      setNuevaCategoria('');
      cargarCategorias(teamId!);
      if (data) abrirCategoria(data);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCreandoCategoria(false);
    }
  }

  function abrirCategoria(cat: any) {
    setCategoriaActual(cat);
    setVista('jugadores');
    cargarJugadores(cat.id);
  }

  async function cargarJugadores(categoryId: string) {
    const { data } = await supabase.from('players').select('*').eq('category_id', categoryId).order('name');
    setJugadores(data || []);
  }

  // --- LÓGICA DE GUARDADO (MEJORADA) ---

  async function guardarJugador(e: React.FormEvent) {
    e.preventDefault();
    
    // 1. Validaciones básicas
    if (!nuevoJugador.dni || !nuevoJugador.name) return alert("Completa Nombre y DNI por favor.");
    if (!teamId || !categoriaActual?.id) return alert("Error interno: Falta ID de equipo o categoría.");

    setUploading(true);
    console.log("Iniciando guardado...");

    try {
      // 2. Verificar DNI duplicado
      const { data: rawData } = await supabase
        .from('players')
        .select(`team_id, teams (name)`)
        .eq('dni', nuevoJugador.dni)
        .single();
      
      const existe: any = rawData;

      if (existe && existe.team_id !== teamId) {
        const teamData = existe.teams;
        const nombreClub = Array.isArray(teamData) ? teamData[0]?.name : teamData?.name;
        if (!confirm(`⚠️ EL JUGADOR YA EXISTE.\nEste DNI ya está fichado en "${nombreClub}".\n\n¿Quieres continuar igual?`)) {
          setUploading(false);
          return;
        }
      }

      // 3. Subida de Archivos (Con manejo de errores individual)
      let photoUrl = null;
      if (nuevoJugador.photo_file) {
        console.log("Subiendo foto...");
        const fileName = `foto-${Date.now()}-${nuevoJugador.dni}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('player-photos')
          .upload(fileName, nuevoJugador.photo_file);
        
        if (uploadError) {
          console.error("Error subiendo foto:", uploadError);
          alert("Error al subir la foto. Verifica que sea una imagen (JPG/PNG).");
          throw uploadError;
        }
        
        const { data: publicUrlData } = supabase.storage.from('player-photos').getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      }

      let medicalUrl = null;
      if (nuevoJugador.medical_file) {
        console.log("Subiendo ficha médica...");
        const fileName = `medica-${Date.now()}-${nuevoJugador.dni}`;
        const { error: docError } = await supabase.storage
          .from('medical-docs')
          .upload(fileName, nuevoJugador.medical_file);
          
        if (docError) {
           console.error("Error subiendo ficha:", docError);
           alert("Error al subir la ficha médica.");
           throw docError;
        }
        
        const { data: docUrlData } = supabase.storage.from('medical-docs').getPublicUrl(fileName);
        medicalUrl = docUrlData.publicUrl;
      }

      // 4. Insertar en Base de Datos
      console.log("Insertando jugador en DB...");
      const { error: insertError } = await supabase.from('players').insert([{
        team_id: teamId,
        category_id: categoriaActual.id,
        name: nuevoJugador.name,
        dni: nuevoJugador.dni,
        number: nuevoJugador.number ? parseInt(nuevoJugador.number) : null,
        position: nuevoJugador.position,
        license_type: nuevoJugador.license_type,
        photo_url: photoUrl,
        medical_url: medicalUrl
      }]);

      if (insertError) {
        console.error("Error DB:", insertError);
        throw insertError;
      }

      // 5. Éxito
      alert("✅ Jugador inscripto correctamente.");
      setNuevoJugador({ name: '', dni: '', number: '', position: 'Universal', license_type: 'Jugador', photo_file: null, medical_file: null });
      setMostrarFormJugador(false);
      cargarJugadores(categoriaActual.id);

    } catch (error: any) {
      console.error("Error General:", error);
      alert("No se pudo guardar: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function borrarJugador(id: string) {
    if(!confirm("¿Eliminar jugador de la lista?")) return;
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (!error) cargarJugadores(categoriaActual.id);
  }

  // --- RENDER ---
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* BARRA SUPERIOR (MIGAS) */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-2 text-sm text-slate-500 sticky top-0 z-20 print:hidden">
        <Link href="/club/dashboard" className="flex items-center gap-1 hover:text-blue-600 font-medium">
          <Home size={14}/> Inicio
        </Link>
        <ChevronRight size={14}/>
        <span className={vista === 'categorias' ? 'font-bold text-slate-800' : 'hover:text-blue-600 cursor-pointer'} onClick={() => setVista('categorias')}>
          Plantel
        </span>
        {vista === 'jugadores' && (
          <>
            <ChevronRight size={14}/>
            <span className="font-bold text-slate-800 bg-blue-50 px-2 py-0.5 rounded text-xs uppercase">
              {categoriaActual?.name}
            </span>
          </>
        )}
      </div>

      <div className="p-6 max-w-6xl mx-auto print:p-0">
        
        {/* TITULO */}
        <div className="flex items-center justify-between mb-6 print:mb-4">
           <div className="flex items-center gap-4">
             {vista === 'jugadores' && (
               <button onClick={() => setVista('categorias')} className="p-2 bg-white border rounded-full hover:bg-slate-100 transition shadow-sm print:hidden">
                 <ArrowLeft size={20} className="text-slate-600"/>
               </button>
             )}
             <div>
               <h1 className="text-2xl font-black text-slate-800 print:text-xl">
                 {vista === 'categorias' ? 'Categorías' : `Plantel: ${categoriaActual?.name}`}
               </h1>
               <p className="text-slate-500 text-sm">Club: <span className="text-blue-600 font-bold">{nombreEquipo}</span></p>
             </div>
           </div>
           {vista === 'jugadores' && (
             <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-black transition print:hidden">
               <Printer size={18}/> Imprimir
             </button>
           )}
        </div>

        {/* VISTA 1: CATEGORÍAS */}
        {vista === 'categorias' && (
          <div className="space-y-6">
            <form onSubmit={crearCategoria} className="bg-white p-6 rounded-2xl shadow-sm border flex gap-4 items-end max-w-lg">
               <div className="flex-1">
                 <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nueva Categoría</label>
                 <input 
                   className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-600 outline-none font-bold text-slate-700 bg-transparent"
                   placeholder="Ej: Sub 14 Femenino"
                   value={nuevaCategoria}
                   onChange={e => setNuevaCategoria(e.target.value)}
                 />
               </div>
               <button disabled={creandoCategoria} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                 {creandoCategoria ? '...' : <FolderPlus size={20}/>}
               </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {categorias.map(cat => (
                 <div key={cat.id} onClick={() => abrirCategoria(cat)} className="bg-white p-6 rounded-2xl border hover:border-blue-400 hover:shadow-lg cursor-pointer transition flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                       <Folder size={28} className="text-slate-400 group-hover:text-blue-600 transition"/>
                       <h3 className="font-bold text-xl text-slate-700 group-hover:text-blue-600 transition">{cat.name}</h3>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-500"/>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* VISTA 2: JUGADORES */}
        {vista === 'jugadores' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
             
             {/* --- FORMULARIO CORREGIDO (CSS) --- */}
             <div className="lg:col-span-1 print:hidden">
                <button 
                  onClick={() => setMostrarFormJugador(!mostrarFormJugador)}
                  className={`w-full mb-4 py-3 rounded-xl font-bold transition flex justify-center gap-2 shadow-sm ${mostrarFormJugador ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <UserPlus size={20}/> {mostrarFormJugador ? 'Cerrar Formulario' : 'Inscribir Jugador'}
                </button>

                {mostrarFormJugador && (
                  <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={guardarJugador} className="flex flex-col gap-5">
                       
                       {/* FOTO */}
                       <div className="flex justify-center">
                          <label className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition overflow-hidden relative group">
                             {nuevoJugador.photo_file ? (
                               <img src={URL.createObjectURL(nuevoJugador.photo_file)} className="w-full h-full object-cover" />
                             ) : (
                               <>
                                 <Camera className="text-slate-400 group-hover:text-blue-500 mb-1"/>
                                 <span className="text-[10px] text-slate-400 font-bold uppercase group-hover:text-blue-500">Subir Foto</span>
                               </>
                             )}
                             <input type="file" accept="image/*" className="hidden" onChange={e => setNuevoJugador({...nuevoJugador, photo_file: e.target.files?.[0] || null})} />
                          </label>
                       </div>

                       {/* CAMPOS DE TEXTO (Separados para evitar superposición) */}
                       <div>
                         <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Completo</label>
                         <input 
                            className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" 
                            placeholder="Ej: Lionel Messi"
                            value={nuevoJugador.name} 
                            onChange={e => setNuevoJugador({...nuevoJugador, name: e.target.value})} 
                         />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">DNI (Sin puntos)</label>
                            <input 
                                className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                placeholder="12345678" 
                                value={nuevoJugador.dni} 
                                onChange={e => setNuevoJugador({...nuevoJugador, dni: e.target.value})} 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Camiseta N°</label>
                            <input 
                                type="number"
                                className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-center font-bold"
                                placeholder="10" 
                                value={nuevoJugador.number} 
                                onChange={e => setNuevoJugador({...nuevoJugador, number: e.target.value})} 
                            />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rol</label>
                            <select 
                                className="w-full border border-slate-300 p-3 rounded-lg outline-none bg-white focus:border-blue-500"
                                value={nuevoJugador.license_type} 
                                onChange={e => setNuevoJugador({...nuevoJugador, license_type: e.target.value})}
                            >
                               <option value="Jugador">Jugador/a</option>
                               <option value="DT">Entrenador (DT)</option>
                               <option value="Asistente">Asistente</option>
                            </select>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Posición</label>
                             <select 
                                className="w-full border border-slate-300 p-3 rounded-lg outline-none bg-white focus:border-blue-500"
                                value={nuevoJugador.position} 
                                onChange={e => setNuevoJugador({...nuevoJugador, position: e.target.value})}
                             >
                                <option value="Universal">Universal</option>
                                <option value="Armador">Armador</option>
                                <option value="Punta">Punta</option>
                                <option value="Central">Central</option>
                                <option value="Opuesto">Opuesto</option>
                                <option value="Libero">Líbero</option>
                             </select>
                          </div>
                       </div>

                       {/* FICHA MÉDICA */}
                       <div className="border border-slate-200 p-3 rounded-xl bg-slate-50">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Ficha Médica (PDF/Imagen)</label>
                          <input 
                             type="file" 
                             className="text-xs w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                             onChange={e => setNuevoJugador({...nuevoJugador, medical_file: e.target.files?.[0] || null})} 
                          />
                       </div>

                       <button 
                          disabled={uploading} 
                          className="bg-slate-900 text-white w-full py-4 rounded-xl font-bold hover:bg-black transition shadow-lg mt-2 flex justify-center items-center gap-2"
                       >
                          {uploading ? 'Guardando...' : <><Save size={18}/> Inscribir Ahora</>}
                       </button>

                    </form>
                  </div>
                )}
             </div>

             {/* LISTA DE JUGADORES */}
             <div className="lg:col-span-2 space-y-3 print:col-span-3 print:space-y-1">
                {jugadores.length === 0 ? (
                   <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                     <UserPlus className="mx-auto text-slate-300 mb-2" size={48}/>
                     <p className="text-slate-400 font-medium">No hay jugadores inscriptos aún.</p>
                   </div>
                ) : (
                   jugadores.map(j => (
                     <div key={j.id} className={`bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border border-slate-100 print:shadow-none print:mb-2 print:border-slate-300 print:break-inside-avoid`}>
                        
                        {/* Foto */}
                        <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                            {j.photo_url ? (
                                <img src={j.photo_url} className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><UserPlus size={18} className="text-slate-300"/></div>
                            )}
                        </div>

                        {/* Datos */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-slate-800 truncate">{j.name}</h3>
                              <span className="bg-slate-900 text-white text-xs font-black px-2 py-0.5 rounded ml-2 print:bg-white print:text-black print:border">
                                  {j.number ? `#${j.number}` : 'DT'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">DNI: {j.dni} • {j.position}</p>
                            
                            {/* Estados (Ocultos al imprimir) */}
                            <div className="flex gap-2 mt-1 print:hidden">
                                {!j.medical_url && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertCircle size={10}/> Falta Apto Médico</span>}
                                {j.medical_url && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={10}/> Habilitado</span>}
                            </div>
                        </div>

                        {/* Botones (Ocultos al imprimir) */}
                        <div className="flex flex-col gap-1 print:hidden">
                           {j.medical_url && (
                             <a href={j.medical_url} target="_blank" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver Ficha">
                               <FileText size={18}/>
                             </a>
                           )}
                           <button onClick={() => borrarJugador(j.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
                             <Trash2 size={18}/>
                           </button>
                        </div>
                     </div>
                   ))
                )}
             </div>

          </div>
        )}

      </div>
    </div>
  );
}