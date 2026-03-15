'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Inbox, Check, X, Shield, Clock, Loader2, User, Key, CheckCircle, FileSignature } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPasesInboxPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [pases, setPases] = useState<any[]>([]);
    
    // UI State
    const [selectedPase, setSelectedPase] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
    
    // Action State
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPases = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tramites_pases')
                .select(`
                    *,
                    player:players(id, name, dni, gender),
                    solicitante:teams!solicitante_club_id(name, shield_url),
                    origen:teams!origen_club_id(name, shield_url)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPases(data || []);
        } catch (error) {
            console.error("Error fetching passes:", error);
            toast.error("Error al cargar los pases. Intente refrescar.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPases();
    }, []);

    const handleReject = async () => {
        if (!selectedPase || !motivoRechazo.trim()) return;
        
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('tramites_pases')
                .update({
                    estado: 'rechazado',
                    motivo_rechazo: motivoRechazo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedPase.id);

            if (error) throw error;

            toast.success("Trámite rechazado correctamente.");
            setModalMode(null);
            setSelectedPase(null);
            setMotivoRechazo('');
            fetchPases();

        } catch (error) {
            console.error("Error rejecting pass:", error);
            toast.error("Ocurrió un error al rechazar el pase.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedPase) return;

        setIsSubmitting(true);
        try {
            // Transaction-like approach via multiple updates (client-side simple tx)
            // 1. Update Player Record: 
            // set team_id = solicitante_club_id
            // set squad_id = null (needs new assign)
            // set category_id = null (optional, usually left alone if it's the exact same age, but safer to reset or leave squad reset force re-assign)
            
            const { error: playerError } = await supabase
                .from('players')
                .update({
                    team_id: selectedPase.solicitante_club_id,
                    squad_id: null // Require the new club to assign them to a squad
                })
                .eq('id', selectedPase.player_id);

            if (playerError) throw playerError;

            // 2. Mark pass as approved
            const { error: passError } = await supabase
                .from('tramites_pases')
                .update({
                    estado: 'aprobado',
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedPase.id);

            if (passError) throw passError;

            toast.success(`Traspaso completado. El jugador ya pertenece a ${selectedPase.solicitante?.name}.`);
            
            // 3. Clear selected and fetch
            setModalMode(null);
            setSelectedPase(null);
            fetchPases();

        } catch (error: any) {
            console.error("Error approving pass:", error);
            toast.error("Ocurrió un error al aprobar el trámite: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin mb-4" />Cargando Auditoría de Pases...</div>;

    const pendingFederation = pases.filter(p => p.estado === 'esperando_federacion');
    const history = pases.filter(p => p.estado !== 'esperando_federacion');

    return (
        <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans text-white">
            
            {/* Context Header */}
            <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex justify-between items-center flex-shrink-0 z-20 shadow-sm h-16">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-black text-white flex items-center gap-2">Auditoría de Pases <FileSignature size={18} className="text-tdf-blue" /></h1>
                    </div>
                </div>
            </header>

            {/* SPLIT VIEW (List / Detail) */}
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* LIST */}
                <div className={`w-full md:w-1/3 min-w-[350px] bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 transition-all ${selectedPase ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-zinc-800">
                        <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Esperando Aprobación FVF ({pendingFederation.length})</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {pendingFederation.map(pase => (
                            <div 
                                key={pase.id} 
                                onClick={() => setSelectedPase(pase)}
                                className={`p-5 pl-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition border-l-4 ${selectedPase?.id === pase.id ? 'bg-zinc-800 border-l-tdf-blue' : 'border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Listo p/ Auditoría</span>
                                    <span className="text-[10px] text-zinc-500">{new Date(pase.updated_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-white text-base truncate mb-1">{pase.player?.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-2 font-medium">
                                    <span className="truncate">{pase.origen?.name}</span>
                                    <span>&rarr;</span>
                                    <span className="text-tdf-blue truncate">{pase.solicitante?.name}</span>
                                </div>
                            </div>
                        ))}

                        {/* History separator */}
                        {history.length > 0 && (
                            <div className="p-4 mt-8 border-t border-zinc-800 border-b relative bg-zinc-950/50">
                                <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-wider">Historial y Trámites Abiertos ({history.length})</h3>
                            </div>
                        )}

                        {history.map(pase => (
                            <div 
                                key={pase.id} 
                                onClick={() => setSelectedPase(pase)}
                                className={`p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition opacity-70 hover:opacity-100 ${selectedPase?.id === pase.id ? 'bg-zinc-800 border-l-4 border-l-zinc-500 pl-3' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-white text-sm truncate">{pase.player?.name}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                        pase.estado === 'aprobado' ? 'bg-green-500/10 text-green-500' :
                                        pase.estado === 'rechazado' ? 'bg-red-500/10 text-red-500' :
                                        pase.estado === 'esperando_jugador' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-zinc-500/10 text-zinc-400'
                                    }`}>
                                        {pase.estado.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-1">Hacia: {pase.solicitante?.name}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DETAIL */}
                <div className={`flex-1 bg-black h-full overflow-hidden relative flex-col ${selectedPase ? 'flex w-full absolute md:relative z-20' : 'hidden md:flex'}`}>
                    {selectedPase ? (
                        <div className="flex-1 overflow-y-auto">
                            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedPase(null)} className="md:hidden p-2 -ml-2 hover:bg-zinc-800 text-zinc-400 rounded-full"><ArrowLeft size={20}/></button>
                                    <div>
                                        <h2 className="text-xl font-black text-white leading-tight">Acta de Control - Fase 4</h2>
                                        <p className="text-xs font-mono text-zinc-500">ID: {selectedPase.id}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
                                
                                {/* Info Base */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center shadow-lg">
                                    <div className="text-center md:text-left flex-1">
                                        <h3 className="text-3xl font-black text-white mb-2">{selectedPase.player?.name}</h3>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-sm font-bold font-mono">DNI: {selectedPase.player?.dni}</span>
                                            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-sm font-bold">{selectedPase.player?.gender}</span>
                                            <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase ${
                                                selectedPase.estado === 'aprobado' ? 'bg-green-500/20 text-green-500' :
                                                selectedPase.estado === 'rechazado' ? 'bg-red-500/20 text-red-500' :
                                                selectedPase.estado === 'esperando_federacion' ? 'bg-tdf-blue/20 text-tdf-blue' :
                                                'bg-amber-500/20 text-amber-500'
                                            }`}>
                                                ESTADO: {selectedPase.estado.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Flujo Comparativo */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">De (Club de Origen)</h4>
                                        <div className="flex items-center gap-4">
                                            <img src={selectedPase.origen?.shield_url || '/placeholder.png'} className="w-12 h-12 object-contain bg-white rounded-full p-1 border-2 border-zinc-700" alt="Shield"/>
                                            <span className="text-lg font-black text-white">{selectedPase.origen?.name}</span>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900 border border-tdf-blue/30 rounded-2xl p-6 relative overflow-hidden">
                                        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-tdf-blue/5 to-transparent pointer-events-none"/>
                                        <h4 className="text-xs font-bold text-tdf-blue uppercase tracking-widest mb-4">Hacia (Club Solicitante)</h4>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <img src={selectedPase.solicitante?.shield_url || '/placeholder.png'} className="w-12 h-12 object-contain bg-white rounded-full p-1 border-2 border-tdf-blue" alt="Shield"/>
                                            <span className="text-lg font-black text-white">{selectedPase.solicitante?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Panel de Firmas Listas */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                                        <Shield className="text-green-500" /> Control de Firmas Legales
                                    </h3>
                                    
                                    <div className="space-y-8">
                                        <SignatureRenderer label="Fase 1: Autoridad Solicitante" base64={selectedPase.firma_solicitante} />
                                        <SignatureRenderer label="Fase 2: Autoridad de Origen (Liberación)" base64={selectedPase.firma_origen} />
                                        <SignatureRenderer label="Fase 3: Conformidad Jugador/a" base64={selectedPase.firma_jugador} />
                                        
                                        {selectedPase.firma_tutor && (
                                            <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
                                                <div className="flex flex-wrap items-center justify-between mb-4 gap-4 border-b border-zinc-800/50 pb-4">
                                                    <span className="text-sm font-bold text-amber-500 uppercase flex items-center gap-2"><CheckCircle size={16}/> Conformidad de Mayor/Tutor (Menor de Edad)</span>
                                                    <div className="text-right">
                                                        <span className="block text-white font-bold">{selectedPase.nombre_tutor}</span>
                                                        <span className="block text-zinc-500 text-xs font-mono">DNI: {selectedPase.dni_tutor}</span>
                                                    </div>
                                                </div>
                                                <SignatureRenderer label="Fase 3b: Firma Tutor Legal" base64={selectedPase.firma_tutor} omitWrapper />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rejection Feedback Display */}
                                {selectedPase.estado === 'rechazado' && selectedPase.motivo_rechazo && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-500">
                                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><X size={20}/> Rechazado por motivos administrativos:</h3>
                                        <p className="italic">"{selectedPase.motivo_rechazo}"</p>
                                    </div>
                                )}
                            </div>

                            {/* ACCIONES (FOOTER FIXED) */}
                            {selectedPase.estado === 'esperando_federacion' && (
                                <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-30">
                                    <div className="max-w-4xl mx-auto">
                                        {modalMode === 'reject' ? (
                                            <div className="animate-in slide-in-from-bottom-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Motivo Documentado del Rechazo</label>
                                                <textarea 
                                                    value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-red-500/50 rounded-xl p-4 text-white resize-none outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition mb-4"
                                                    placeholder="Inconsistencia de firmas, error en DNI..." rows={3}
                                                    autoFocus
                                                />
                                                <div className="flex gap-4">
                                                    <button onClick={() => setModalMode(null)} className="flex-1 py-3 text-zinc-400 font-bold hover:text-white transition">Atrás</button>
                                                    <button 
                                                        onClick={handleReject} disabled={!motivoRechazo.trim() || isSubmitting}
                                                        className="flex-[2] py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-black transition flex justify-center items-center gap-2 shadow-lg"
                                                    >
                                                        {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : 'Ejecutar Trámite como RECHAZADO'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setModalMode('reject')} disabled={isSubmitting}
                                                    className="flex-1 py-4 border-2 border-red-900/50 hover:border-red-600 text-red-500 rounded-xl font-bold transition flex justify-center items-center gap-2"
                                                >
                                                    <X size={20} /> Inconsistencia / Rechazar
                                                </button>
                                                <button 
                                                    onClick={handleApprove} disabled={isSubmitting}
                                                    className="flex-[2] py-4 bg-white hover:bg-zinc-200 text-black rounded-xl font-black text-lg transition shadow-xl hover:-translate-y-1 transform active:translate-y-0 flex justify-center items-center gap-2"
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <><CheckCircle size={24} className="text-green-600" /> Aprobar y Habilitar Traspaso Federal</>}
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-center text-xs text-zinc-500 mt-4 font-medium uppercase tracking-widest leading-relaxed">
                                            Al Aprobar, el ID de club del jugador cambiará automáticamente en padrón. <br/>Su escuadra actual y categoría local serán reseteados, exigiendo la reasignación en su nuevo destino.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 p-6 text-center">
                            <FileSignature size={64} className="mb-4 opacity-10" />
                            <h3 className="text-xl font-bold text-zinc-500">Auditoría de Pases Federales</h3>
                            <p className="text-sm mt-2 max-w-sm">Selecciona una solicitud en espera de verificación para contrastar firmas y accionar el traspaso registral de la institución solicitante.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Visual Helper for Digital Signatures
function SignatureRenderer({ label, base64, omitWrapper = false }: { label: string, base64: string, omitWrapper?: boolean }) {
    if (!base64) {
        return (
            <div className={`flex items-center justify-between opacity-50 ${!omitWrapper ? 'bg-zinc-950 rounded-2xl p-4 border border-zinc-800 border-dashed' : ''}`}>
                <span className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2"><Clock size={16}/> {label}</span>
                <span className="text-xs bg-zinc-900 text-zinc-500 px-2 py-1 rounded">No registrada aún</span>
            </div>
        );
    }

    return (
        <div className={`relative ${!omitWrapper ? 'bg-zinc-950 rounded-2xl p-4 border border-zinc-800' : ''}`}>
            <span className="absolute top-4 left-4 text-xs font-bold text-tdf-blue uppercase z-10 flex items-center gap-1 bg-zinc-950/80 p-1 px-2 rounded backdrop-blur-sm"><Check size={14}/> {label}</span>
            <div className="h-40 sm:h-48 w-full bg-white rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-zinc-800/20">
                <img src={base64} alt={`Firma ${label}`} className="h-[90%] w-auto object-contain pointer-events-none filter contrast-125" />
            </div>
        </div>
    );
}
