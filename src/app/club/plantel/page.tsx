'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, FolderPlus, ChevronRight, Save, Camera, FileText, Trash2, AlertCircle, CheckCircle, Users, Shield, DollarSign, Lock, Unlock, Plus, Trash, Search, Download, Eye, RefreshCw, X, Pencil, MapPin, Tag, ShieldCheck, Mail, Award, Calendar } from 'lucide-react';
import PinPadModal from '@/components/security/PinPadModal';
import EmptyState from '@/components/ui/EmptyState';
import { useClubAuth } from '@/hooks/useClubAuth';
import { toast } from 'sonner';

export default function PlantelPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos del Club Logueado
  const { clubId, profile, loading: authLoading, error: authError } = useClubAuth();

  const [clubName, setClubName] = useState('');
  const [clubCity, setClubCity] = useState('Ushuaia');
  const [hasPaidInscription, setHasPaidInscription] = useState(false);

  // Estado de Vistas
  const [vista, setVista] = useState<'squads' | 'jugadores' | 'documentacion'>('squads');

  // Datos de Negocio
  const [squads, setSquads] = useState<any[]>([]);
  const [squadActual, setSquadActual] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [globalCategories, setGlobalCategories] = useState<any[]>([]);

  // PIN Modal State
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    mode: 'set' | 'access' | 'remove';
    title: string;
    squad: any;
  }>({
    isOpen: false,
    mode: 'access',
    title: '',
    squad: null
  });

  // Formularios
  const [creandoSquad, setCreandoSquad] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Nuevo Plantel Form
  const [nuevoSquad, setNuevoSquad] = useState({
    name: '',
    coach_name: '',
    category_id: '',
    gender: 'Femenino'
  });

  // Nuevo Jugador Form
  const [nuevoJugador, setNuevoJugador] = useState({
    name: '',
    dni: '',
    birth_date: '',
    number: '',
    position: 'Universal',
    license_type: 'Jugador',
    photo_file: null as File | null,
    medical_file: null as File | null,
    payment_file: null as File | null,
    authorization_file: null as File | null
  });

  const isMinor = () => {
    if (!nuevoJugador.birth_date) return false;
    const today = new Date();
    const birthDate = new Date(nuevoJugador.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age < 18;
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  useEffect(() => {
    if (clubId) {
      cargarDatosClub(clubId);
    }
    if (authError) {
      setError(authError);
    }
  }, [clubId, authError]);

  async function cargarDatosClub(id: string) {
    try {
      setLoading(true);
      // Cargar Categorias Globales
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      setGlobalCategories(cats || []);

      if (profile?.full_name) setClubName(profile.full_name);

      // Fetch Logo and City from Teams table
      const { data: teamData } = await supabase.from('teams').select('shield_url, city, has_paid_inscription').eq('id', id).single();
      if (teamData) {
        if (teamData.shield_url) setClubLogo(teamData.shield_url);
        if (teamData.city) setClubCity(teamData.city);
        setHasPaidInscription(!!teamData.has_paid_inscription);
      }
      await cargarSquads(id);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error cargando perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!clubId) return toast.error("No se detectó el Club ID.");

    const file = e.target.files[0];
    setUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${clubId}-${Date.now()}.${fileExt}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage.from('club-logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('club-logos').getPublicUrl(fileName);

      // 3. Update Teams Table
      const { error: dbError } = await supabase.from('teams').update({ shield_url: publicUrl }).eq('id', clubId);
      if (dbError) throw dbError;

      setClubLogo(publicUrl);
      window.location.reload();

    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Error al subir el escudo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function cargarSquads(idEquipo: string) {
    const { data } = await supabase
      .from('squads')
      .select('*')
      .eq('team_id', idEquipo)
      .order('created_at');

    setSquads(data || []);
  }

  const getCategoryName = (id: string) => {
    return globalCategories.find(c => c.id === id)?.name || 'Sin Categoría';
  };

  async function crearSquad(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoSquad.name || !nuevoSquad.category_id) return toast.error("Completa todos los campos");

    if (!clubId) return toast.error("Error: No se ha detectado el ID del Club.");

    setCreandoSquad(true);
    try {
      const { error } = await supabase.from('squads').insert([{
        team_id: clubId,
        name: nuevoSquad.name,
        coach_name: nuevoSquad.coach_name,
        category_id: nuevoSquad.category_id,
        gender: nuevoSquad.gender
      }]);

      if (error) throw error;

      setNuevoSquad({ name: '', coach_name: '', category_id: '', gender: 'Femenino' });
      await cargarSquads(clubId);
      (document.getElementById('dialog-new-squad') as HTMLDialogElement)?.close();
      toast.success("Plantel creado exitosamente.");

    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setCreandoSquad(false);
    }
  }

  async function borrarSquad(id: string) {
    if (!confirm("¿Estás seguro de que quieres eliminar este plantel? Se borrarán todos los jugadores asociados.")) return;

    try {
      const { error } = await supabase.from('squads').delete().eq('id', id);
      if (error) throw error;

      toast.success("Plantel eliminado correctamente.");
      if (clubId) await cargarSquads(clubId);
    } catch (error: any) {
      toast.error("Error al eliminar el plantel: " + error.message);
    }
  }

  async function manejarPassword(e: React.MouseEvent, squad: any) {
    e.stopPropagation();
    if (squad.password) {
      setPinModal({
        isOpen: true,
        mode: 'remove',
        title: 'Eliminar Contraseña',
        squad: squad
      });
    } else {
      if (confirm(`¿Seguro quieres ponerle contraseña al plantel "${squad.name}"?`)) {
        setPinModal({
          isOpen: true,
          mode: 'set',
          title: 'Configurar Contraseña',
          squad: squad
        });
      }
    }
  }

  function abrirSquad(squad: any) {
    if (squad.password) {
      setPinModal({
        isOpen: true,
        mode: 'access',
        title: 'Acceso Protegido',
        squad: squad
      });
    } else {
      const s = { ...squad, category_name: getCategoryName(squad.category_id) };
      setSquadActual(s);
      setVista('jugadores');
      cargarJugadores(squad.id);
    }
  }

  async function onPinSuccess(pin: string) {
    if (!pinModal.squad) return;

    try {
      const newPin = pin === '' ? null : pin;
      const { error } = await supabase
        .from('squads')
        .update({ password: newPin })
        .eq('id', pinModal.squad.id);

      if (error) throw error;

      if (pinModal.mode === 'access') {
        const s = { ...pinModal.squad, category_name: getCategoryName(pinModal.squad.category_id) };
        setSquadActual(s);
        setVista('jugadores');
        cargarJugadores(pinModal.squad.id);
      } else {
        if (clubId) cargarSquads(clubId);
        // Si el modo era set/remove, el mensaje de éxito ya se mostró en el PinPadModal
      }
    } catch (err: any) {
      toast.error("Error al actualizar PIN: " + err.message);
    }
  }

  async function cargarJugadores(squadId: string) {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('squad_id', squadId)
      .order('name');
    setJugadores(data || []);
  }

  async function guardarJugador(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoJugador.dni || !nuevoJugador.name || !nuevoJugador.birth_date) return toast.error("Completa Nombre, DNI y Fecha de Nacimiento.");

    if (squadActual && squadActual.category_id) {
      const category = globalCategories.find(c => c.id === squadActual.category_id);
      if (category) {
        const birthYear = parseInt(nuevoJugador.birth_date.split('-')[0]);

        if (category.min_year && birthYear < category.min_year) {
          return toast.error(`JUGADOR NO HABILITADO: El año de nacimiento (${birthYear}) es menor al permitido para la categoría ${category.name} (Min: ${category.min_year})`);
        }
        if (category.max_year && birthYear > category.max_year) {
          return toast.error(`JUGADOR NO HABILITADO: El año de nacimiento (${birthYear}) es mayor al permitido para la categoría ${category.name} (Max: ${category.max_year})`);
        }
      }
    }

    if (!clubId) return toast.error("Error crítico: No hay Club ID.");

    if (isMinor() && !nuevoJugador.authorization_file) {
      return toast.error("El jugador es menor de edad. Debe adjuntar la Autorización de la Familia obligatoriamente.");
    }

    setUploading(true);
    try {
      // 1. DUPLICATE REGISTRATION CHECK
      const dniLimpio = nuevoJugador.dni.trim().replace(/\./g, '');
      const { data: existingPlayers, error: dupErr } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('dni', dniLimpio);

      let photoUrl = null;
      if (nuevoJugador.photo_file) {
        const fileExt = nuevoJugador.photo_file.name.split('.').pop();
        const fileName = `foto-${Date.now()}-${nuevoJugador.dni}.${fileExt}`;
        await supabase.storage.from('player-photos').upload(fileName, nuevoJugador.photo_file);
        photoUrl = supabase.storage.from('player-photos').getPublicUrl(fileName).data.publicUrl;
      }

      let paymentUrl = null;
      if (nuevoJugador.payment_file) {
        const fileExt = nuevoJugador.payment_file.name.split('.').pop();
        const payFileName = `pago-${Date.now()}-${nuevoJugador.dni}.${fileExt}`;
        await supabase.storage.from('procedure-files').upload(payFileName, nuevoJugador.payment_file);
        paymentUrl = supabase.storage.from('procedure-files').getPublicUrl(payFileName).data.publicUrl;
      }

      let medicalUrl = null;
      if (nuevoJugador.medical_file) {
        const fileExt = nuevoJugador.medical_file.name.split('.').pop();
        const medFileName = `medico-${Date.now()}-${nuevoJugador.dni}.${fileExt}`;
        await supabase.storage.from('procedure-files').upload(medFileName, nuevoJugador.medical_file);
        medicalUrl = supabase.storage.from('procedure-files').getPublicUrl(medFileName).data.publicUrl;
      }

      let authorizationUrl = null;
      if (nuevoJugador.authorization_file) {
        const fileExt = nuevoJugador.authorization_file.name.split('.').pop();
        const authFileName = `autorizacion-${Date.now()}-${nuevoJugador.dni}.${fileExt}`;
        await supabase.storage.from('procedure-files').upload(authFileName, nuevoJugador.authorization_file);
        authorizationUrl = supabase.storage.from('procedure-files').getPublicUrl(authFileName).data.publicUrl;
      }

      if (existingPlayers && existingPlayers.length > 0) {
        const conflict = existingPlayers[0];
        
        // IF player belongs to THIS club, we UPDATE them (useful for transferred players in limbo)
        if (conflict.team_id === clubId) {
          const { error: updateError } = await supabase.from('players').update({
            squad_id: squadActual.id,
            category_id: squadActual.category_id,
            name: nuevoJugador.name, // optionally update data if they typed it
            birth_date: nuevoJugador.birth_date,
            number: nuevoJugador.number ? parseInt(nuevoJugador.number) : null,
            position: nuevoJugador.position,
            // Only update files if they uploaded new ones during this step, otherwise keep old ones
            ...(photoUrl && { photo_url: photoUrl }),
            ...(paymentUrl && { payment_url: paymentUrl }),
            ...(medicalUrl && { medical_url: medicalUrl }),
            ...(authorizationUrl && { family_authorization_url: authorizationUrl }),
            status: 'pending' // Regresa a pending si se cambia su data
          }).eq('dni', dniLimpio);

          if (updateError) throw updateError;
          toast.success("Jugador reasignado. El pase federal ha sido completado y el jugador ya forma parte de este plantel.");
          setNuevoJugador({ ...nuevoJugador, name: '', dni: '', birth_date: '', photo_file: null, medical_file: null, payment_file: null, authorization_file: null });
          cargarJugadores(squadActual.id);
          setUploading(false);
          return;
        }

        setUploading(false);
        // @ts-ignore
        const conflictTeamName = conflict.teams ? (Array.isArray(conflict.teams) ? conflict.teams[0]?.name : conflict.teams.name) : 'la Federación';
        return toast.error(`ALERTA DE SISTEMA: El DNI ${dniLimpio} ya se encuentra registrado activamente en "${conflictTeamName}". NO PUEDE HABER DOS JUGADORES/AS CON EL MISMO DNI.`);
      }

      const { error } = await supabase.from('players').insert([{
        team_id: clubId,
        squad_id: squadActual.id,
        category_id: squadActual.category_id,
        name: nuevoJugador.name,
        dni: dniLimpio,
        birth_date: nuevoJugador.birth_date,
        number: nuevoJugador.number ? parseInt(nuevoJugador.number) : null,
        position: nuevoJugador.position,
        photo_url: photoUrl,
        payment_url: paymentUrl,
        medical_url: medicalUrl,
        family_authorization_url: authorizationUrl,
        status: 'pending' // Added pending status here, matching Plan.
      }]);

      if (error) throw error;

      toast.success("Jugador inscripto.");
      setNuevoJugador({ ...nuevoJugador, name: '', dni: '', birth_date: '', photo_file: null, medical_file: null, payment_file: null, authorization_file: null });
      cargarJugadores(squadActual.id);

    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("El jugador con ese DNI ya existe en los registros de la federación.");
      } else {
        toast.error("Error guardando: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  }

  async function borrarJugador(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from('players').delete().eq('id', id);
    cargarJugadores(squadActual.id);
  }

  if (authLoading || loading) return (
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

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white pb-20 selection:bg-orange-500 selection:text-white">

      <div className="px-6 py-4 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/club" className="flex items-center gap-1 hover:text-white transition font-medium">
          <ChevronRight size={14} className="rotate-180" /> Volver a Clubes
        </Link>
      </div>

      <div className="p-6 md:p-12 max-w-7xl mx-auto">

        {/* PIN PAD MODAL */}
        <PinPadModal
          isOpen={pinModal.isOpen}
          onClose={() => setPinModal(prev => ({ ...prev, isOpen: false }))}
          mode={pinModal.mode}
          title={pinModal.title}
          squadName={pinModal.squad?.name || ''}
          currentPin={pinModal.squad?.password}
          onSuccess={onPinSuccess}
          onSwitchMode={(mode) => setPinModal(prev => ({
            ...prev,
            mode,
            title: mode === 'remove' ? 'Eliminar Contraseña' : prev.title
          }))}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden cursor-pointer hover:border-orange-500 transition-colors relative"
              >
                {clubLogo ? (
                  <img src={clubLogo} alt="Escudo Club" className="w-full h-full object-cover" />
                ) : (
                  <Shield size={48} className="text-white" strokeWidth={1.5} />
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Editar</span>
                </div>
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*.jpg,image/*.png"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
              {uploadingLogo && (
                <div className="absolute -right-2 -top-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center animate-spin border-2 border-zinc-950">
                  <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full" />
                </div>
              )}
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-2">
                {clubName}
              </h1>
              <p className="text-zinc-500 text-lg font-medium">{clubCity}</p>
            </div>
          </div>

          {vista === 'squads' && (
            <div className="relative">
              {/* CARTEL FLOTANTE ANIMADO */}
              {!hasPaidInscription && !loading && (
                <div className="absolute -top-16 right-0 animate-bounce bg-yellow-400 text-yellow-900 px-4 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 whitespace-nowrap z-10 border border-yellow-500">
                  <AlertCircle size={16} /> ¡Falta Pago de Inscripción!
                  <div className="absolute -bottom-2 right-8 w-4 h-4 bg-yellow-400 rotate-45 border-r border-b border-yellow-500" />
                </div>
              )}

              <button
                disabled={!hasPaidInscription}
                onClick={() => (document.getElementById('dialog-new-squad') as HTMLDialogElement)?.showModal()}
                className={`px-6 py-3 rounded-xl font-bold transition shadow-lg flex items-center gap-2 group
                  ${hasPaidInscription ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20 cursor-pointer' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'}`}
                title={!hasPaidInscription ? 'Debes abonar la inscripción anual desde Trámites.' : ''}
              >
                <FolderPlus size={20} className={hasPaidInscription ? "group-hover:scale-110 transition-transform" : ""} />
                Nuevo Plantel
              </button>
            </div>
          )}
        </div>

        {vista === 'squads' && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Users className="text-zinc-600" />
              <h2 className="text-xl font-bold text-white">Planteles Activos</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {squads.map((squad) => {
                const catName = getCategoryName(squad.category_id);
                const isMale = squad.gender === 'Masculino';

                const cardClasses = isMale
                  ? "group bg-zinc-900 border-2 border-white rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/10 relative overflow-hidden"
                  : "group bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 relative overflow-hidden";

                return (
                  <div
                    key={squad.id}
                    onClick={() => abrirSquad(squad)}
                    className={cardClasses}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <h3 className={`font-extrabold text-xl transition-colors ${isMale ? 'text-white' : 'text-white group-hover:text-orange-500'}`}>
                          {clubName}
                        </h3>
                        <h4 className="font-bold text-xl text-white">
                          {catName}
                        </h4>
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-500 text-sm font-medium">{squad.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isMale ? 'bg-white text-black' : 'bg-pink-500/20 text-pink-500'}`}>
                            {squad.gender || 'Femenino'}
                          </span>
                        </div>
                      </div>
                      <span className="bg-white text-zinc-900 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                        {catName.split(' ')[0]}
                      </span>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 mt-auto flex justify-between items-center">
                      <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors">
                        <Users size={16} />
                        <span className="text-sm font-bold">Ver Jugadores</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => manejarPassword(e, squad)}
                          className={`p-2 rounded-lg transition ${squad.password ? 'text-amber-500 hover:bg-amber-500/10' : 'text-zinc-600 hover:text-amber-500 hover:bg-amber-500/10'}`}
                          title={squad.password ? "Cambiar/Quitar PIN" : "Proteger con PIN"}
                        >
                          {squad.password ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); borrarSquad(squad.id); }}
                          className="text-zinc-600 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition"
                          title="Eliminar Plantel"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600 font-mono">DT: {squad.coach_name || 'Sin asignar'}</div>
                  </div>
                );
              })}

              {squads.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
                  <p className="text-zinc-500 font-medium">No tienes planteles creados.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {vista === 'jugadores' && squadActual && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-xl md:text-3xl font-black text-white flex flex-wrap items-center gap-2 md:gap-3 leading-tight">
                <span className="text-orange-500">{squadActual.category_name}</span>
                <span className="text-zinc-600 hidden md:inline">/</span>
                <span className="w-full md:w-auto">{squadActual.name}</span>
              </h2>
              <button
                onClick={() => setVista('squads')}
                className="text-zinc-400 hover:text-white font-bold text-sm px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800"
              >
                &larr; Volver
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-orange-500" />
                  <h3 className="font-bold text-lg">Lista de Buena Fe</h3>
                  <span className="bg-zinc-800 text-white text-xs px-2 py-0.5 rounded-full">{jugadores.length}</span>
                </div>

                {jugadores.length === 0 ? (
                  <EmptyState
                    icon={<UserPlus size={48} />}
                    title="Plantel Vacío"
                    description={`No hay jugadores registrados en la categoría ${globalCategories.find((c: any) => c.id === squadActual.category_id)?.name || 'General'}. Añade el primer jugador para comenzar a competir.`}
                  />
                ) : (
                  jugadores.map((j) => (
                    <div
                      key={j.id}
                      onClick={() => {
                        if (j.status === 'pending') {
                          alert("Pendiente esperando la aprobación del administrador");
                        }
                      }}
                      className={`
                        border p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 transition group cursor-pointer relative overflow-hidden
                        ${j.status === 'pending'
                          ? 'bg-yellow-500/10 border-yellow-500/50 hover:bg-yellow-500/20'
                          : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                        }
                      `}
                    >
                      {j.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />}

                      <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-zinc-800 rounded-full flex items-center justify-center font-black text-zinc-500 text-xs md:text-sm">
                        {j.number || '#'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-sm md:text-base truncate leading-tight">{j.name}</h4>
                          {j.status === 'pending' && (
                            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-zinc-500 flex-wrap mt-1">
                          <span>DNI {j.dni}</span>
                          <span className="w-1 h-1 bg-zinc-700 rounded-full hidden md:block" />
                          <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{j.position}</span>
                          {j.birth_date && (
                            <span className="text-zinc-600">({j.birth_date.split('-')[0]})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 md:gap-2 shrink-0">
                        {j.medical_url && <span title="Apto Médico OK"><FileText size={16} className="text-green-500" /></span>}
                        {j.photo_url && <span title="Foto OK"><Camera size={16} className="text-blue-500" /></span>}
                        {j.family_authorization_url && <span title="Autorización Tutor OK"><ShieldCheck size={16} className="text-yellow-500" /></span>}
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); borrarJugador(j.id); }} className="p-2 md:p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-100 md:opacity-0 group-hover:opacity-100 z-10 shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">DNI (Sin Puntos)</label>
                        <input
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                          placeholder="Ej: 12345678"
                          value={nuevoJugador.dni}
                          onChange={e => setNuevoJugador({ ...nuevoJugador, dni: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Fecha Nacimiento</label>
                        <input
                          type="date"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                          value={nuevoJugador.birth_date}
                          onChange={e => setNuevoJugador({ ...nuevoJugador, birth_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Documentación</p>

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

                      {isMinor() && (
                        <label className="flex items-center gap-3 p-3 bg-yellow-950/20 hover:bg-yellow-900/40 border border-dashed border-yellow-700/50 rounded-xl cursor-pointer transition group">
                          <div className="p-2 bg-yellow-900/50 rounded-lg text-yellow-500"><ShieldCheck size={16} /></div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold text-yellow-500">Autorización Familia (Obligatorio)</div>
                            <div className="text-[10px] text-zinc-400 truncate">{nuevoJugador.authorization_file ? nuevoJugador.authorization_file.name : 'Subir PDF firmado'}</div>
                          </div>
                          <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => setNuevoJugador({ ...nuevoJugador, authorization_file: e.target.files?.[0] || null })} />
                          {nuevoJugador.authorization_file && <CheckCircle size={14} className="text-green-500" />}
                        </label>
                      )}
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
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Rama / Género</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-600 font-bold"
                value={nuevoSquad.gender}
                onChange={e => setNuevoSquad({ ...nuevoSquad, gender: e.target.value })}
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
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