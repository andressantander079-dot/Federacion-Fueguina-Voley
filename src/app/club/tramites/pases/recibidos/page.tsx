'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Inbox, Check, X, Shield, Clock, ExternalLink, Loader2, Key, User, AlertCircle } from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';
import SignaturePad from '@/components/ui/SignaturePad';

export default function PasesRecibidosPage() {
    const supabase = createClient();
    const router = useRouter();
    const { clubId, loading: authLoading } = useClubAuth();

    const [pases, setPases] = useState<any[]>([]);
    const [loadingPases, setLoadingPases] = useState(true);

    // Modal State
    const [selectedPase, setSelectedPase] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'accept' | 'reject' | null>(null);
    const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>('pendientes');

    // Form State
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [signature, setSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [debtAccepted, setDebtAccepted] = useState(false);
    
    // Credentials State (Success Mode)
    const [credentials, setCredentials] = useState<{user: string, pass: string, url: string} | null>(null);

    const fetchPases = async () => {
        if (!clubId) return;
        setLoadingPases(true);
        try {
            const { data, error } = await supabase
                .from('tramites_pases')
                .select(`
                    *,
                    player:players(name, dni, has_debt, category:categories(name)),
                    solicitante:teams!solicitante_club_id(name, shield_url)
                `)
                .eq('solicitante_club_id', clubId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPases(data || []);
        } catch (error) {
            console.error("Error fetching passes:", error);
        } finally {
            setLoadingPases(false);
        }
    };

    useEffect(() => {
        fetchPases();
    }, [clubId]);

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

            setModalMode(null);
            setSelectedPase(null);
            setMotivoRechazo('');
            setDebtAccepted(false);
            fetchPases();

        } catch (error) {
            console.error("Error rejecting pass:", error);
            alert("No se pudo rechazar el pase. Inténtalo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAccept = async () => {
        if (!selectedPase || !signature) return;

        setIsSubmitting(true);
        try {
            // Generar credenciales
            const tempUser = selectedPase.player?.dni; // User = DNI
            const tempPassword = Math.floor(100000 + Math.random() * 900000).toString(); // Pass = 6 rand digits
            
            // 1. Llamar al API de creación de usuario en Auth (Admin)
            const apiRes = await fetch('/api/auth/temp-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: tempUser, password: tempPassword })
            });
            const apiData = await apiRes.json();
            
            if (!apiRes.ok) {
                 throw new Error(apiData.error || "Error al crear credenciales seguras");
            }

            // 2. Si Auth fue exitoso, actualizar la tabla
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 72); // +72 hs

            const { error } = await supabase
                .from('tramites_pases')
                .update({
                    estado: 'esperando_jugador',
                    firma_origen: signature,
                    temp_user: tempUser,
                    temp_password: tempPassword,
                    temp_expires_at: expiresAt.toISOString(),
                    debt_accepted: selectedPase.player?.has_debt ? debtAccepted : false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedPase.id);

            if (error) throw error;
            
            setCredentials({
                user: tempUser,
                pass: tempPassword,
                url: window.location.origin
            });

        } catch (error: any) {
            console.error("Error accepting pass:", error);
            alert("Ocurrió un error al procesar la aceptación. Inténtalo nuevamente.\n" + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModal = () => {
        setCredentials(null);
        setModalMode(null);
        setSelectedPase(null);
        setDebtAccepted(false);
        fetchPases();
    };

    if (authLoading || loadingPases) return <div className="p-12 text-center text-white">Cargando Inbox...</div>;

    const pendingPases = pases.filter(p => p.estado === 'solicitado');
    const historicalPases = pases.filter(p => p.estado !== 'solicitado');

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans sm:pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
                <Link href="/club/tramites" className="p-2 hover:bg-zinc-800 rounded-full transition">
                    <ArrowLeft size={20} className="text-zinc-400 hover:text-white" />
                </Link>
                <div>
                    <h1 className="font-black text-xl leading-tight">Bandeja de Entrante</h1>
                    <p className="text-xs text-tdf-blue font-bold uppercase tracking-wider">Pases Recibidos / Fase 2</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 mt-2">
                
                {/* TABS */}
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-8">
                    <button 
                        onClick={() => setActiveTab('pendientes')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'pendientes' ? 'bg-zinc-800 text-tdf-blue shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Inbox size={18} />
                        Pendientes de Acción
                        {pendingPases.length > 0 && (
                            <span className="bg-tdf-blue text-white text-[10px] px-2 py-0.5 rounded-full">{pendingPases.length}</span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('historial')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'historial' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Clock size={18} />
                        Historial (Aprobados / Rechazados)
                    </button>
                </div>

                {/* TAB CONTENT: PENDIENTES */}
                {activeTab === 'pendientes' && (
                    <>
                        <h2 className="text-2xl font-black flex items-center gap-2 mb-6">
                            <Inbox className="text-tdf-blue" />
                            Solicitudes Recibidas
                        </h2>

                        {pendingPases.length === 0 ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center mb-12">
                                <Shield className="mx-auto text-zinc-700 mb-4" size={48} />
                                <h3 className="text-lg font-bold text-white mb-2">Bandeja al día</h3>
                                <p className="text-zinc-500">No hay trámites pendientes de resolución.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 mb-12">
                                {pendingPases.map(pase => (
                                    <div key={pase.id} className="bg-zinc-900 border-l-4 border-l-tdf-blue border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                                        <div className="flex items-center gap-4">
                                            <img src={pase.solicitante?.shield_url || '/placeholder.png'} className="w-16 h-16 object-contain bg-white rounded-full p-1" alt="Shield" />
                                            <div>
                                                <p className="text-xs font-bold text-tdf-blue uppercase tracking-wider mb-1">Club Solicitante:</p>
                                                <p className="text-xl font-black text-white leading-tight">{pase.solicitante?.name}</p>
                                                <div className="mt-2 text-sm text-zinc-400 flex items-center gap-2">
                                                    <User size={14}/> <strong>{pase.player?.name}</strong> • {pase.player?.dni}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex md:flex-col gap-3">
                                            <button 
                                                onClick={() => { setSelectedPase(pase); setModalMode('accept'); }}
                                                className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 text-green-500 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                                            >
                                                <Check size={18} /> Aceptar
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedPase(pase); setModalMode('reject'); }}
                                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                                            >
                                                <X size={18} /> Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* TAB CONTENT: HISTORIAL */}
                {activeTab === 'historial' && (
                    <>
                        {historicalPases.length === 0 ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                                <Clock className="mx-auto text-zinc-700 mb-4" size={48} />
                                <h3 className="text-lg font-bold text-white mb-2">Sin registros</h3>
                                <p className="text-zinc-500">No hay pases resueltos en el historial.</p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                                {historicalPases.map(pase => (
                                    <div key={pase.id} className="p-4 flex items-center justify-between opacity-70 hover:opacity-100 transition">
                                        <div>
                                            <p className="font-bold text-white text-sm">{pase.player?.name}</p>
                                            <p className="text-xs text-zinc-500">Solicitado por {pase.solicitante?.name}</p>
                                        </div>
                                        <div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                pase.estado === 'rechazado' ? 'bg-red-500/10 text-red-500' :
                                                pase.estado === 'aprobado' ? 'bg-green-500/10 text-green-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                                {pase.estado.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODALS */}
            {modalMode && selectedPase && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    
                    {/* CREDENTIALS SUCCESS VIEW */}
                    {credentials ? (
                        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Key size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Pase Aceptado</h3>
                            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                El trámite pasó a la <strong className="text-white">Fase 3</strong>. Copia los siguientes datos y envíaselos al jugador para que ingrese desde cualquier computadora/celular a firmar su consentimiento:
                            </p>
                            
                            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-left mb-8 space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-zinc-500 uppercase">Link de Ingreso</p>
                                    <p className="text-tdf-blue font-mono text-sm break-all select-all">{credentials.url}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-500 uppercase">Usuario (DNI)</p>
                                        <p className="text-white font-black text-lg select-all">{credentials.user}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-500 uppercase">Contraseña 72hs</p>
                                        <p className="text-white font-black text-lg select-all">{credentials.pass}</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setCredentials(null); setModalMode(null); setSelectedPase(null); fetchPases(); }}
                                className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition"
                            >
                                Entendido, cerrar
                            </button>
                        </div>
                    ) : modalMode === 'reject' ? (
                        /* REJECT VIEW */
                        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-2xl font-black text-white mb-2">Rechazar Solicitud</h3>
                            <p className="text-zinc-400 text-sm mb-6">Estás a punto de rechazar el pase de <strong className="text-white">{selectedPase.player?.name}</strong> al club {selectedPase.solicitante?.name}.</p>
                            
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Motivo de Rechazo (Obligatorio)</label>
                            <textarea 
                                rows={4}
                                required
                                value={motivoRechazo}
                                onChange={(e) => setMotivoRechazo(e.target.value)}
                                className="w-full bg-zinc-950 border border-red-500/30 focus:border-red-500 rounded-xl p-4 text-white outline-none resize-none transition mb-6"
                                placeholder="Escribe aquí el motivo institucional del rechazo (deudas, contrato, etc)..."
                            />

                            <div className="flex gap-4">
                            <button onClick={() => setModalMode(null)} className="flex-1 py-3 text-zinc-400 hover:text-white font-bold transition">Cancelar</button>
                                <button 
                                    onClick={handleReject} 
                                    disabled={!motivoRechazo.trim() || isSubmitting}
                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Rechazo'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ACCEPT VIEW */
                        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-2xl font-black text-white mb-2">Aceptar Solicitud</h3>
                            <p className="text-zinc-400 text-sm mb-6">Liberación de pase para <strong className="text-white">{selectedPase.player?.name}</strong> hacia el club {selectedPase.solicitante?.name}.</p>
                            
                            <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 mb-6">
                                <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                                    <Shield className="text-tdf-blue" size={18} /> Firma del Club de Origen
                                </h4>
                                <p className="text-sm text-zinc-500 mb-6">Para otorgar este pase legalmente, por favor estampe su firma a continuación. Se generarán credenciales temporales para el jugador.</p>
                                
                                {selectedPase.player?.has_debt && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 flex flex-col gap-3 items-start">
                                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm"><AlertCircle size={18}/> DEUDA ACTIVA DETECTADA</div>
                                        <p className="text-sm">El solicitante posee una deuda con su club actual (ustedes). Si autorizan su pase, la misma será migrada automáticamente al club destino, dejándolo comercialmente inhabilitado hasta saldarla en tesorería.</p>
                                        <label className="flex items-start gap-3 mt-2 cursor-pointer bg-red-500/5 p-3 rounded-lg border border-red-500/20 w-full hover:bg-red-500/10 transition">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 mt-0.5 rounded border-red-500 text-red-600 focus:ring-red-500 bg-black cursor-pointer"
                                                checked={debtAccepted}
                                                onChange={(e) => setDebtAccepted(e.target.checked)}
                                            />
                                            <span className="text-sm font-medium">Acepto liberar el pase entendiendo que la deuda pasará al club receptor de forma definitiva en la estructura federal.</span>
                                        </label>
                                    </div>
                                )}

                                <SignaturePad onSign={(url) => setSignature(url)} label="FIRMA ORIGEN" />
                            </div>

                            <div className="flex gap-4">
                                <button onClick={closeModal} className="flex-1 py-3 text-zinc-400 hover:text-white font-bold transition">Cancelar</button>
                                <button 
                                    onClick={handleAccept} 
                                    disabled={!signature || isSubmitting || (selectedPase.player?.has_debt && !debtAccepted)}
                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Firmar y Generar Token'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
