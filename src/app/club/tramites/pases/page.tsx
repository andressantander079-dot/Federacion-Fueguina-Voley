'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Activity, Shield, AlertCircle, FileUp, Loader2 } from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';
import TransferStepper from '@/components/pases/TransferStepper';

export default function MisPasesSolicitadosPage() {
    const supabase = createClient();
    const router = useRouter();
    const { clubId, loading: authLoading } = useClubAuth();

    const [pases, setPases] = useState<any[]>([]);
    const [loadingPases, setLoadingPases] = useState(true);

    const [uploadModalPase, setUploadModalPase] = useState<any>(null);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleReUpload = async () => {
        if (!uploadModalPase || !newFile) return;
        setIsUploading(true);
        try {
            const fileExt = newFile.name.split('.').pop();
            const fileName = `pase-correccion-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('procedure-files')
                .upload(`pases/${fileName}`, newFile);
            
            if (uploadError) throw new Error(uploadError.message);
            
            const { data: { publicUrl } } = supabase.storage
                .from('procedure-files')
                .getPublicUrl(`pases/${fileName}`);

            const { error: updateError } = await supabase
                .from('tramites_pases')
                .update({
                    comprobante_url: publicUrl,
                    estado: 'auditoria_final_fvf', // Vuelve a la FVF
                    motivo_rechazo: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', uploadModalPase.id);

            if (updateError) throw updateError;
            
            setUploadModalPase(null);
            setNewFile(null);
            fetchPases();

        } catch (err: any) {
            console.error("Error re-subiendo", err);
            alert("No se pudo subir el archivo: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const fetchPases = async () => {
        if (!clubId) return;
        setLoadingPases(true);
        try {
            const { data, error } = await supabase
                .from('tramites_pases')
                .select(`
                    *,
                    player:players(name, dni),
                    origen:teams!origen_club_id(name, shield_url)
                `)
                .eq('solicitante_club_id', clubId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPases(data || []);
        } catch (error) {
            console.error("Error fetching pases:", error);
        } finally {
            setLoadingPases(false);
        }
    };

    useEffect(() => {
        fetchPases();
    }, [clubId]);

    const activePases = pases.filter(p => p.estado !== 'completado' && p.estado !== 'rechazado');
    const historicalPases = pases.filter(p => p.estado === 'completado' || p.estado === 'rechazado');

    if (authLoading || loadingPases) return <div className="p-12 text-center text-white">Cargando expedientes...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans sm:pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/club/tramites" className="p-2 hover:bg-zinc-800 rounded-full transition">
                        <ArrowLeft size={20} className="text-zinc-400 hover:text-white" />
                    </Link>
                    <div>
                        <h1 className="font-black text-xl leading-tight">Mis Solicitudes</h1>
                        <p className="text-xs text-tdf-blue font-bold uppercase tracking-wider">Seguimiento de Pases</p>
                    </div>
                </div>
                <Link href="/club/tramites/pases/solicitar" className="bg-tdf-blue hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition shadow-lg shrink-0 flex items-center gap-2">
                    <Send size={16} /> Nuevo Pase
                </Link>
            </div>

            <div className="max-w-4xl mx-auto p-6 mt-2">
                
                <h2 className="text-2xl font-black flex items-center gap-2 mb-6 text-white">
                    <Activity className="text-tdf-blue" />
                    Pases en Curso
                </h2>

                {activePases.some(p => p.estado === 'soft_reject') && (
                    <div className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-500 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
                        <AlertCircle size={24} />
                        <div>
                            <p className="font-bold">¡Acción Requerida!</p>
                            <p className="text-sm">Tienes solicitudes con la documentación observada por la FVF. Corrige los archivos para continuar el trámite.</p>
                        </div>
                    </div>
                )}

                {activePases.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center mb-12 shadow-xl">
                        <Shield className="mx-auto text-zinc-700 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-white mb-2">No hay trámites activos</h3>
                        <p className="text-zinc-500 mb-6">Inicia tu primera solicitud de pase desde el padrón federal.</p>
                    </div>
                ) : (
                    <div className="space-y-6 mb-12">
                        {activePases.map(pase => (
                            <div key={pase.id} className={`bg-zinc-900 border transition-all rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden ${pase.estado === 'soft_reject' ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-zinc-800'}`}>
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <img src={pase.origen?.shield_url || '/placeholder.png'} className="w-16 h-16 object-contain bg-white rounded-full p-1 border-2 border-zinc-800" alt="Shield" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Transferencia Desde:</p>
                                            <p className="text-xl font-black text-white leading-tight">{pase.origen?.name}</p>
                                            <div className="mt-2 text-sm text-zinc-400 font-bold bg-zinc-950 px-3 py-1 rounded-lg inline-block border border-zinc-800">
                                                Jugador: <span className="text-white">{pase.player?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Expediente ID</p>
                                        <p className="font-mono text-zinc-300 text-sm bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">{pase.id.split('-')[0].toUpperCase()}</p>
                                    </div>
                                </div>

                                {/* STEPPER VISUAL */}
                                <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-800/50 mb-6">
                                    <TransferStepper estado={pase.estado} motivo_rechazo={pase.motivo_rechazo} />
                                </div>

                                {/* ACCIONES CONDICIONALES */}
                                {pase.estado === 'soft_reject' && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                                        <div>
                                            <h4 className="font-black text-amber-500 flex items-center gap-2 mb-1"><AlertCircle size={18}/> Requerimiento FVF</h4>
                                            <p className="text-sm text-amber-400/80 max-w-lg">La documentación ingresada (foto de pago, dni, etc) se encuentra borrosa o ilegible. Debes corregirla para destrabar el pase.</p>
                                        </div>
                                        <button 
                                            onClick={() => setUploadModalPase(pase)}
                                            className="bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-lg"
                                        >
                                            <FileUp size={18} /> Reenviar Archivos
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <h2 className="text-xl font-black flex items-center gap-2 mb-6 text-zinc-500">
                    <HistoryIcon className="text-zinc-600" />
                    Historial Cerrado
                </h2>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800 shadow-xl opacity-60 hover:opacity-100 transition-opacity">
                    {historicalPases.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 font-bold text-sm">No hay registros cerrados.</div>
                    ) : (
                        historicalPases.map(pase => (
                            <div key={pase.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                <div>
                                    <p className="font-black text-white">{pase.player?.name}</p>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Desde: {pase.origen?.name}</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                                        pase.estado === 'rechazado' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                        'bg-green-500/10 text-green-500 border border-green-500/20'
                                    }`}>
                                        {pase.estado === 'completado' ? 'APROBADO E INCORPORADO' : 'DENEGADO'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>

            {/* Modal de Re-subida de Archivos */}
            {uploadModalPase && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-2xl font-black text-white mb-2">Corregir Documentación</h3>
                        <p className="text-sm text-zinc-400 mb-6">La FVF ha observado la documentación original. Adjunta el nuevo comprobante corregido para reanudar el trámite.</p>
                        
                        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-xl text-sm italic mb-6">
                            Motivo FVF: {uploadModalPase.motivo_rechazo || 'Documento borroso, ilegible o faltante.'}
                        </div>

                        <label className="block bg-zinc-950 border border-zinc-800 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-zinc-800 transition mb-8">
                            <FileUp className="mx-auto text-zinc-500 mb-2" size={32} />
                            <span className="text-zinc-300 font-bold block mb-1">
                                {newFile ? newFile.name : 'Seleccionar nuevo archivo...'}
                            </span>
                            <span className="text-zinc-600 text-xs">JPG, PNG o PDF recomendado</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf" 
                                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                            />
                        </label>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => { setUploadModalPase(null); setNewFile(null); }}
                                className="flex-1 py-3 text-zinc-400 hover:text-white font-bold transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleReUpload}
                                disabled={!newFile || isUploading}
                                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-black transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : 'Subir y Reanudar Trámite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function HistoryIcon(props: any) {
    return (
        <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" height="24" width="24" {...props}>
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
    )
}
