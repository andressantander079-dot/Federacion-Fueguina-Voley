'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, FolderPlus, ChevronRight, Save, Camera, FileText, Trash2, AlertCircle, CheckCircle, Users, Shield, DollarSign, Lock, Unlock, Plus, Trash, Search, Download, Eye, RefreshCw, X, Pencil, MapPin, Tag, ShieldCheck, Mail, Award, Calendar, IdCard } from 'lucide-react';
import PinPadModal from '@/components/security/PinPadModal';
import EmptyState from '@/components/ui/EmptyState';
import { ProfileCropperModal } from '@/components/ui/ProfileCropperModal';
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
  const [coaches, setCoaches] = useState<any[]>([]);

  // Huerfanos State
  const [huerfanos, setHuerfanos] = useState<any[]>([]);
  const [isBannerMinimized, setIsBannerMinimized] = useState(false);
  const [asignarModal, setAsignarModal] = useState<{ isOpen: boolean, huerfano: any }>({ isOpen: false, huerfano: null });
  const [asignarSquadId, setAsignarSquadId] = useState('');

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

  // Editor states
  const [isEditingClubName, setIsEditingClubName] = useState(false);
  const [tempClubName, setTempClubName] = useState('');
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);
  const [tempSquadName, setTempSquadName] = useState('');

  // Logo Cropper States
  const [tempShieldSrc, setTempShieldSrc] = useState<string | null>(null);
  const [isCroppingShield, setIsCroppingShield] = useState(false);

  // Nuevo Jugador Form
  const [nuevoJugador, setNuevoJugador] = useState({
    name: '',
    dni: '',
    birth_date: '',
    number: '',
    position: 'Universal',
    gender: 'Femenino',
    license_type: 'Jugador',
    photo_file: null as File | null,
    dni_file: null as File | null,
    medical_file: null as File | null,
    payment_file: null as File | null,
    authorization_file: null as File | null
  });

  const isMinor = () => {
    if (!nuevoJugador.birth_date) return false;
    const currentYear = new Date().getFullYear();
    const birthYear = new Date(nuevoJugador.birth_date).getFullYear();
    const projectedAge = currentYear - birthYear; // Edad proyectada al 31 de Diciembre
    return projectedAge < 18;
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  // Profile Cropper States
  const [isCroppingPhoto, setIsCroppingPhoto] = useState(false);
  const [tempPhotoSrc, setTempPhotoSrc] = useState<string | null>(null);

  // Estados - ACTUALIZAR AVATAR LISTA
  const [avatarUploadTarget, setAvatarUploadTarget] = useState<any>(null);
  const [avatarCropper, setAvatarCropper] = useState<{ isOpen: boolean, tempUrl: string }>({ isOpen: false, tempUrl: '' });

  const checkFileSize = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`El archivo ${file.name} excede el límite de 10MB.`);
      return false;
    }
    return true;
  };

  const uploadFileAPI = async (file: File, bucketName: string, fileName: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('bucketName', bucketName);
    form.append('fileName', fileName);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error subiendo archivo seguro");
    }
    const { publicUrl } = await res.json();
    return publicUrl;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!checkFileSize(file)) {
        e.target.value = '';
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setTempPhotoSrc(imageUrl);
      setIsCroppingPhoto(true);
    }
    // reset input allows picking the same file again if canceled
    e.target.value = '';
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>, player: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!checkFileSize(file)) {
        e.target.value = '';
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setAvatarUploadTarget(player);
      setAvatarCropper({ isOpen: true, tempUrl: imageUrl });
    }
    e.target.value = '';
  };

  const handleAvatarCropComplete = async (croppedFile: File) => {
    if (!avatarUploadTarget) return;
    const toastId = toast.loading("Actualizando foto de perfil...");
    try {
      if (!clubId) throw new Error("No club_id found");
      const cleanFileName = croppedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const filePath = `${clubId}/${avatarUploadTarget.dni}/avatar_${Date.now()}_${cleanFileName}`;
      
      const publicUrl = await uploadFileAPI(croppedFile, 'public_avatars', filePath);
      
      const { error: updateErr } = await supabase.from('players').update({ photo_url: publicUrl }).eq('id', avatarUploadTarget.id);
      if (updateErr) throw updateErr;

      setJugadores(jugadores.map(j => j.id === avatarUploadTarget.id ? { ...j, photo_url: publicUrl } : j));
      toast.success("Foto actualizada exitosamente", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al actualizar la foto de perfil", { id: toastId });
    } finally {
      setAvatarCropper({ isOpen: false, tempUrl: '' });
      setAvatarCropper({ isOpen: false, tempUrl: '' });
      setAvatarUploadTarget(null);
    }
  };

  const handleMissingDocument = async (e: React.ChangeEvent<HTMLInputElement>, player: any, docType: 'medical_url' | 'payment_url' | 'family_authorization_url') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!checkFileSize(file)) {
      e.target.value = '';
      return;
    }

    const toastId = toast.loading("Subiendo documento...");
    try {
      if (!clubId) throw new Error("No club_id found");
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const filePath = `${clubId}/${player.dni}/${docType}_${Date.now()}_${cleanFileName}`;
      
      const newUrl = await uploadFileAPI(file, 'private_docs', filePath);
      
      const updates: any = { [docType]: newUrl };
      
      // Si es CEMAD, actualizamos el cemad_status también
      if (docType === 'medical_url') {
        updates.cemad_status = 'uploaded';
      }

      const { error: updateErr } = await supabase.from('players').update(updates).eq('id', player.id);
      if (updateErr) throw updateErr;

      setJugadores(jugadores.map(j => j.id === player.id ? { ...j, ...updates } : j));
      toast.success("Documento subido exitosamente", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al subir el documento", { id: toastId });
    } finally {
      e.target.value = '';
    }
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>, field: 'medical_file' | 'payment_file' | 'authorization_file' | 'dni_file') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (checkFileSize(file)) {
        setNuevoJugador(prev => ({ ...prev, [field]: file }));
      }
    }
    e.target.value = '';
  };

  const finalizeCrop = (croppedFile: File) => {
    setNuevoJugador(prev => ({ ...prev, photo_file: croppedFile }));
    setIsCroppingPhoto(false);
    if (tempPhotoSrc) URL.revokeObjectURL(tempPhotoSrc);
    setTempPhotoSrc(null);
  };

  const cancelCrop = () => {
    setIsCroppingPhoto(false);
    if (tempPhotoSrc) URL.revokeObjectURL(tempPhotoSrc);
    setTempPhotoSrc(null);
  };

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
      await cargarHuerfanos(id);
      await cargarCoaches(id);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error cargando perfil.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!clubId) return toast.error("No se detectó el Club ID.");

    const file = e.target.files[0];
    if (!checkFileSize(file)) {
      e.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setTempShieldSrc(imageUrl);
    setIsCroppingShield(true);
    e.target.value = '';
  }

  async function handleShieldCropComplete(croppedFile: File) {
    if (!clubId) return;
    setUploadingLogo(true);
    const toastId = toast.loading('Subiendo escudo circular...');

    setIsCroppingShield(false);
    if (tempShieldSrc) URL.revokeObjectURL(tempShieldSrc);
    setTempShieldSrc(null);

    try {
      const cleanExt = croppedFile.name.split('.').pop() || 'png';
      const cleanFileName = `logo-${clubId}-${Date.now()}.${cleanExt}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage.from('club-logos').upload(cleanFileName, croppedFile);
      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('club-logos').getPublicUrl(cleanFileName);

      // 3. Update Teams Table
      const { error: dbError } = await supabase.from('teams').update({ shield_url: publicUrl }).eq('id', clubId);
      if (dbError) throw dbError;

      setClubLogo(publicUrl);
      toast.success("Escudo actualizado correctamente", { id: toastId });

    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Error al subir el escudo: " + error.message, { id: toastId });
    } finally {
      setUploadingLogo(false);
    }
  }

  const saveClubName = async () => {
    if (!tempClubName.trim() || tempClubName === clubName) {
      setIsEditingClubName(false);
      return;
    }
    const toastId = toast.loading('Actualizando nombre del club...');
    try {
      const { error } = await supabase.from('teams').update({ name: tempClubName }).eq('id', clubId);
      if (error) throw error;
      setClubName(tempClubName);
      toast.success("Nombre actualizado", { id: toastId });
      setIsEditingClubName(false);
    } catch (error: any) {
      toast.error('Error al guardar nombre: ' + error.message, { id: toastId });
    }
  };

  const saveSquadName = async (squadId: string) => {
    if (!tempSquadName.trim()) {
      setEditingSquadId(null);
      return;
    }
    const toastId = toast.loading('Actualizando nombre del plantel...');
    try {
      const { error } = await supabase.from('squads').update({ name: tempSquadName }).eq('id', squadId);
      if (error) throw error;
      setSquads(squads.map(s => s.id === squadId ? { ...s, name: tempSquadName } : s));
      toast.success("Nombre de plantel actualizado", { id: toastId });
      setEditingSquadId(null);
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message, { id: toastId });
    }
  };

  async function cargarSquads(idEquipo: string) {
    const { data } = await supabase
      .from('squads')
      .select('*')
      .eq('team_id', idEquipo)
      .order('created_at');

    setSquads(data || []);
  }

  async function cargarHuerfanos(idEquipo: string) {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', idEquipo)
      .is('squad_id', null);
    setHuerfanos(data || []);
  }

  async function cargarCoaches(idEquipo: string) {
    const { data } = await supabase
      .from('coaches')
      .select('*')
      .eq('club_id', idEquipo)
      .eq('status', 'habilitado');
    setCoaches(data || []);
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

  async function handleAsignarHuerfano(e: React.FormEvent) {
    e.preventDefault();
    if (!asignarSquadId || !asignarModal.huerfano) return toast.error("Seleccione un plantel");

    try {
      setUploading(true);
      const { error } = await supabase.from('players').update({
        squad_id: asignarSquadId
      }).eq('id', asignarModal.huerfano.id);

      if (error) throw error;
      toast.success("Jugador asignado al plantel exitosamente.");

      setAsignarModal({ isOpen: false, huerfano: null });
      setAsignarSquadId('');
      if (clubId) await cargarHuerfanos(clubId);
      if (squadActual && squadActual.id === asignarSquadId) {
        cargarJugadores(asignarSquadId);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
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

      // Only Check mandatory fields
      if (!nuevoJugador.dni_file) {
        setUploading(false);
        return toast.error("El Documento DNI (foto del frente y dorso o PDF) es obligatorio.");
      }
      if (!nuevoJugador.payment_file) {
        setUploading(false);
        return toast.error("El Comprobante de Pago es obligatorio.");
      }
      // CEMAD is optional here!

      let photoUrl = null;
      if (nuevoJugador.photo_file) {
        const fileExt = nuevoJugador.photo_file.name.split('.').pop();
        const fileName = `${clubId}/${nuevoJugador.dni}/avatar-${Date.now()}.${fileExt}`;
        photoUrl = await uploadFileAPI(nuevoJugador.photo_file, 'public_avatars', fileName);
      }

      let dniUrl = null;
      if (nuevoJugador.dni_file) {
        const fileExt = nuevoJugador.dni_file.name.split('.').pop();
        const dniFileName = `${clubId}/${nuevoJugador.dni}/dni-${Date.now()}.${fileExt}`;
        dniUrl = await uploadFileAPI(nuevoJugador.dni_file, 'private_docs', dniFileName);
      }

      let paymentUrl = null;
      if (nuevoJugador.payment_file) {
        const fileExt = nuevoJugador.payment_file.name.split('.').pop();
        const payFileName = `${clubId}/${nuevoJugador.dni}/pago-${Date.now()}.${fileExt}`;
        paymentUrl = await uploadFileAPI(nuevoJugador.payment_file, 'private_docs', payFileName);
      }

      let medicalUrl = null;
      let cemadPendiente = true;
      let cemadStatus = 'unsubmitted';

      if (nuevoJugador.medical_file) {
        const fileExt = nuevoJugador.medical_file.name.split('.').pop();
        const medFileName = `${clubId}/${nuevoJugador.dni}/medico-${Date.now()}.${fileExt}`;
        medicalUrl = await uploadFileAPI(nuevoJugador.medical_file, 'private_docs', medFileName);
        cemadPendiente = false;
        cemadStatus = 'uploaded';
      }

      let authorizationUrl = null;
      if (nuevoJugador.authorization_file) {
        const fileExt = nuevoJugador.authorization_file.name.split('.').pop();
        const authFileName = `${clubId}/${nuevoJugador.dni}/autorizacion-${Date.now()}.${fileExt}`;
        authorizationUrl = await uploadFileAPI(nuevoJugador.authorization_file, 'private_docs', authFileName);
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
            ...(dniUrl && { dni_url: dniUrl }),
            ...(paymentUrl && { payment_url: paymentUrl }),
            ...(medicalUrl && { medical_url: medicalUrl }),
            ...(authorizationUrl && { family_authorization_url: authorizationUrl }),
            cemad_pendiente: cemadPendiente, // update cemad logic
            cemad_status: cemadStatus,
            status: 'pending' // Regresa a pending si se cambia su data
          }).eq('dni', dniLimpio);

          if (updateError) throw updateError;
          toast.success("Jugador reasignado. El pase federal ha sido completado y el jugador ya forma parte de este plantel.");
          setNuevoJugador({ ...nuevoJugador, name: '', dni: '', birth_date: '', gender: 'Femenino', photo_file: null, dni_file: null, medical_file: null, payment_file: null, authorization_file: null });
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
        gender: nuevoJugador.gender,
        photo_url: photoUrl,
        dni_url: dniUrl,
        payment_url: paymentUrl,
        medical_url: medicalUrl,
        family_authorization_url: authorizationUrl,
        cemad_pendiente: cemadPendiente,
        cemad_status: cemadStatus,
        status: 'pending' // Added pending status here, matching Plan.
      }]);

      if (error) throw error;

      toast.success("Jugador inscripto.");
      setNuevoJugador({ ...nuevoJugador, name: '', dni: '', birth_date: '', gender: 'Femenino', photo_file: null, dni_file: null, medical_file: null, payment_file: null, authorization_file: null });
      cargarJugadores(squadActual.id);

    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("El jugador con ese DNI ya existe en los registros de la federación.");
      } else if (error.message?.includes('GENDER_MISMATCH')) {
        toast.error("❌ ERROR DENEGADO: El género seleccionado para el jugador no coincide con el del plantel oficial (Femenino/Masculino).");
      } else {
        toast.error("Error guardando: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  }

  async function borrarJugador(id: string) {
    if (!confirm("¿Eliminar definitivamente este jugador y sus anexos?")) return;
    try {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      toast.success("Ficha del jugador eliminada de la base de datos.");
    } catch (err: any) {
      console.error("Delete Error:", err);
      if (err.code === '23503') { // Foreign Key Violation
        toast.error("El jugador no puede ser eliminado porque tiene un trámite de pase FVF asociado. Primero cancele el pase.");
      } else {
        toast.error("El sistema bloqueó el borrado: " + err.message);
      }
    } finally {
      if (squadActual) cargarJugadores(squadActual.id);
    }
  }

  const handleDeferredCemad = async (e: React.ChangeEvent<HTMLInputElement>, player: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El CEMAD excede el límite de 10MB.');
      e.target.value = '';
      return;
    }

    const toastId = toast.loading('Subiendo CEMAD pendiente...');
    try {
      const fileExt = file.name.split('.').pop();
      const medFileName = `${clubId}/${player.dni}/medico-diferido-${Date.now()}.${fileExt}`;
      const medicalUrl = await uploadFileAPI(file, 'private_docs', medFileName);

      const { error } = await supabase.from('players').update({
        medical_url: medicalUrl,
        cemad_status: 'uploaded'
      }).eq('id', player.id);

      if (error) throw error;
      toast.success('CEMAD subido. Ahora está en revisión.', { id: toastId });
      if (squadActual) cargarJugadores(squadActual.id);
    } catch (err: any) {
      toast.error('Error al subir: ' + err.message, { id: toastId });
    }
  };

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

        {/* BANNER HUERFANOS */}
        {huerfanos.length > 0 && vista === 'squads' && (
          <div className="mb-8 border border-red-500/50 bg-red-950/20 rounded-2xl shadow-lg border-l-4 border-l-red-500 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-4 flex items-center justify-between bg-red-900/40">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-500" />
                <h3 className="text-white font-bold">Tienes {huerfanos.length} jugador(es) pendiente(s) de asignación</h3>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:block">Acción Requerida</span>
              </div>
              <button onClick={() => setIsBannerMinimized(!isBannerMinimized)} className="p-2 text-zinc-400 hover:text-white transition">
                <ChevronRight className={`transform transition-transform ${isBannerMinimized ? 'rotate-90' : '-rotate-90'}`} />
              </button>
            </div>

            {!isBannerMinimized && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-zinc-950/50">
                {huerfanos.map(h => (
                  <div key={h.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center group">
                    <div>
                      <div className="font-bold text-white flex gap-2 items-center text-sm">
                        {h.name}
                        {h.has_debt && <span title="Inhabilitado por deudas transferidas"><Lock size={12} className="text-red-500" /></span>}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1 flex items-center gap-1">
                        Sugerido: <span className="text-orange-500 font-black bg-orange-500/10 px-1 rounded">{getCategoryName(h.category_id)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAsignarModal({ isOpen: true, huerfano: h })}
                      className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition shadow-lg shrink-0"
                    >
                      Asignar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-6">
            <div className="relative group w-24 h-24 shrink-0 cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
              <div
                className="w-full h-full bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center shadow-2xl overflow-hidden hover:border-orange-500 transition-colors relative"
              >
                {clubLogo ? (
                  <img src={clubLogo} alt="Escudo Club" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Shield size={48} className="text-zinc-700" strokeWidth={1} />
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10">
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider text-center px-1">Cambiar<br/>Escudo</span>
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

            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                {isEditingClubName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="text-3xl md:text-5xl font-black text-white bg-zinc-900 border-b-2 border-orange-500 outline-none w-full max-w-[400px] px-2 py-1"
                      value={tempClubName}
                      onChange={(e) => setTempClubName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveClubName()}
                      autoFocus
                    />
                    <button onClick={saveClubName} className="p-2 text-white bg-green-600 rounded-lg shrink-0"><CheckCircle size={20}/></button>
                    <button onClick={() => setIsEditingClubName(false)} className="p-2 text-white bg-red-600 rounded-lg shrink-0"><X size={20}/></button>
                  </div>
                ) : (
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none group relative pr-8 flex items-center">
                    {clubName}
                    <button 
                      onClick={() => { setTempClubName(clubName); setIsEditingClubName(true); }}
                      className="text-zinc-600 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 ml-2"
                      title="Renombrar club"
                    >
                      <Pencil size={20} />
                    </button>
                  </h1>
                )}
              </div>
              <p className="text-zinc-500 text-lg font-medium">{clubCity}</p>
            </div>
          </div>

          {vista === 'squads' && (
            <div className="relative flex items-center gap-4">
              {/* CARTEL FLOTANTE ANIMADO */}
              {!hasPaidInscription && !loading && (
                <div className="absolute -top-16 right-0 animate-bounce bg-yellow-400 text-yellow-900 px-4 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 whitespace-nowrap z-10 border border-yellow-500">
                  <AlertCircle size={16} /> ¡Falta Pago de Inscripción!
                  <div className="absolute -bottom-2 right-8 w-4 h-4 bg-yellow-400 rotate-45 border-r border-b border-yellow-500" />
                </div>
              )}

              <Link
                href="/club/equipos/tecnicos"
                className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white font-bold transition shadow-lg rounded-xl flex items-center gap-2 group"
              >
                Cuerpo Técnico
              </Link>

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
                  ? "group bg-zinc-900 border-2 border-white rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/10 relative overflow-hidden flex flex-col h-full"
                  : "group bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 relative overflow-hidden flex flex-col h-full";

                return (
                  <div
                    key={squad.id}
                    className={cardClasses}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                    
                    <div className="flex justify-between items-start mb-4">
                      {editingSquadId === squad.id ? (
                          <div className="flex items-center gap-1 w-full max-w-[80%]">
                              <input
                                  type="text"
                                  autoFocus
                                  value={tempSquadName}
                                  onChange={e => setTempSquadName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && saveSquadName(squad.id)}
                                  className="text-sm font-bold text-white bg-zinc-800 border-b-2 border-orange-500 outline-none w-full px-1 py-1"
                              />
                              <button onClick={() => saveSquadName(squad.id)} className="text-green-500 hover:text-green-400 p-1 shrink-0"><CheckCircle size={16}/></button>
                              <button onClick={() => setEditingSquadId(null)} className="text-red-500 hover:text-red-400 p-1 shrink-0"><X size={16}/></button>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2 group/title max-w-[80%]">
                            <h3 className="text-xl font-bold text-white tracking-tight break-words uppercase flex items-center gap-2 truncate" onClick={() => abrirSquad(squad)}>
                              {squad.name}
                            </h3>
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTempSquadName(squad.name); setEditingSquadId(squad.id); }}
                                className="text-zinc-600 hover:text-orange-500 opacity-0 group-hover/title:opacity-100 transition-opacity p-1 shrink-0"
                                title="Renombrar plantel"
                            >
                                <Pencil size={14} />
                            </button>
                          </div>
                      )}
                      
                      <div className="bg-zinc-950 p-2 rounded-xl group-hover:bg-orange-500 transition-colors shrink-0" onClick={() => abrirSquad(squad)}>
                        <Users className="text-zinc-500 group-hover:text-white transition-colors" size={20} />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                      <div className="space-y-1">
                        <h3 className={`font-extrabold text-xl transition-colors ${isMale ? 'text-white' : 'text-white group-hover:text-orange-500'}`}>
                          {clubName}
                        </h3>
                        <h4 className="font-bold text-xl text-white">
                          {catName}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isMale ? 'bg-white text-black' : 'bg-pink-500/20 text-pink-500'}`}>
                            {squad.gender || 'Femenino'}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 self-end sm:self-auto bg-white text-zinc-900 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
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
                        } else if (j.status === 'rejected') {
                          alert(`JUGADOR OBSERVADO POR FVF: ${j.rejection_reason || 'Debe eliminar el jugador y volver a cargar la documentación requerida.'}`);
                        }
                      }}
                      className={`
                        border p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 transition group relative overflow-hidden
                        ${j.status === 'pending'
                          ? 'bg-yellow-500/10 border-yellow-500/50 hover:bg-yellow-500/20 cursor-pointer'
                          : j.status === 'rejected'
                            ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20 cursor-pointer'
                            : j.has_debt
                              ? 'bg-zinc-900/50 border-red-900/50 hover:border-red-500/50 opacity-80 cursor-default' /* DEUDA VISUAL */
                              : (j.status === 'active' && j.cemad_pendiente === true)
                                ? `bg-zinc-900 border-orange-500 hover:border-orange-400 cursor-default shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-2 ${j.cemad_status === 'uploaded' ? 'ring-yellow-500' : j.cemad_status === 'rejected' ? 'ring-red-500 animate-pulse' : 'ring-orange-500 animate-pulse'}`
                                : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 cursor-default'
                        }
                      `}
                    >
                      {j.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />}
                      {j.status === 'rejected' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />}

                      <label 
                        className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-zinc-800 rounded-full flex items-center justify-center font-black text-white text-xs md:text-sm cursor-pointer hover:bg-zinc-700 transition group/avatar relative overflow-hidden ring-1 ring-zinc-700 shrink-0" 
                        title="Actualizar Foto de Perfil"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="file" hidden accept="image/*" onChange={(e) => handleAvatarSelect(e, j)} />
                        {j.photo_url ? (
                           <img src={j.photo_url} className="w-full h-full object-cover group-hover/avatar:opacity-30 transition-opacity" alt={j.name} />
                        ) : (
                           <span className="group-hover/avatar:opacity-0 text-zinc-500 transition-opacity">{j.number || '#'}</span>
                        )}
                        <Camera size={16} className={`absolute text-white ${j.photo_url ? 'opacity-0 group-hover/avatar:opacity-100 transition-opacity' : 'opacity-0 group-hover/avatar:opacity-100 transition-opacity'}`} />
                      </label>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-sm md:text-base truncate leading-tight flex items-center gap-2 ${j.status === 'rejected' ? 'text-red-400 line-through opacity-70' : 'text-white'}`}>
                            {j.name}
                            {j.has_debt && <span title="Inhabilitado para competir por deudas"><Lock size={14} className="text-red-500" /></span>}
                          </h4>
                          {j.has_debt && (
                            <span className="text-[10px] font-bold border border-red-500/50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                              Deuda
                            </span>
                          )}
                          {j.status === 'active' && j.cemad_pendiente === true && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-sm ${j.cemad_status === 'uploaded' ? 'bg-yellow-500/20 text-yellow-500' : j.cemad_status === 'rejected' ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500/20 text-orange-500'}`} title={j.cemad_status === 'rejected' ? (j.rejection_reason || 'Rechazado') : ''}>
                              {j.cemad_status === 'uploaded' ? 'CEMAD en Revisión' : j.cemad_status === 'rejected' ? 'CEMAD Rechazado (Reintentar)' : 'Habilitado pero Falta CEMAD'}
                            </span>
                          )}
                          {j.status === 'pending' && (
                            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                              Pendiente
                            </span>
                          )}
                          {j.status === 'rejected' && (
                            <span className="text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 animate-pulse" title={j.rejection_reason || 'Rechazado'}>
                              Observado (Click para ver motivo)
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
                      <div className="flex gap-1 md:gap-2 items-center justify-end shrink-0">
                        {/* Botón CEMAD diferido o Faltante */}
                        {((j.status === 'active' && j.cemad_pendiente === true && j.cemad_status !== 'uploaded') || ((j.status === 'pending' || j.status === 'rejected') && !j.medical_url)) && (
                           <label className="cursor-pointer bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-lg transition mr-1 shadow-[0_0_10px_rgba(234,88,12,0.5)] flex items-center gap-1" title="Subir Alta Médica (CEMAD)">
                              <input type="file" hidden accept=".pdf,.jpg,.png" onChange={(e) => handleMissingDocument(e, j, 'medical_url')} />
                              <Plus size={16} className="shrink-0" /> <FileText size={16} className="hidden md:block shrink-0" />
                           </label>
                        )}
                        {/* Botón Autorización Familiar Faltante (Solo si es pendiente/rechazado y no la tiene) */}
                        {((j.status === 'pending' || j.status === 'rejected') && !j.family_authorization_url) && (
                           <label className="cursor-pointer bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded-lg transition mr-1 shadow-[0_0_10px_rgba(202,138,4,0.5)] flex items-center gap-1" title="Subir Autorización Tutor">
                              <input type="file" hidden accept=".pdf,.jpg,.png" onChange={(e) => handleMissingDocument(e, j, 'family_authorization_url')} />
                              <Plus size={16} className="shrink-0" /> <ShieldCheck size={16} className="hidden md:block shrink-0" />
                           </label>
                        )}
                        {/* Botón Comprobante Faltante */}
                        {((j.status === 'pending' || j.status === 'rejected') && !j.payment_url) && (
                           <label className="cursor-pointer bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition mr-1 shadow-[0_0_10px_rgba(22,163,74,0.5)] flex items-center gap-1" title="Subir Comprobante de Pago">
                              <input type="file" hidden accept=".pdf,.jpg,.png" onChange={(e) => handleMissingDocument(e, j, 'payment_url')} />
                              <Plus size={16} className="shrink-0" /> <DollarSign size={16} className="hidden md:block shrink-0" />
                           </label>
                        )}
                        {/* Botón DNI Faltante */}
                        {((j.status === 'pending' || j.status === 'rejected') && !j.dni_url) && (
                           <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition mr-1 shadow-[0_0_10px_rgba(37,99,235,0.5)] flex items-center gap-1" title="Subir Documento DNI">
                              <input type="file" hidden accept=".pdf,.jpg,.png" onChange={(e) => handleMissingDocument(e, j, 'dni_url' as any)} />
                              <Plus size={16} className="shrink-0" /> <IdCard size={16} className="hidden md:block shrink-0" />
                           </label>
                        )}

                        {j.medical_url && j.cemad_pendiente !== true && <span title="Apto Médico OK"><FileText size={16} className="text-green-500" /></span>}
                        {j.dni_url ? <span title="DNI Subido"><IdCard size={16} className="text-blue-500" /></span> : <span title="Falta DNI"><IdCard size={16} className="text-zinc-600" /></span>}
                        {j.photo_url && <span title="Foto de Perfil OK"><Camera size={16} className="text-blue-400" /></span>}
                        {j.family_authorization_url && <span title="Autorización Tutor OK"><ShieldCheck size={16} className="text-yellow-500" /></span>}
                        {j.payment_url && <span title="Comprobante OK"><DollarSign size={16} className="text-green-500" /></span>}
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
                          required
                          type="number"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-center font-bold text-white outline-none focus:border-orange-500 transition-colors"
                          placeholder="#"
                          value={nuevoJugador.number}
                          onChange={e => setNuevoJugador({ ...nuevoJugador, number: e.target.value })}
                        />
                      </div>
                      <div className="col-span-3 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
                        <input
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                          placeholder="Apellido y Nombre"
                          value={nuevoJugador.name}
                          onChange={e => setNuevoJugador({ ...nuevoJugador, name: e.target.value })}
                        />
                      </div>
                      <div className="col-span-4 lg:col-span-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Género</label>
                        <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 relative h-[42px]">
                          <div 
                              className={`absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800 rounded-md transition-all duration-300 ease-out`}
                              style={{ left: nuevoJugador.gender === 'Femenino' ? '4px' : 'calc(50%)' }}
                          />
                          <button
                            type="button"
                            onClick={() => setNuevoJugador({ ...nuevoJugador, gender: 'Femenino' })}
                            className={`flex-1 text-xs font-bold relative z-10 transition-colors ${nuevoJugador.gender === 'Femenino' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                            Fem
                          </button>
                          <button
                            type="button"
                            onClick={() => setNuevoJugador({ ...nuevoJugador, gender: 'Masculino' })}
                            className={`flex-1 text-xs font-bold relative z-10 transition-colors ${nuevoJugador.gender === 'Masculino' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                            Masc
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">DNI (Sin Puntos)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                          placeholder="Ej: 12345678"
                          value={nuevoJugador.dni}
                          onChange={e => {
                            const cleanValue = e.target.value.replace(/[^0-9]/g, '');
                            setNuevoJugador({ ...nuevoJugador, dni: cleanValue });
                          }}
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
                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><IdCard size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">Documento DNI <span className="text-red-500">*</span></div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.dni_file ? nuevoJugador.dni_file.name : 'Subir PDF/JPG (Obligatorio)'}</div>
                        </div>
                        <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => handleDocumentSelect(e, 'dni_file')} />
                        {nuevoJugador.dni_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><Camera size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">Foto de Perfil <span className="text-zinc-500 font-normal text-[10px]">(Opcional)</span></div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.photo_file ? nuevoJugador.photo_file.name : 'Click para Avatar'}</div>
                        </div>
                        <input type="file" hidden accept="image/*" onChange={handlePhotoSelect} />
                        {nuevoJugador.photo_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><FileText size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">CEMAD (Alta Médica) <span className="text-zinc-500 font-normal text-[10px]">(Opcional ahora)</span></div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.medical_file ? nuevoJugador.medical_file.name : 'Subir PDF/JPG'}</div>
                        </div>
                        <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => handleDocumentSelect(e, 'medical_file')} />
                        {nuevoJugador.medical_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><DollarSign size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-zinc-300">Comprobante Pago <span className="text-red-500">*</span></div>
                          <div className="text-[10px] text-zinc-500 truncate">{nuevoJugador.payment_file ? nuevoJugador.payment_file.name : 'Subir PDF/JPG'}</div>
                        </div>
                        <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => handleDocumentSelect(e, 'payment_file')} />
                        {nuevoJugador.payment_file && <CheckCircle size={14} className="text-green-500" />}
                      </label>

                      {isMinor() && (
                        <label className="flex items-center gap-3 p-3 bg-yellow-950/20 hover:bg-yellow-900/40 border border-dashed border-yellow-700/50 rounded-xl cursor-pointer transition group">
                          <div className="p-2 bg-yellow-900/50 rounded-lg text-yellow-500"><ShieldCheck size={16} /></div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold text-yellow-500">Declaración Jurada por parte de la Familia</div>
                            <div className="text-[10px] text-zinc-400 truncate">{nuevoJugador.authorization_file ? nuevoJugador.authorization_file.name : 'Subir PDF firmado'}</div>
                          </div>
                          <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => handleDocumentSelect(e, 'authorization_file')} />
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
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 relative h-[50px]">
                <div 
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800 rounded-lg transition-all duration-300 ease-out`}
                    style={{ left: nuevoSquad.gender === 'Femenino' ? '4px' : 'calc(50%)' }}
                />
                <button
                  type="button"
                  onClick={() => setNuevoSquad({ ...nuevoSquad, gender: 'Femenino' })}
                  className={`flex-1 text-sm font-bold relative z-10 transition-colors ${nuevoSquad.gender === 'Femenino' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Femenino
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoSquad({ ...nuevoSquad, gender: 'Masculino' })}
                  className={`flex-1 text-sm font-bold relative z-10 transition-colors ${nuevoSquad.gender === 'Masculino' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Masculino
                </button>
              </div>
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
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-600 font-bold"
                value={nuevoSquad.coach_name}
                onChange={e => setNuevoSquad({ ...nuevoSquad, coach_name: e.target.value })}
              >
                <option value="">Sin Asignar / Pendiente...</option>
                {coaches.map(c => (
                  <option key={c.id} value={`${c.first_name} ${c.last_name}`}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => (document.getElementById('dialog-new-squad') as HTMLDialogElement)?.close()} className="px-4 py-2 font-bold text-zinc-500 hover:text-white">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-white text-black font-black rounded-lg hover:bg-zinc-200">Crear</button>
          </div>
        </form>
      </dialog>

      {asignarModal.isOpen && asignarModal.huerfano && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAsignarHuerfano} className="bg-zinc-900 border border-zinc-800 text-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2"><UserPlus className="text-orange-500" /> Asignar Jugador</h3>
            <p className="text-sm text-zinc-400 mb-6 border-b border-zinc-800 pb-4">
              <strong className="text-white block text-lg mb-1">{asignarModal.huerfano.name}</strong>
              Categoría Oficial Validada: <span className="text-orange-500 font-bold">{getCategoryName(asignarModal.huerfano.category_id)}</span>
            </p>

            <div className="mb-8">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Seleccionar Plantel</label>
              <select
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-orange-500 font-bold"
                value={asignarSquadId}
                onChange={e => setAsignarSquadId(e.target.value)}
              >
                <option value="">Elegir plantel sugerido...</option>
                {squads.filter(s => s.category_id === asignarModal.huerfano.category_id).map(s => (
                  <option value={s.id} key={s.id}>{s.name} ({s.gender})</option>
                ))}
              </select>
              {squads.filter(s => s.category_id === asignarModal.huerfano.category_id).length === 0 && (
                <p className="text-red-500 text-xs mt-3 flex items-start gap-1 bg-red-500/10 p-2 rounded">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> No tienes planteles compatibles con esta categoría matemática. Crea uno antes de asignar.
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAsignarModal({ isOpen: false, huerfano: null }); setAsignarSquadId(''); }} className="px-4 py-2 text-zinc-400 font-bold hover:text-white transition">Cancelar</button>
              <button type="submit" disabled={uploading || squads.filter(s => s.category_id === asignarModal.huerfano.category_id).length === 0} className="px-6 py-2 bg-white text-black font-black rounded-lg hover:bg-zinc-200 transition disabled:opacity-50">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* CROPPER MODAL (Z-INDEX SUPERIOR) */}
      {isCroppingPhoto && tempPhotoSrc && (
        <ProfileCropperModal 
          imageSrc={tempPhotoSrc}
          onClose={cancelCrop}
          onCropComplete={finalizeCrop}
        />
      )}

      {/* CROPPER MODAL AVATAR EXISTENTE */}
      {avatarCropper.isOpen && avatarCropper.tempUrl && (
        <ProfileCropperModal 
          imageSrc={avatarCropper.tempUrl}
          onClose={() => { setAvatarCropper({ isOpen: false, tempUrl: '' }); setAvatarUploadTarget(null); }}
          onCropComplete={handleAvatarCropComplete}
        />
      )}

      {/* MODAL RECORTE DE ESCUDO DEL CLUB */}
      {isCroppingShield && tempShieldSrc && (
        <ProfileCropperModal
          imageSrc={tempShieldSrc}
          onClose={() => {
            setIsCroppingShield(false);
            if (tempShieldSrc) URL.revokeObjectURL(tempShieldSrc);
            setTempShieldSrc(null);
          }}
          onCropComplete={handleShieldCropComplete}
        />
      )}

    </div>
  );
}