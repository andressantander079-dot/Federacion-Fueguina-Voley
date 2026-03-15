'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Key, Shield, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';

export default function PaseConsentimientoPage() {
    const supabase = createClient();
    const router = useRouter();

    // Login State
    const [dniAuth, setDniAuth] = useState('');
    const [pinAuth, setPinAuth] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    
    // Process State
    const [paseActivo, setPaseActivo] = useState<any>(null);
    const [age, setAge] = useState<number | null>(null);

    // Form State
    const [firmaJugador, setFirmaJugador] = useState('');
    const [firmaTutor, setFirmaTutor] = useState('');
    const [dniTutor, setDniTutor] = useState('');
    const [nombreTutor, setNombreTutor] = useState('');
    
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        try {
            // Find active pass that matches credentials and hasn't expired
            const { data, error } = await supabase
                .from('tramites_pases')
                .select(`
                    *,
                    player:players(name, dni, fecha_nacimiento),
                    solicitante:teams!solicitante_club_id(name),
                    origen:teams!origen_club_id(name)
                `)
                .eq('temp_user', dniAuth)
                .eq('temp_password', pinAuth)
                .eq('estado', 'esperando_jugador')
                .single();

            if (error || !data) {
                setAuthError('Credenciales incorrectas o el trámite ya no está en esta fase.');
                setAuthLoading(false);
                return;
            }

            // Check Expiration
            if (new Date(data.temp_expires_at) < new Date()) {
                setAuthError('Tu acceso temporal de 72hs ha expirado. El club de origen debe generar uno nuevo.');
                setAuthLoading(false);
                return;
            }

            // Calculate age
            let calculatedAge = 18; // Default to adult if no date (fallback)
            if (data.player?.fecha_nacimiento) {
                const birthDate = new Date(data.player.fecha_nacimiento);
                const today = new Date();
                calculatedAge = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    calculatedAge--;
                }
            }

            setAge(calculatedAge);
            setPaseActivo(data);

        } catch (error) {
            console.error("Auth error", error);
            setAuthError('Error de conexión. Inténtelo más tarde.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSubmitConsentimiento = async () => {
        if (!paseActivo || !firmaJugador || !acceptedTerms) return;
        
        // Minor validations
        const isMinor = age !== null && age < 18;
        if (isMinor && (!firmaTutor || !dniTutor || !nombreTutor)) {
            alert("Como menor de edad, requieres los datos y firma de un tutor.");
            return;
        }

        setIsSubmitting(true);
        try {
            const updatePayload: any = {
                estado: 'esperando_federacion',
                firma_jugador: firmaJugador,
                updated_at: new Date().toISOString()
            };

            if (isMinor) {
                updatePayload.firma_tutor = firmaTutor;
                updatePayload.dni_tutor = dniTutor;
                updatePayload.nombre_tutor = nombreTutor;
            }

            const { error } = await supabase
                .from('tramites_pases')
                .update(updatePayload)
                .eq('id', paseActivo.id);

            if (error) throw error;

            setSuccessMessage("Consentimiento firmado correctamente. El trámite fue enviado a la Federación para su auditoría y aprobación final.");

        } catch (error) {
            console.error("Error signing pass:", error);
            alert("No se pudo enviar el formulario. Verifica tu conexión.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successMessage) {
        return (
            <div className="min-h-screen bg-zinc-950 font-sans p-6 flex flex-col items-center justify-center">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">¡Pase Confirmado!</h2>
                    <p className="text-zinc-400 mb-8 leading-relaxed">{successMessage}</p>
                    <button onClick={() => window.location.reload()} className="inline-block bg-white text-black font-black px-8 py-4 rounded-xl hover:bg-zinc-200 transition">
                        Finalizar
                    </button>
                </div>
            </div>
        );
    }

    if (!paseActivo) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-tdf-blue to-purple-600" />
                
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-tdf-blue/10 rounded-2xl flex items-center justify-center">
                            <Shield className="text-tdf-blue" size={32} />
                        </div>
                    </div>
                    
                    <h1 className="text-2xl font-black text-white text-center mb-1">Consentimiento de Pase</h1>
                    <p className="text-zinc-400 text-center text-sm mb-8">Ingresa el PIN de 6 dígitos que te proporcionó tu club de origen para firmar tu formulario de transferencia.</p>
                    
                    {authError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl mb-6 flex items-start gap-3">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>{authError}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Tu DNI</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: 40123456"
                                    value={dniAuth}
                                    onChange={(e) => setDniAuth(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-tdf-blue"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">PIN Temporal (6 Dígitos)</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    required
                                    type="text"
                                    maxLength={6}
                                    placeholder="Ej: 123456"
                                    value={pinAuth}
                                    onChange={(e) => setPinAuth(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white font-mono text-xl tracking-widest outline-none focus:border-tdf-blue"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={authLoading || dniAuth.length < 5 || pinAuth.length !== 6}
                            className="w-full py-4 mt-4 bg-tdf-blue hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-tdf-blue text-white font-black rounded-xl transition shadow-lg flex justify-center items-center gap-2"
                        >
                            {authLoading ? <Loader2 className="animate-spin" size={20} /> : 'Acceder a mi Planilla'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const isMinor = age !== null && age < 18;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans sm:pb-24 pt-8 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
                
                {/* ACTA OFICIAL */}
                <div className="bg-white text-black rounded-sm border border-zinc-200 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                        <Shield size={400} />
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between border-b-2 border-slate-900 pb-6 mb-8 gap-6">
                        <div className="flex flex-col items-center md:items-start">
                            <img src="/LOGO NUEVO.png" alt="FVF" className="h-16 object-contain mb-2" />
                            <p className="text-xs font-bold text-slate-500">FEDERACIÓN DE VÓLEY FUEGUINA</p>
                        </div>
                        <div className="text-center md:text-right">
                            <h2 className="text-2xl font-black uppercase tracking-tight">Acta de Transferencia (Pase)</h2>
                            <p className="text-slate-500 font-mono text-sm">ID: {paseActivo.id.split('-')[0].toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="space-y-6 text-sm sm:text-base leading-relaxed mb-12 relative z-10">
                        <p>
                            En la provincia de Tierra del Fuego, Antártida e Islas del Atlántico Sur, el club <strong>{paseActivo.solicitante?.name}</strong> (Club Solicitante) pide formalmente al club <strong>{paseActivo.origen?.name}</strong> (Club de Origen) la transferencia definitiva de los derechos federativos del siguiente jugador/a:
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 my-6 grid md:grid-cols-2 gap-4">
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase">Nombre Completo</span>
                                <span className="font-black text-lg">{paseActivo.player?.name}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase">DNI</span>
                                <span className="font-black text-lg font-mono">{paseActivo.player?.dni}</span>
                            </div>
                        </div>

                        <p>
                            Habiendo el Club de Origen aceptado y liberado al jugador mediante firma digital avalada por el sistema general de la F.V.F., <strong>se requiere la firma de conformidad del jugador</strong> (y la de su tutor legal en caso de ser menor de 18 años) para que la Federación audite y finalice el proceso logístico.
                        </p>

                        {isMinor && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                <p><strong>MENOR DE EDAD:</strong> Al tener {age} años, el sistema requiere obligatoriamente que un Padre, Madre o Tutor legal complete sus datos y firme el acta junto al jugador.</p>
                            </div>
                        )}
                    </div>

                    {/* FIRMAS AREA */}
                    <div className="border-t-2 border-slate-900 pt-8 mt-12 space-y-12">
                        
                        {/* FIRMA JUGADOR */}
                        <div>
                            <h3 className="font-black text-lg mb-4 text-slate-900 border-l-4 border-tdf-blue pl-3">Firma del Jugador/a</h3>
                            <SignaturePad 
                                onSign={(url) => setFirmaJugador(url)} 
                                label="FIRMA DEL JUGADOR/A" 
                            />
                        </div>

                        {/* FIRMA TUTOR (si aplica) */}
                        {isMinor && (
                            <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl">
                                <h3 className="font-black text-lg mb-4 text-slate-900 border-l-4 border-amber-500 pl-3">Datos y Firma del Tutor Legal (Menores)</h3>
                                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Completo del Tutor</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={nombreTutor}
                                            onChange={(e) => setNombreTutor(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-amber-500" 
                                            placeholder="Ej: Juan Perez"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">DNI del Tutor</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={dniTutor}
                                            onChange={(e) => setDniTutor(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-amber-500" 
                                            placeholder="Ej: 20123456"
                                        />
                                    </div>
                                </div>
                                <SignaturePad 
                                    onSign={(url) => setFirmaTutor(url)} 
                                    label="FIRMA DEL TUTOR" 
                                />
                            </div>
                        )}

                        {/* SUBMIT BUTTON */}
                        <div className="pt-6">
                            <label className="flex items-start gap-4 cursor-pointer group mb-8">
                                <div className="mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 text-tdf-blue focus:ring-tdf-blue"
                                    />
                                </div>
                                <p className="text-sm text-slate-600 font-medium">
                                    Declaro bajo juramento que los datos ingresados son correctos y presto formal consentimiento para ser transferido al club {paseActivo.solicitante?.name}, bajo la reglamentación vigente de la Federación de Vóley Fueguina.
                                </p>
                            </label>

                            <button
                                onClick={handleSubmitConsentimiento}
                                disabled={!acceptedTerms || !firmaJugador || (isMinor && (!firmaTutor || !nombreTutor || !dniTutor)) || isSubmitting}
                                className="w-full py-4 md:py-5 bg-slate-900 hover:bg-tdf-blue disabled:opacity-50 disabled:hover:bg-slate-900 text-white font-black text-lg rounded-xl transition shadow-lg flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'Firmar y Enviar Acta a la FVF'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
