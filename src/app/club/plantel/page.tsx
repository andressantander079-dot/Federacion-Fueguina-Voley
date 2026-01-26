'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, FolderPlus, ChevronRight, Save, Camera, FileText, Trash2, AlertCircle, CheckCircle, Users, Shield, DollarSign } from 'lucide-react';

export default function PlantelPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos del Club Logueado
  const [teamId, setTeamId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [clubCity, setClubCity] = useState('Ushuaia'); // Simulamos ciudad

  // Estado de Vistas
  const [vista, setVista] = useState<'categorias' | 'jugadores'>('categorias');

  // Datos de Negocio
  const [squads, setSquads] = useState<any[]>([]);
  const [squadActual, setSquadActual] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [globalCategories, setGlobalCategories] = useState<any[]>([]);

  // Formularios
  const [creandoSquad, setCreandoSquad] = useState(false);
  const [mostrarFormJugador, setMostrarFormJugador] = useState(false); // No se usa en diseño nuevo (es modal o sidebar)

  // Nuevo Plantel Form
  const [nuevoSquad, setNuevoSquad] = useState({
    name: '',
    coach_name: '',
    category_id: ''
  });

  // Nuevo Jugador Form (Simple)
  const [nuevoJugador, setNuevoJugador] = useState({
    name: '',
    dni: '',
    number: '',
    position: 'Universal',
    license_type: 'Jugador',
    photo_file: null as File | null,
    medical_file: null as File | null,
    payment_file: null as File | null
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (mounted && currentSession) {
        await cargarDatosUsuario(currentSession.user);
      } else {
        setLoading(false);
        if (mounted) setError("No se detectó sesión. Intenta recargar.");
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (session && mounted) {
            setError(null);
            setLoading(true);
            await cargarDatosUsuario(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setError("Sesión cerrada.");
            setLoading(false);
          }
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    initAuth();
  }, []);

  async function cargarDatosUsuario(user: any) {
    try {
      // Cargar Categorias Globales primero para tener el map listo
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      setGlobalCategories(cats || []);

      const { data: perfil, error: perfilError } = await supabase
        .from('profiles')
        .select('club_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (perfilError) throw perfilError;

      if (!perfil?.club_id) {
        if (perfil?.role === 'admin') {
          setTeamId(null);
        } else {
          setLoading(false);
          return setError("🚫 Tu usuario no tiene un Club asignado. Contacta al administrador.");
        }
      } else {
        setTeamId(perfil.club_id);
      }

      setClubName(perfil.full_name || 'Mi Club');

      if (perfil.club_id) {
        await cargarSquads(perfil.club_id);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error cargando perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarSquads(idEquipo: string) {
    // Solución al error de relación: Traemos solo datos planos y mapeamos en cliente
    const { data } = await supabase
      .from('squads')
      .select('*')
      .eq('team_id', idEquipo)
      .order('created_at');

    setSquads(data || []);
  }

  // Helper para obtener nombre de categoría
  const getCategoryName = (id: string) => {
    return globalCategories.find(c => c.id === id)?.name || 'Sin Categoría';
  };

  async function crearSquad(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoSquad.name || !nuevoSquad.category_id) return alert("Completa todos los campos");

    let activeTeamId = teamId;

    // Failsafe: Si no hay teamId en estado, intentamos recuperarlo de la sesión
    if (!activeTeamId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fix: Use club_id as per schema
        const { user } = session; // Extract user
        const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
        if (profile?.club_id) {
          activeTeamId = profile.club_id;
          setTeamId(profile.club_id);
        }
      }
    }

    if (!activeTeamId) return alert("Error: No se ha detectado el ID del Club. Tu usuario podría no estar vinculado a un club.");

    setCreandoSquad(true);
    try {
      const { error } = await supabase.from('squads').insert([{
        team_id: activeTeamId,
        name: nuevoSquad.name,
        coach_name: nuevoSquad.coach_name,
        category_id: nuevoSquad.category_id
      }]);

      if (error) throw error;

      setNuevoSquad({ name: '', coach_name: '', category_id: '' });
      await cargarSquads(activeTeamId);
      (document.getElementById('dialog-new-squad') as HTMLDialogElement)?.close();
      alert("Plantel creado exitosamente.");

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCreandoSquad(false);
    }
  }

  function abrirSquad(squad: any) {
    // Inject category name
    const s = { ...squad, category_name: getCategoryName(squad.category_id) };
    setSquadActual(s);
    setVista('jugadores');
    cargarJugadores(squad.id);
  }

  async function cargarJugadores(squadId: string) {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('squad_id', squadId)
      .order('name');
    setJugadores(data || []);
  }

  // --- LÓGICA DE JUGADORES ---

  async function guardarJugador(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoJugador.dni || !nuevoJugador.name) return alert("Completa Nombre y DNI.");

    let activeTeamId = teamId;
    if (!activeTeamId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', session.user.id).single();
        if (profile?.club_id) activeTeamId = profile.club_id;
      }
    }

    if (!activeTeamId) return alert("Error crítico: No hay Club ID.");

    setUploading(true);
    try {
      let photoUrl = null;
      if (nuevoJugador.photo_file) {
        const fileName = `foto-${Date.now()}-${nuevoJugador.dni}`;
        await supabase.storage.from('player-photos').upload(fileName, nuevoJugador.photo_file);
        photoUrl = supabase.storage.from('player-photos').getPublicUrl(fileName).data.publicUrl;
      }

      // Lógica para comprobante de pago
      // (Asumiendo que hay un bucket o campo para esto, si no existe lo simulamos o agregamos placeholder)
      // Por ahora solo validamos que se haya cargado si es requerido, o lo subimos a un bucket genérico
      // TODO: Agregar bucket 'player-payments' si es necesario.

      let paymentUrl = null;
      if (nuevoJugador.payment_file) {
        const payFileName = `pago-${Date.now()}-${nuevoJugador.dni}`;
        // Usamos el mismo bucket de fotos por simplicidad o el de trámites
        await supabase.storage.from('procedure-files').upload(payFileName, nuevoJugador.payment_file);
        paymentUrl = supabase.storage.from('procedure-files').getPublicUrl(payFileName).data.publicUrl;
      }

      // ... resto de lógica de subida (docs) simplificada para demo

      const { error } = await supabase.from('players').insert([{
        team_id: activeTeamId,
        squad_id: squadActual.id,
        category_id: squadActual.category_id,
        name: nuevoJugador.name,
        dni: nuevoJugador.dni,
        number: nuevoJugador.number ? parseInt(nuevoJugador.number) : null,
        position: nuevoJugador.position,
        license_type: nuevoJugador.license_type,
        photo_url: photoUrl,
        // payment_url: paymentUrl // Pendiente de agregar a la tabla players si no existe
        // Por ahora lo dejamos comentado hasta confirmar schema, pero el input ya está.
      }]);

      if (error) throw error;

      alert("Jugador inscripto.");
      setNuevoJugador({ ...nuevoJugador, name: '', dni: '', photo_file: null });
      cargarJugadores(squadActual.id);

    } catch (error: any) {
      alert("Error guardando: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function borrarJugador(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from('players').delete().eq('id', id);
    cargarJugadores(squadActual.id);
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="animate-pulse flex flex-col items-center">
        <Shield size={48} className="text-zinc-800 mb-4" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Club...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl text-center max-w-md">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-zinc-400 mb-6">{error}</p>
        <Link href="/club" className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-zinc-200 transition">
          Volver al Panel
        </Link>
      </div>
    </div>
  );

  // --- RENDERIZADO ESTILO "CLUB CHICHA" ---

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white pb-20 selection:bg-orange-500 selection:text-white">

      {/* HEADER DE NAVEGACIÓN SIMPLE (Para volver) */}
      <div className="px-6 py-4 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/club" className="flex items-center gap-1 hover:text-white transition font-medium">
          <ChevronRight size={14} className="rotate-180" /> Volver a Clubes
        </Link>
      </div>

      <div className="p-6 md:p-12 max-w-7xl mx-auto">

        {/* ENCABEZADO CLUB */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl">
              <Shield size={48} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-2">
                {clubName}
              </h1>
              <p className="text-zinc-500 text-lg font-medium">{clubCity}</p>
            </div>
          </div>

          {vista === 'categorias' && (
            <button
              onClick={() => (document.getElementById('dialog-new-squad') as HTMLDialogElement)?.showModal()}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-orange-900/20 flex items-center gap-2 group"
            >
              <FolderPlus size={20} className="group-hover:scale-110 transition-transform" />
              Nuevo Plantel
            </button>
          )}
        </div>

        {/* VISTA 1: PLANTELES GRID */}
        {vista === 'categorias' && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Users className="text-zinc-600" />
              <h2 className="text-xl font-bold text-white">Planteles Activos</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {squads.map((squad) => {
                const catName = getCategoryName(squad.category_id);
                return (
                  <div
                    key={squad.id}
                    onClick={() => abrirSquad(squad)}
                    className="group bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-xl text-white group-hover:text-orange-500 transition-colors">
                          {clubName}
                        </h3>
                        <h4 className="font-bold text-xl text-white">
                          {catName}
                        </h4>
                        <p className="text-zinc-500 text-sm font-medium">{squad.name}</p>
                      </div>
                      <span className="bg-white text-zinc-900 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                        {catName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 mt-auto">
                      <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors mb-4">
                        <Users size={16} />
                        <span className="text-sm font-bold">Ver Jugadores</span>
                      </div>
                      <p className="text-xs text-zinc-600 font-mono">DT: {squad.coach_name || 'Sin asignar'}</p>
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {squads.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
                  <p className="text-zinc-500 font-medium">No tienes planteles creados.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: DETAIL JUGADORES + FORMULARIO SIDEBAR (Admin Style) */}
        {vista === 'jugadores' && squadActual && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">

            {/* Header Jugadores */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <span className="text-orange-500">{squadActual.category_name}</span>
                <span className="text-zinc-600">/</span>
                {squadActual.name}
              </h2>
              <button
                onClick={() => setVista('categorias')}
                className="text-zinc-400 hover:text-white font-bold text-sm px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800"
              >
                &larr; Volver
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* COLUMNA IZQUIERDA: LISTA */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-orange-500" />
                  <h3 className="font-bold text-lg">Lista de Buena Fe</h3>
                  <span className="bg-zinc-800 text-white text-xs px-2 py-0.5 rounded-full">{jugadores.length}</span>
                </div>

                {jugadores.length === 0 ? (
                  <div className="p-12 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
                    <p className="text-zinc-500 italic">No hay jugadores inscritos.</p>
                    <p className="text-zinc-600 text-sm">Completa el formulario de la derecha para agregar.</p>
                  </div>
                ) : (
                  jugadores.map((j) => (
                    <div key={j.id} className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-4 hover:border-zinc-700 transition group">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-black text-zinc-500 text-sm">
                        {j.number || '#'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{j.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>DNI {j.dni}</span>
                          <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                          <span>{j.position}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {j.medical_url && <span title="Apto Médico OK"><FileText size={16} className="text-green-500" /></span>}
                        {j.photo_url && <span title="Foto OK"><Camera size={16} className="text-blue-500" /></span>}
                      </div>
                      <button onClick={() => borrarJugador(j.id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* COLUMNA DERECHA: SIDEBAR FORM (Sticky) */}
              <div className="lg:col-span-1">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24 shadow-2xl shadow-black/50">
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-white">
                    <UserPlus className="text-orange-500" />
                    Nuevo Jugador
                  </h3>

                  <form onSubmit={guardarJugador} className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Dorsal</label>
                        <input
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-center font-bold text-white outline-none focus:border-orange-500 transition-colors"
                          placeholder="#"
                          value={nuevoJugador.number}
                          onChange={e => setNuevoJugador({ ...nuevoJugador, number: e.target.value })}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
                        <input
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                          placeholder="Apellido y Nombre"
                          value={nuevoJugador.name}
                          onChange={e => setNuevoJugador({ ...nuevoJugador, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">DNI (Sin Puntos)</label>
                      <input
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                        placeholder="Ej: 12345678"
                        value={nuevoJugador.dni}
                        onChange={e => setNuevoJugador({ ...nuevoJugador, dni: e.target.value })}
                      />
                    </div>

                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Documentación</p>

                      {/* Inputs de Archivo Estilizados */}
                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><Camera size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">Foto de Perfil</div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.photo_file ? nuevoJugador.photo_file.name : 'Subir JPG/PNG'}</div>
                        </div>
                        <input type="file" hidden accept="image/*" onChange={e => setNuevoJugador({ ...nuevoJugador, photo_file: e.target.files?.[0] || null })} />
                        {nuevoJugador.photo_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><FileText size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">Ficha Médica</div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.medical_file ? nuevoJugador.medical_file.name : 'Subir PDF'}</div>
                        </div>
                        <input type="file" hidden accept=".pdf,.jpg" onChange={e => setNuevoJugador({ ...nuevoJugador, medical_file: e.target.files?.[0] || null })} />
                        {nuevoJugador.medical_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><DollarSign size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">Pago Inscripción</div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.payment_file ? nuevoJugador.payment_file.name : 'Subir Comprobante'}</div>
                        </div>
                        <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => setNuevoJugador({ ...nuevoJugador, payment_file: e.target.files?.[0] || null })} />
                        {nuevoJugador.payment_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>
                    </div>

                    <button
                      disabled={uploading}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl mt-2 transition shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={18} />}
                      {uploading ? 'Guardando...' : 'Inscribir Jugador'}
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL NUEVO PLANTEL (Native Dialog) */}
      <dialog id="dialog-new-squad" className="bg-zinc-900 border border-zinc-800 text-white p-8 rounded-3xl shadow-2xl backdrop:bg-black/80 max-w-md w-full">
        <form onSubmit={(e) => { crearSquad(e); }}>
          <h3 className="text-2xl font-black mb-6">Nuevo Plantel</h3>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Categoría</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-600 font-bold"
                value={nuevoSquad.category_id}
                onChange={e => setNuevoSquad({ ...nuevoSquad, category_id: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {globalCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nombre Equipo (Ej: "A")</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-600 font-bold"
                value={nuevoSquad.name}
                onChange={e => setNuevoSquad({ ...nuevoSquad, name: e.target.value })}
                placeholder="Identificador"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Director Técnico</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-600 font-bold"
                value={nuevoSquad.coach_name}
                onChange={e => setNuevoSquad({ ...nuevoSquad, coach_name: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => (document.getElementById('dialog-new-squad') as HTMLDialogElement)?.close()} className="px-4 py-2 font-bold text-zinc-500 hover:text-white">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-white text-black font-black rounded-lg hover:bg-zinc-200">Crear</button>
          </div>
        </form>
      </dialog>



    </div>
  );
}