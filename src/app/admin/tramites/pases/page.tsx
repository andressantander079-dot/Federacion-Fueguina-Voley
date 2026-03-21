'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Inbox, Check, X, Shield, Clock, Loader2, User, Key, CheckCircle, FileSignature, AlertCircle, ArrowRight, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPasesInboxPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [pases, setPases] = useState<any[]>([]);
    
    // View State
    const [activeTab, setActiveTab] = useState<'pagos' | 'firmas' | 'historial'>('pagos');

    // Modal State
    const [selectedPase, setSelectedPase] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'approve_pago' | 'reject_pago' | 'approve_firma' | 'soft_reject' | null>(null);
    
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
                    player:players(id, name, dni, gender, has_debt, birth_date, category_id),
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

    const sendSystemMessage = async (recipientId: string, title: string, content: string) => {
        const { data: msgData, error } = await supabase.from('messages').insert({
            subject: title,
            body: content,
            type: 'comunicado',
            priority: 'urgente'
        }).select('id').single();

        if (msgData) {
            await supabase.from('message_recipients').insert({
                message_id: msgData.id,
                recipient_club_id: recipientId
            });
        }

        if (error) {
            console.error("Message Error:", error);
        }
    };

    const handleRejectPago = async () => {
        if (!selectedPase || !motivoRechazo.trim()) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('tramites_pases').update({
                estado: 'rechazado',
                motivo_rechazo: motivoRechazo,
                updated_at: new Date().toISOString()
            }).eq('id', selectedPase.id);
            if (error) throw error;

            await sendSystemMessage(selectedPase.solicitante_club_id, 'Pago Objetado - Pase Cancelado', `Su solicitud de pase para ${selectedPase.player?.name} fue rechazada por tesorería. Motivo: ${motivoRechazo}`);

            toast.success("Trámite cancelado correctamente.");
            resetModal();
        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprovePago = async () => {
        if (!selectedPase) return;
        setIsSubmitting(true);
        try {
            // --- 1. TESORERIA: Impacto Contable ---
            const birthDate = new Date(selectedPase.player?.birth_date || Date.now());
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

            // Aranceles: ID 6 = Mayor, ID 7 = Menor
            const targetFeeId = age >= 18 ? 6 : 7;
            const feeTitleRaw = targetFeeId === 6 ? 'Pase Mayor de 18 años' : 'Pase menor de 18 años';

            const { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'ACTIVO').limit(1);
            const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;
            
            const { data: settings } = await supabase.from('settings').select('procedure_fees').single();
            const fees = settings?.procedure_fees || [];
            const feeObj = fees.find((f: any) => f.id === targetFeeId);
            const currentFeeAmount = feeObj ? Number(feeObj.price) : 0;

            if (accountId && currentFeeAmount > 0) {
                const { error: treasuryError } = await supabase.from('treasury_movements').insert([{
                    type: 'INGRESO',
                    amount: currentFeeAmount,
                    description: `Arancel de Pase (${feeTitleRaw}): Jugador ${selectedPase.player?.name} - DNI ${selectedPase.player?.dni}`,
                    entity_name: selectedPase.solicitante?.name || 'Club Adquirente',
                    date: new Date().toISOString().split('T')[0],
                    account_id: accountId
                }]);
                if (treasuryError) console.error("Error creating treasury movement for pase:", treasuryError);
            }

            // --- 2. PASAR DE ESTADO EL TRAMITE ---
            const { error } = await supabase.from('tramites_pases').update({
                estado: 'esperando_origen',
                updated_at: new Date().toISOString()
            }).eq('id', selectedPase.id);
            if (error) throw error;

            await sendSystemMessage(
                selectedPase.origen_club_id,
                'Solicitud Oficial de Pase',
                `El club ${selectedPase.solicitante?.name} ha iniciado un trámite formal por los derechos federativos de ${selectedPase.player?.name} (DNI: ${selectedPase.player?.dni}). Ingrese a la plataforma para conceder o rechazar debidamente fundado la liberación del mismo.`
            );

            toast.success("Pago verificado e ingreso a Tesorería registrado. El club de origen ha sido notificado.");
            resetModal();
        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error aprobando y facturando.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSoftReject = async () => {
        if (!selectedPase || !motivoRechazo.trim()) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('tramites_pases').update({
                estado: 'soft_reject',
                motivo_rechazo: motivoRechazo,
                updated_at: new Date().toISOString()
            }).eq('id', selectedPase.id);
            if (error) throw error;

            await sendSystemMessage(
                selectedPase.solicitante_club_id,
                'Auditoría Reclama Corrección - Pase Pausado',
                `El trámite de ${selectedPase.player?.name} requiere atención. Motivo: ${motivoRechazo}. Por favor, aplique la corrección desde su Bandeja para no perder las firmas ya realizadas.`
            );

            toast.success("Soft-Reject enviado exitosamente.");
            resetModal();
        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveFirma = async () => {
        if (!selectedPase) return;
        setIsSubmitting(true);
        try {
            const playerUpdates: any = { team_id: selectedPase.solicitante_club_id, squad_id: null };
            if (selectedPase.player?.has_debt) playerUpdates.has_debt = true; 

            // AUTOCORRECCIÓN DE CATEGORÍA
            const { data: categories } = await supabase.from('categories').select('*');
            let assignedCategoryName = null;
            let categoryNotice = "";

            if (selectedPase.player?.birth_date && categories) {
                const birthYear = parseInt(selectedPase.player.birth_date.split('-')[0]);
                const matchingCategory = categories.find(c => {
                    const minMatch = c.min_year ? birthYear >= c.min_year : true;
                    const maxMatch = c.max_year ? birthYear <= c.max_year : true;
                    return minMatch && maxMatch;
                });

                if (matchingCategory) {
                    playerUpdates.category_id = matchingCategory.id;
                    if (selectedPase.player.category_id !== matchingCategory.id) {
                        assignedCategoryName = matchingCategory.name;
                        categoryNotice = `\n\n📌 NOTA DE SISTEMA: La categoría del jugador ha sido ajustada automáticamente a ${assignedCategoryName} según su edad matemática proyectada al 31 de diciembre.`;
                    }
                }
            }

            const { error: playerError } = await supabase.from('players').update(playerUpdates).eq('id', selectedPase.player_id);
            if (playerError) throw playerError;

            const { error: passError } = await supabase.from('tramites_pases').update({
                estado: 'completado',
                updated_at: new Date().toISOString()
            }).eq('id', selectedPase.id);
            if (passError) throw passError;

            await sendSystemMessage(
                selectedPase.solicitante_club_id,
                'Pase Completado Exitosamente',
                `El pase de ${selectedPase.player?.name} ha finalizado de manera oficial. El jugador ya está habilitado para ser cargado en su institución.${categoryNotice}`
            );
            await sendSystemMessage(
                selectedPase.origen_club_id,
                'Pase Ejecutado - Baja Confirmada',
                `El pase de ${selectedPase.player?.name} ha finalizado de manera oficial. El jugador ha sido dado de baja de sus listas.`
            );

            toast.success(`Traspaso completado. El jugador ya pertenece a ${selectedPase.solicitante?.name}.`);
            resetModal();
        } catch (error: any) {
            console.error(error);
            toast.error("Ocurrió un error al aprobar el trámite.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetModal = () => {
        setModalMode(null);
        setSelectedPase(null);
        setMotivoRechazo('');
        fetchPases();
    };

    if (loading) return <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin mb-4" />Cargando Auditoría de Pases...</div>;

    // IMPORTANT: Mapping legacy 'esperando_federacion' backwards compatible.
    const pendingPagos = pases.filter(p => p.estado === 'revision_inicial_fvf' || p.estado === 'esperando_federacion');
    const pendingFirmas = pases.filter(p => p.estado === 'auditoria_final_fvf');
    const historicalPases = pases.filter(p => !['revision_inicial_fvf', 'esperando_federacion', 'auditoria_final_fvf'].includes(p.estado));

    return (
        <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans text-white">
            
            <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex justify-between items-center flex-shrink-0 z-20 shadow-sm h-16">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-black text-white flex items-center gap-2">Motor de Pases FVF <FileSignature size={18} className="text-tdf-blue" /></h1>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* LIST */}
                <div className={`w-full md:w-1/3 min-w-[350px] bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 transition-all ${selectedPase ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6">
                        <div className="flex flex-col mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight mb-2">Auditoría Dual</h1>
                                <p className="text-zinc-400 font-medium text-sm leading-relaxed">Etapa 1: Validar transferencias arancelarias.<br/>Etapa 2: Validar firmas y ejecutar motor.</p>
                            </div>

                            {(pendingPagos.length > 0 || pendingFirmas.length > 0) && (
                                <div className="bg-tdf-blue/10 border border-tdf-blue/50 text-tdf-blue p-3 rounded-lg flex items-center gap-3 animate-pulse mt-2">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p className="text-xs font-bold leading-tight">ACCION REQUERIDA: Expedientes aguardando resolución oficial.</p>
                                </div>
                            )}

                            <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 shrink-0 w-full overflow-hidden">
                                <button 
                                    onClick={() => setActiveTab('pagos')}
                                    className={`flex-1 flex items-center justify-center px-2 py-2.5 rounded-lg font-bold text-xs transition ${activeTab === 'pagos' ? 'bg-zinc-800 text-tdf-blue shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    F1. Pagos {pendingPagos.length > 0 && <span className="ml-1 bg-tdf-blue text-white text-[10px] px-1.5 rounded-full">{pendingPagos.length}</span>}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('firmas')}
                                    className={`flex-1 flex items-center justify-center px-2 py-2.5 rounded-lg font-bold text-xs transition ${activeTab === 'firmas' ? 'bg-zinc-800 text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    F6. Firmas {pendingFirmas.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{pendingFirmas.length}</span>}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('historial')}
                                    className={`flex-1 flex items-center justify-center px-2 py-2.5 rounded-lg font-bold text-xs transition ${activeTab === 'historial' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Histórica
                                </button>
                            </div>
                        </div>

                        {/* TAB CONTENT MULTIPLEXER */}
                        {(() => {
                            let list = activeTab === 'pagos' ? pendingPagos : activeTab === 'firmas' ? pendingFirmas : historicalPases;
                            
                            if (list.length === 0) {
                                return (
                                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-3xl p-8 text-center mt-4">
                                        <Shield className="mx-auto text-zinc-700 mb-4" size={32} />
                                        <h3 className="text-sm font-bold text-white mb-2">Bandeja Vacía</h3>
                                        <p className="text-xs text-zinc-500">Nada que hacer por ahora en esta cola.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid gap-3 overflow-y-auto pb-20">
                                    {list.map(pase => (
                                        <div key={pase.id} onClick={() => { if(activeTab !== 'historial') setSelectedPase(pase); }} className={`bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-3 transition ${activeTab !== 'historial' ? 'cursor-pointer hover:border-zinc-500' : 'opacity-75'}`}>
                                            <div className="flex items-center gap-3 w-full">
                                                <div className={`w-2 h-2 rounded-full ${activeTab==='pagos'?'bg-tdf-blue':activeTab==='firmas'?'bg-amber-500':pase.estado==='completado'?'bg-green-500':'bg-red-500'}`} />
                                                <div className="flex-1 truncate">
                                                    <h3 className="text-sm font-black text-white truncate">{pase.player?.name}</h3>
                                                    <p className="text-xs text-zinc-500 font-mono">DNI: {pase.player?.dni}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800/50">
                                                <img src={pase.origen?.shield_url || '/placeholder.png'} className="w-5 h-5 bg-white rounded flex-shrink-0" alt="S" />
                                                <ArrowRight className="text-zinc-600" size={14} />
                                                <img src={pase.solicitante?.shield_url || '/placeholder.png'} className="w-5 h-5 bg-white rounded flex-shrink-0" alt="S" />
                                            </div>
                                            {activeTab === 'historial' && (
                                                <div className="text-[10px] font-black uppercase text-zinc-500 mt-1">{pase.estado.replace('_', ' ')}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
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
                                        <h2 className="text-xl font-black text-white leading-tight">Auditoría Individual</h2>
                                        <p className="text-xs font-mono text-zinc-500">ID: {selectedPase.id}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
                                
                                {/* Info Base */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
                                    <div className="text-center md:text-left flex-1">
                                        <h3 className="text-2xl font-black text-white mb-2">{selectedPase.player?.name}</h3>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-sm font-bold font-mono">DNI: {selectedPase.player?.dni}</span>
                                            <span className="bg-zinc-800 text-tdf-blue px-3 py-1 rounded-lg text-sm font-bold uppercase">De {selectedPase.origen?.name} a {selectedPase.solicitante?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {activeTab === 'pagos' && (
                                    <div className="bg-zinc-900 border-l-4 border-l-tdf-blue border-r border-t border-b border-zinc-800 rounded-r-3xl p-6">
                                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><CheckCircle className="text-tdf-blue"/> Etapa 1: Cotejo de Pagos</h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed mb-6">El Club solicitante ha anexado el recibo bancario para el inicio del trámite. <strong className="text-white">Verifique su validez en el Homebanking de FVF</strong> antes de darle curso y notificar al Club Cedente.</p>
                                        
                                        {selectedPase.comprobante_url ? (
                                            <div className="border border-zinc-700 bg-zinc-950 p-6 rounded-2xl text-center">
                                                <a href={selectedPase.comprobante_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-3 bg-tdf-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl transition">
                                                    <Download size={20} /> Ver Archivo Comprobante Anexado
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-center font-bold text-sm border border-red-500/20">
                                                Alerta: El trámite ingresó sin archivo de pago válido (Posible Legacy).
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'firmas' && (
                                    <div className="bg-zinc-900 border-l-4 border-l-amber-500 border-r border-t border-b border-zinc-800 rounded-r-3xl p-6">
                                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><Shield className="text-amber-500"/> Etapa 6: Auditoría Final de Documentación</h3>
                                        
                                        {/* Comprobante Recodatorio */}
                                        <div className="flex gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-8">
                                            <CheckCircle className="text-tdf-blue -mt-0.5 shrink-0" size={20} />
                                            <p className="text-xs text-zinc-300">El pago federativo ya ha sido admitido en la FASE 2. Proceda al control visual de firmas (Consentimiento de traspaso y aceptación por parte de Clubes y Jugador).</p>
                                        </div>

                                        <div className="space-y-6">
                                            <SignatureRenderer label="Fase 1: Autoridad Solicitante" base64={selectedPase.firma_solicitante} />
                                            <SignatureRenderer label="Fase 2: Autoridad de Origen (Liberación)" base64={selectedPase.firma_origen} />
                                            <SignatureRenderer label="Fase 3: Conformidad Jugador/a" base64={selectedPase.firma_jugador} />
                                            
                                            {selectedPase.firma_tutor && (
                                                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/30 shadow-[inset_0_4px_20px_rgba(245,158,11,0.05)]">
                                                    <div className="flex flex-wrap items-center justify-between mb-4 gap-4 border-b border-amber-500/20 pb-4">
                                                        <span className="text-sm font-black text-amber-500 uppercase flex items-center gap-2"><AlertCircle size={16}/> Conformidad de Tutor Legal Obligatoria</span>
                                                        <div className="text-right">
                                                            <span className="block text-white font-bold">{selectedPase.nombre_tutor}</span>
                                                            <span className="block text-amber-500 text-xs font-mono">DNI: {selectedPase.dni_tutor}</span>
                                                        </div>
                                                    </div>
                                                    <SignatureRenderer label="Fase 3b: Firma Tutor Legal" base64={selectedPase.firma_tutor} omitWrapper />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ACCIONES (FOOTER FIXED) */}
                            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-30">
                                <div className="max-w-4xl mx-auto">
                                    
                                    {modalMode === 'reject_pago' || modalMode === 'soft_reject' ? (
                                        <div className="animate-in slide-in-from-bottom-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block animate-pulse">Describa la anomalía encontrada:</label>
                                            <textarea 
                                                value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)}
                                                className="w-full bg-zinc-950 border border-amber-500/50 rounded-xl p-4 text-white resize-none outline-none focus:border-amber-500 transition mb-4"
                                                placeholder={modalMode === 'reject_pago' ? "Ej: El comprobante está en blanco." : "Ej: Las firmas del menor y tutor son idénticas, repetir."} rows={2} autoFocus
                                            />
                                            <div className="flex gap-4">
                                                <button onClick={() => setModalMode(null)} className="flex-1 py-3 text-zinc-400 font-bold hover:text-white transition">Cancelar</button>
                                                <button 
                                                    onClick={modalMode === 'reject_pago' ? handleRejectPago : handleSoftReject} disabled={!motivoRechazo.trim() || isSubmitting}
                                                    className={`flex-[2] py-3 text-white rounded-xl font-black transition flex justify-center items-center gap-2 ${modalMode === 'reject_pago' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : modalMode === 'reject_pago' ? 'Cancelar Pase' : 'Emitir Soft-Reject / Pausar Pase'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : activeTab === 'pagos' ? (
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setModalMode('reject_pago')} disabled={isSubmitting}
                                                className="flex-1 py-3 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl font-bold transition flex justify-center items-center gap-2"
                                            >
                                                <X size={18} /> Fallo en Boleto
                                            </button>
                                            <button 
                                                onClick={handleApprovePago} disabled={isSubmitting}
                                                className="flex-[2] py-3 bg-tdf-blue hover:bg-blue-600 text-white rounded-xl font-black transition flex justify-center items-center gap-2"
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> Aprobar y Notificar a Origen (Fase 3)</>}
                                            </button>
                                        </div>
                                    ) : activeTab === 'firmas' ? (
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setModalMode('soft_reject')} disabled={isSubmitting}
                                                className="flex-1 py-3 border border-amber-900/50 text-amber-500 hover:bg-amber-900/20 rounded-xl font-bold transition flex justify-center items-center gap-2"
                                            >
                                                <AlertCircle size={18} /> Soft-Reject / Falla
                                            </button>
                                            <button 
                                                onClick={handleApproveFirma} disabled={isSubmitting}
                                                className="flex-[2] py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-black transition flex justify-center items-center gap-2 shadow-lg"
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin"/> : <><Shield size={20} className="text-green-600"/> Validar Legales y Traspasar (Fase 7)</>}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 p-6 text-center">
                            <FileSignature size={64} className="mb-4 opacity-20 text-tdf-blue" />
                            <h3 className="text-xl font-bold text-zinc-400">Plataforma Dual de Auditoría FVF</h3>
                            <p className="text-sm mt-2 max-w-sm">Inspeccione Recibos en Fase 2 o Fiscalice Acuerdos Institucionales en Fase 6 para mantener el padrón provincial aséptico y consistente.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

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
        <div className={`relative overflow-hidden ${!omitWrapper ? 'bg-zinc-950 rounded-2xl p-4 border border-zinc-800' : ''}`}>
            <span className="absolute top-4 left-4 text-[10px] sm:text-xs font-bold text-tdf-blue uppercase z-10 flex items-center gap-1 bg-zinc-900/90 p-1.5 px-3 rounded shadow-lg backdrop-blur text-white shadow"><Check size={14} className="text-green-400"/> {label}</span>
            <div className="h-40 sm:h-48 w-full bg-white rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-zinc-800/20">
                <img src={base64} alt={`Firma ${label}`} className="h-full w-auto object-contain pointer-events-none mix-blend-multiply opacity-90 filter contrast-150 grayscale" />
            </div>
        </div>
    );
}
