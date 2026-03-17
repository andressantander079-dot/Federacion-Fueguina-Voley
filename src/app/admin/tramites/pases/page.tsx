'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Inbox, Check, X, Shield, Clock, Loader2, User, Key, CheckCircle, FileSignature, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPasesInboxPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [pases, setPases] = useState<any[]>([]);
    
    // View State
    const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>('pendientes');

    // Modal State
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
                    player:players(id, name, dni, gender, has_debt),
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
            // 1. Update Player Record (Retaining has_debt status implicitly, but enforcing team change)
            const playerUpdates: any = {
                team_id: selectedPase.solicitante_club_id,
                squad_id: null
            };
            
            // Si el jugador tenía deuda, el nuevo club la hereda silenciosamente (el pase ya fue tramitado)
            // Aseguramos que siga en true explícitamente por si acaso.
            if (selectedPase.player?.has_debt) {
                playerUpdates.has_debt = true; 
            }

            const { error: playerError } = await supabase
                .from('players')
                .update(playerUpdates)
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

            // Optional 2b: Si tenía deuda, insertar en tesorería un aviso de deuda para el club nuevo.
            if (selectedPase.player?.has_debt) {
                 await supabase.from('treasury_movements').insert([{
                    type: 'EGRESO', 
                    amount: 0, // Monto simbólico o leer un valor prefijado (ej. 60000)
                    description: `Migración de Deuda - Pase ${selectedPase.player.name} (DNI ${selectedPase.player.dni})`,
                    entity_name: selectedPase.solicitante?.name,
                    club_id: selectedPase.solicitante_club_id,
                    date: new Date(),
                    status: 'Pendiente'
                 }]);
            }

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

    const pendingPases = pases.filter(p => p.estado === 'esperando_federacion');
    const historicalPases = pases.filter(p => p.estado !== 'esperando_federacion');

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
                    <div className="p-6">
                        {/* Encabezado y Tabs */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight mb-2">Auditoría de Pases</h1>
                                <p className="text-zinc-400 font-medium">Revisa y resuelve las solicitudes de transferencia entre clubes.</p>
                            </div>

                            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0 w-full md:w-auto">
                                <button 
                                    onClick={() => setActiveTab('pendientes')}
                                    className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg font-bold text-sm transition ${activeTab === 'pendientes' ? 'bg-zinc-800 text-tdf-blue shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Pendientes
                                    {pendingPases.length > 0 && (
                                        <span className="ml-2 bg-tdf-blue text-white text-[10px] px-2 py-0.5 rounded-full">{pendingPases.length}</span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('historial')}
                                    className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg font-bold text-sm transition ${activeTab === 'historial' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Historial
                                </button>
                            </div>
                        </div>

                        {/* TAB: PENDIENTES */}
                        {activeTab === 'pendientes' && (
                            <>
                                {pendingPases.length === 0 ? (
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                                        <Shield className="mx-auto text-zinc-700 mb-4" size={48} />
                                        <h3 className="text-xl font-bold text-white mb-2">Bandeja al día</h3>
                                        <p className="text-zinc-500">No hay pases pendientes de revisión federativa.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {pendingPases.map(pase => (
                                            <div key={pase.id} className="bg-zinc-900 border-l-4 border-l-tdf-blue border border-zinc-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-zinc-700 transition shadow-xl">
                                                {/* ... contenido del pase pendiente ... */}
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                                        <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1">
                                                            <AlertCircle size={12}/> Revisión Federativa
                                                        </span>
                                                        <span className="text-sm font-bold text-zinc-400">ID: {pase.id.substring(0,8)}</span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-white mb-1">{pase.player?.name}</h3>
                                                    <div className="text-sm text-zinc-400 flex flex-wrap items-center gap-4">
                                                        <span className="flex items-center gap-1 text-white"><User size={14}/> DNI: {pase.player?.dni}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Sale de</p>
                                                        <div className="flex items-center gap-2">
                                                            <img src={pase.origen?.shield_url || '/placeholder.png'} className="w-8 h-8 object-contain bg-white rounded-full p-0.5" alt="shield"/>
                                                            <p className="font-bold text-white text-sm">{pase.origen?.name || 'Libre'}</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="text-zinc-700" size={20} />
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Va a</p>
                                                        <div className="flex items-center gap-2">
                                                            <img src={pase.solicitante?.shield_url || '/placeholder.png'} className="w-8 h-8 object-contain bg-white rounded-full p-0.5" alt="shield"/>
                                                            <p className="font-bold text-white text-sm">{pase.solicitante?.name}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 shrink-0">
                                                    <button 
                                                        onClick={() => { setSelectedPase(pase); setModalMode('approve'); }}
                                                        className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 text-green-500 px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition whitespace-nowrap"
                                                    >
                                                        <Check size={18} /> Aprobar Pase
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedPase(pase); setModalMode('reject'); }}
                                                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition whitespace-nowrap"
                                                    >
                                                        <X size={18} /> Rechazar / Observar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* TAB: HISTORIAL */}
                        {activeTab === 'historial' && (
                            <>
                                {historicalPases.length === 0 ? (
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                                        <FileText className="mx-auto text-zinc-700 mb-4" size={48} />
                                        <h3 className="text-xl font-bold text-white mb-2">Historial Vacío</h3>
                                        <p className="text-zinc-500">No hay registros de pases finalizados correspondientes a esta temporada.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {historicalPases.map(pase => (
                                            <div key={pase.id} className="bg-zinc-900/50 border border-zinc-800/50 p-4 shrink-0 rounded-xl flex items-center justify-between hover:bg-zinc-900 transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{pase.player?.name}</p>
                                                        <p className="text-xs text-zinc-500">
                                                            De {pase.origen?.name || 'Libre'} a {pase.solicitante?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                                        pase.estado === 'aprobado' ? 'bg-green-500/10 text-green-500' : 
                                                        pase.estado === 'rechazado' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                                        'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                        {pase.estado.replace('_', ' ')}
                                                    </span>
                                                    {pase.estado === 'rechazado' && pase.motivo_rechazo && (
                                                        <span className="text-[10px] text-zinc-500 max-w-[200px] truncate" title={pase.motivo_rechazo}>
                                                            Motivo: {pase.motivo_rechazo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
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
                                            {selectedPase.player?.has_debt && (
                                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg text-sm font-black uppercase flex items-center gap-1">
                                                    <AlertCircle size={14}/> DEUDA ACTIVA DETECTADA
                                                </span>
                                            )}
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
