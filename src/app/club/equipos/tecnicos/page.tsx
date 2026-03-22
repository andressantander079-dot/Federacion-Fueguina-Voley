'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Shield, AlertCircle, CheckCircle, Trash2, Camera, UserCheck, XCircle, Clock, FileText } from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';
import { toast } from 'sonner';

export default function CuerpoTecnicoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos del Club Logueado
  const { clubId, profile, loading: authLoading, error: authError } = useClubAuth();
  
  const [clubName, setClubName] = useState('');
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<any[]>([]);

  useEffect(() => {
    if (clubId) {
      cargarDatos(clubId);
    }
    if (authError) {
      setError(authError);
    }
  }, [clubId, authError]);

  async function cargarDatos(id: string) {
    try {
      setLoading(true);
      if (profile?.full_name) setClubName(profile.full_name);

      const { data: teamData } = await supabase.from('teams').select('shield_url').eq('id', id).single();
      if (teamData?.shield_url) setClubLogo(teamData.shield_url);

      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .eq('club_id', id)
        .neq('status', 'inactivo') // Ocultar los dados de baja lógica
        .order('created_at', { ascending: false });

      if (coachesError) throw coachesError;
      setCoaches(coachesData || []);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error cargando técnicos.");
    } finally {
      setLoading(false);
    }
  }

  async function darDeBaja(coachId: string, coachName: string) {
    if (!confirm(`¿Está seguro que desea dar de baja al técnico ${coachName}? Ya no podrá asignarlo a planteles. Esta acción no se puede deshacer de forma directa.`)) return;

    try {
      const response = await fetch('/api/club/coaches/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coachId, club_id: clubId })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Error al dar de baja');

      toast.success('El técnico ha sido dado de baja correctamente.');
      if (clubId) cargarDatos(clubId);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="animate-pulse flex flex-col items-center">
        <Shield size={48} className="text-zinc-800 mb-4" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Cuerpo Técnico...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl text-center max-w-md">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error de Carga</h2>
        <p className="text-zinc-400 mb-6">{error}</p>
        <Link href="/club" className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-zinc-200 transition">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white pb-20 selection:bg-blue-500 selection:text-white">
      
      <div className="px-6 py-4 flex items-center justify-between text-sm text-zinc-500 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <Link href="/club" className="flex items-center gap-1 hover:text-white transition font-medium">
          <ChevronRight size={14} className="rotate-180" /> Volver al Panel
        </Link>
        <Link href="/club/tramites/tecnicos/nuevo" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-900/20">
          + Inscribir Nuevo Técnico
        </Link>
      </div>

      <div className="p-6 md:p-12 max-w-6xl mx-auto">
        <div className="flex items-center gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden relative shrink-0">
             {clubLogo ? (
                <img src={clubLogo} alt="Escudo Club" className="w-full h-full object-cover" />
             ) : (
                <Shield size={40} className="text-zinc-700" strokeWidth={1.5} />
             )}
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-2">
              Cuerpo Técnico
            </h1>
            <p className="text-zinc-500 md:text-lg font-medium">{clubName}</p>
          </div>
        </div>

        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <UserCheck className="text-blue-500" /> Plantilla de Técnicos
                 <span className="bg-zinc-800 text-xs px-2 py-0.5 rounded-full text-zinc-400">{coaches.length}</span>
              </h2>
           </div>

           {coaches.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-12 text-center animate-in fade-in">
                 <UserCheck size={48} className="mx-auto text-zinc-700 mb-4" />
                 <h3 className="text-white font-bold text-lg mb-2">No hay Técnicos Registrados</h3>
                 <p className="text-zinc-500 max-w-sm mx-auto mb-6">El club aún no cuenta con directores técnicos en su plantilla o todos se encuentran inactivos.</p>
                 <Link href="/club/tramites/tecnicos/nuevo" className="inline-block bg-white text-black font-bold uppercase tracking-wide text-sm px-6 py-3 rounded-xl hover:bg-zinc-200 transition">
                    Inscribir Técnico
                 </Link>
              </div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {coaches.map((coach) => (
                    <div 
                       key={coach.id} 
                       className={`
                          bg-zinc-900 rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden group
                          flex flex-col h-full
                          ${coach.status === 'habilitado' ? 'border-zinc-800 hover:border-zinc-700 hover:shadow-2xl' : 
                            coach.status === 'pendiente' ? 'border-yellow-500/30 bg-yellow-950/10' : 
                            'border-red-500/30 bg-red-950/10'}
                       `}
                    >
                       {/* Linea lateral de estado */}
                       <div className={`
                          absolute left-0 top-0 bottom-0 w-1.5
                          ${coach.status === 'habilitado' ? 'bg-green-500' : 
                            coach.status === 'pendiente' ? 'bg-yellow-500' : 
                            'bg-red-500'}
                       `} />

                       <div className="flex items-start gap-4 mb-6">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                             {coach.photo_url ? (
                                <img src={coach.photo_url} alt={coach.first_name} className="w-full h-full object-cover" />
                             ) : (
                                <Camera className="w-full h-full p-4 text-zinc-700" />
                             )}
                          </div>
                          <div className="min-w-0 flex-1">
                             <h3 className="text-lg font-black text-white leading-tight truncate">
                                {coach.first_name} {coach.last_name}
                             </h3>
                             <p className="text-zinc-500 text-xs font-mono mt-1">DNI {coach.dni}</p>
                             
                             <div className="mt-2 flex">
                                {coach.status === 'habilitado' && (
                                   <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 px-2 py-0.5 rounded-md">
                                      <CheckCircle size={12} /> Habilitado
                                   </span>
                                )}
                                {coach.status === 'pendiente' && (
                                   <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-md">
                                      <Clock size={12} /> Pendiente
                                   </span>
                                )}
                                {coach.status === 'rechazado' && (
                                   <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md">
                                      <XCircle size={12} /> Rechazado
                                   </span>
                                )}
                             </div>
                          </div>
                       </div>

                       {coach.status === 'rechazado' && coach.rejection_reason && (
                          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
                             <strong>Motivo:</strong> {coach.rejection_reason}
                          </div>
                       )}

                       <div className="mt-auto border-t border-zinc-800 pt-4 flex items-center justify-between">
                          <div className="flex gap-2">
                             {coach.id_document_url && (
                                <a href={coach.id_document_url} target="_blank" rel="noreferrer" title="Ver DNI" className="p-2 bg-zinc-950 rounded-lg text-zinc-400 hover:text-white transition">
                                   <FileText size={16} />
                                </a>
                             )}
                          </div>
                          
                          <button 
                             onClick={() => darDeBaja(coach.id, `${coach.first_name} ${coach.last_name}`)}
                             className="text-xs font-bold text-zinc-500 hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                          >
                             <Trash2 size={14} /> Dar de baja
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
