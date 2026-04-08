'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, CheckCircle, FileSignature, Loader2 } from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';

export default function PasesFamiliaPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    
    // Auth & Data
    const [userDni, setUserDni] = useState<string | null>(null);
    const [pase, setPase] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Form State
    const [accepted, setAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Signatures
    const [playerSignature, setPlayerSignature] = useState('');
    const [tutorDni, setTutorDni] = useState('');
    const [tutorSignature, setTutorSignature] = useState('');

    useEffect(() => {
        const fetchPaseData = async () => {
            try {
                // 1. Obtener sesión para sacar el DNI
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) throw new Error("Sesión inválida.");

                const dni = session.user.user_metadata?.dni;
                if (!dni) throw new Error("Credenciales incompletas (Falta DNI en token).");
                setUserDni(dni);

                // 2. Buscar el pase Activo para este DNI
                const { data: paseData, error: paseError } = await supabase
                    .from('tramites_pases')
                    .select(`
                        *,
                        player:players(id, name, dni, birth_date, category:categories(name)),
                        origen:teams!origen_club_id(name, shield_url),
                        destino:teams!solicitante_club_id(name, shield_url)
                    `)
                    .eq('temp_user', dni)
                    .eq('estado', 'esperando_firma_jugador')
                    .single();

                if (paseError || !paseData) {
                    setErrorMsg("No se encontró un trámite de pase activo o vigente asociado a su DNI. Es probable que haya caducado o ya haya sido firmado.");
                    return;
                }

                // Verificar Expiración Obligatoria Comercial
                if (paseData.temp_expires_at) {
                    const expires = new Date(paseData.temp_expires_at);
                    if (new Date() > expires) {
                        setErrorMsg("El enlace de firma ha caducado irreparablemente (superó el límite legal de 72 Horas). Este trámite temporal de pase ha sido clausurado y cancelado automáticamente por el Sistema Federal. El Club solicitante deberá tramitar todo de nuevo desde cero.");
                        
                        // Cancelar en DB
                        await supabase.from('tramites_pases').update({ 
                            estado: 'cancelado_por_vencimiento', 
                            updated_at: new Date().toISOString()
                        }).eq('id', paseData.id);

                        return;
                    }
                }

                setPase(paseData);

            } catch (err: any) {
                console.error("Error cargando pase familiar:", err);
                setErrorMsg(err.message || "Ocurrió un error al cargar su trámite.");
            } finally {
                setLoading(false);
            }
        };

        fetchPaseData();
    }, [supabase]);

    // Calcular edad
    const isMinor = () => {
        if (!pase?.player?.birth_date) return false;
        const b = new Date(pase.player.birth_date);
        const today = new Date();
        let age = today.getFullYear() - b.getFullYear();
        const m = today.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
            age--;
        }
        return age < 18;
    };

    const handleSubmit = async () => {
        if (!pase || !accepted) return;
        
        // Validation
        if (!playerSignature) {
            alert("El jugador debe firmar.");
            return;
        }

        if (isMinor()) {
            if (!tutorDni || tutorDni.length < 7) {
                alert("Debe ingresar un DNI válido para el padre/madre/tutor.");
                return;
            }
            if (!tutorSignature) {
                alert("El padre/madre/tutor debe firmar obligatoriamente por ser menor de edad.");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('tramites_pases')
                .update({
                    estado: 'auditoria_final_fvf', // Todas las firmas completas → va a auditoría final FVF
                    firma_jugador: playerSignature,
                    firma_tutor: isMinor() ? tutorSignature : null,
                    dni_tutor: isMinor() ? tutorDni : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pase.id);

            if (error) throw error;
            
            setSuccess(true);
            
            // Destruimos la sesión temporal en segundo plano (Opcional, pero recomendado)
            supabase.auth.signOut();

        } catch (error: any) {
            console.error("Error firmando pase:", error);
            alert("No se pudo enviar la firma: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
                <Loader2 size={40} className="animate-spin text-zinc-500" />
                <p className="font-bold text-sm text-zinc-400">Verificando Expediente y Firmas Institucionales...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex items-center justify-center p-6 h-full">
                <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-white mb-2">Acceso Denegado</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-6">{errorMsg}</p>
                    <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="bg-white text-black font-black px-6 py-3 rounded-xl hover:bg-zinc-200 transition">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex items-center justify-center p-6 h-full">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in slide-in-from-bottom-8">
                    <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">Firma Exitosa</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                        Su consentimiento ha sido registrado legalmente. El expediente ha sido girado a la Federación de Voley Fueguina para su auditoría y aprobación final.
                    </p>
                    <button onClick={() => router.push('/')} className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 rounded-xl transition shadow-lg w-full">
                        Cerrar y Salir
                    </button>
                </div>
            </div>
        );
    }

    const minor = isMinor();

    return (
        <div className="max-w-3xl mx-auto px-4">
            
            {/* Acta Header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-tdf-blue via-purple-500 to-tdf-orange" />
                
                <div className="text-center mb-10">
                    <img src="/logo-fvf.png" alt="FVF" className="w-20 h-20 object-contain mx-auto mb-4 bg-white rounded-2xl p-2 shadow-lg" />
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                    {pase.tipo_pase === 'prestamo' ? 'Acta Oficial de Préstamo' : 'Acta Oficial de Traspaso'}
                </h1>
                    <p className="text-zinc-500 font-bold tracking-widest text-xs mt-2 uppercase">Federación de Voley Fueguina</p>
                </div>
                
                {/* Clubs Info */}
                <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                    <div className="text-center md:text-right flex flex-col items-center md:items-end">
                        <img src={pase.origen?.shield_url || '/placeholder.png'} className="w-12 h-12 object-contain bg-white rounded-full p-1 mb-2" alt="Origen" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Cede Derechos (Origen)</p>
                        <p className="text-lg font-black text-white leading-tight">{pase.origen?.name}</p>
                    </div>

                    <div className="hidden md:flex flex-col items-center px-4">
                        <div className="text-tdf-blue opacity-50 mb-1">→</div>
                        <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-full border border-zinc-700">
                            {pase.tipo_pase === 'prestamo' ? 'PRÉSTAMO' : 'PASE'}
                        </span>
                    </div>

                    <div className="text-center md:text-left flex flex-col items-center md:items-start">
                        <img src={pase.destino?.shield_url || '/placeholder.png'} className="w-12 h-12 object-contain bg-white rounded-full p-1 mb-2" alt="Destino" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Adquiere Derechos (Destino)</p>
                        <p className="text-lg font-black text-white leading-tight">{pase.destino?.name}</p>
                    </div>
                </div>
            </div>

            {/* Player Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-4">
                    <FileSignature className="text-tdf-blue" />
                    Identificación del Jugador/a
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Titular</p>
                        <p className="text-lg font-black text-white">{pase.player?.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">D.N.I.</p>
                        <p className="text-lg font-mono font-bold text-white">{pase.player?.dni}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Categoría Padrón</p>
                        <p className="text-lg font-bold text-tdf-blue">{Array.isArray(pase.player?.category) ? pase.player.category[0]?.name : (pase.player?.category as any)?.name}</p>
                    </div>
                </div>

                {minor && (
                    <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-500 text-sm">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="font-bold mb-1">Jugador Menor de Edad Detectado</p>
                            <p className="opacity-90">Por directivas de la FVF, este traspaso exige obligatoriamente la firma en conformidad del Padre, Madre o Tutor Legal responsable, además de la firma del jugador/a.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Consent & Signatures */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8 shadow-xl">
                <label className="flex items-start gap-4 cursor-pointer group mb-8 bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                    <div className="mt-1">
                        <input 
                            type="checkbox" 
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-tdf-blue focus:ring-tdf-blue focus:ring-offset-zinc-950"
                        />
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed md:text-justify">
                        En mi carácter de {minor ? 'Padre/Madre/Tutor y' : ''} titular de los datos enunciados, <strong className="text-white">PRESTO EXPRESO CONSENTIMIENTO</strong> para concretar {pase.tipo_pase === 'prestamo' ? 'el préstamo temporal de mis derechos deportivos desde el club de origen hacia el club solicitante, en carácter de cesión gratuita y temporal,' : 'la transferencia de mis derechos federativos y deportivos desde el club de origen hacia el club solicitante,'} en el marco del reglamento oficial de la Federación de Voley Fueguina. Toda firma digital estampada aquí es vinculante y reviste carácter de declaración jurada.
                    </p>
                </label>

                <div className={`transition-all duration-500 ${!accepted ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'} space-y-8`}>
                    
                    {/* Firma Jugador */}
                    <div>
                        <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-4 text-center">Firma del Jugador/a</h3>
                        <SignaturePad onSign={setPlayerSignature} label={"FIRMA JUGADOR"} />
                    </div>

                    {/* Firma Tutor (si es menor) */}
                    {minor && (
                        <div className="pt-8 border-t border-zinc-800/50">
                            <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-6 text-center">Firma Padre / Madre / Tutor (Obligatorio)</h3>
                            
                            <div className="max-w-xs mx-auto mb-6">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 text-center">D.N.I. del Adulto Responsable</label>
                                <input 
                                    type="number"
                                    value={tutorDni}
                                    onChange={(e) => setTutorDni(e.target.value)}
                                    placeholder="Sin puntos..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center text-white font-bold outline-none focus:border-tdf-blue"
                                />
                            </div>

                            <SignaturePad onSign={setTutorSignature} label={"FIRMA ADULTO"} />
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !playerSignature || (minor && (!tutorSignature || !tutorDni))}
                        className="w-full mt-10 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)] transition flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'Sellar Acta Oficial'}
                    </button>
                    <p className="text-center text-xs text-zinc-600 mt-4 uppercase tracking-wider font-bold">
                        Al hacer clic, el documento será encriptado e inalterable.
                    </p>

                </div>
            </div>

        </div>
    );
}
