'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload, CheckCircle, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NuevoTecnicoPage() {
    const supabase = createClient();
    const router = useRouter();
    const { clubId, loading: authLoading } = useClubAuth();

    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dni: '',
    });

    // Archivos
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [dniFile, setDniFile] = useState<File | null>(null);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);

    const handleUpload = async (file: File, bucketName: string, pathFolder: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${clubId}/${pathFolder}/${Date.now()}.${fileExt}`;
        
        const form = new FormData();
        form.append('file', file);
        form.append('bucketName', bucketName);
        form.append('fileName', fileName);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: form
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Error subiendo archivo al servidor');
        }

        const data = await res.json();
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clubId || !photoFile || !dniFile || !paymentFile) {
            toast.error("Faltan archivos obligatorios.");
            return;
        }

        setSubmitting(true);
        try {
            // FormData API call to handle DNI Lookup logic first
            // We pass data to the backend API we are going to build
            
            // Wait, we can upload files first, but if DNI lookup fails, we uploaded garbage.
            // Better to do a prestrike DNI check.
            const checkRes = await fetch(`/api/club/coaches/register?dni=${formData.dni}&checkOnly=true`);
            if (!checkRes.ok) {
                const errData = await checkRes.json();
                throw new Error(errData.error || 'Error verificando DNI');
            }

            // DNI is OK to proceed (either new or reactivable). Upload files.
            toast.info("Subiendo documentos...");
            const photo_url = await handleUpload(photoFile, 'player-photos', 'coaches_photos');
            const id_document_url = await handleUpload(dniFile, 'procedure-files', 'coaches_dnis');
            const payment_url = await handleUpload(paymentFile, 'procedure-files', 'receipts_coaches');

            toast.info("Registrando trámite...");
            const registerRes = await fetch('/api/club/coaches/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    club_id: clubId,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    dni: formData.dni,
                    photo_url,
                    id_document_url,
                    payment_url
                })
            });

            if (!registerRes.ok) {
                const errData = await registerRes.json();
                throw new Error(errData.error || 'Error al registrar al técnico');
            }

            toast.success("Trámite iniciado correctamente");
            router.push('/club/tramites');
            
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Ocurrió un error inesperado al procesar la solicitud.");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading) return <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">Verificando sesión...</div>;

    const renderFileUploader = (label: string, fileState: File | null, setFileState: (f: File | null) => void, accept = "image/*,.pdf") => (
        <div className="mb-6">
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">{label}</label>
            <div className="relative group">
                <input
                    type="file"
                    required
                    accept={accept}
                    onChange={e => setFileState(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className={`
                    w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center text-center transition
                    ${fileState ? 'border-tdf-blue bg-blue-900/10' : 'border-zinc-800 bg-zinc-900/50 group-hover:border-zinc-600'}
                `}>
                    {fileState ? (
                        <>
                            <CheckCircle className="text-tdf-blue mb-2" size={24} />
                            <span className="text-sm font-bold text-white max-w-full truncate px-4">{fileState.name}</span>
                        </>
                    ) : (
                        <>
                            <Upload className="text-zinc-500 mb-2" size={24} />
                            <span className="text-xs font-bold text-zinc-400">Click o arrastrar para subir archivo</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 pb-24 font-sans max-w-4xl mx-auto">
            <Link href="/club/tramites" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8 font-bold text-sm">
                <ArrowLeft size={16} /> Volver a Trámites
            </Link>

            <div className="mb-8">
                <h1 className="text-4xl font-black tracking-tight mb-2">Inscripción de Técnico</h1>
                <p className="text-zinc-400 font-medium">Registra un nuevo Director Técnico o Auxiliar en el Club.</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl mb-8 flex gap-4 items-start">
                <ShieldAlert className="text-yellow-500 shrink-0" />
                <div className="text-sm text-yellow-500/90 leading-relaxed font-medium">
                    El DNI será verificado contra el Padrón de la Federación. Si el técnico ya posee un perfil en estado de "Baja/Inactivo" de un club anterior, su perfil será reactivado para este club sin necesidad de duplicar registros. Si se encuentra activo en otro club, deberás solicitar su baja previa.
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Datos Personales */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                        1. Datos del Técnico
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Nombre(s)</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition"
                                placeholder="Ej: Lionel Andrés"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Apellido(s)</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition"
                                placeholder="Ej: Scaloni"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">DNI (Sin puntos)</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-tdf-blue focus:ring-1 focus:ring-tdf-blue transition"
                                placeholder="Ej: 30123456"
                                value={formData.dni}
                                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Documentación */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                        2. Documentación y Pago
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {renderFileUploader("Foto Perfil (Cara)", photoFile, setPhotoFile, "image/*")}
                        {renderFileUploader("DNI Frente", dniFile, setDniFile, "image/*,.pdf")}
                        {renderFileUploader("Comprobante de Pago", paymentFile, setPaymentFile, "image/*,.pdf")}
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-4 bg-tdf-blue hover:bg-blue-600 text-white font-black rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <><Loader2 className="animate-spin" size={20} /> Procesando Trámite...</>
                        ) : (
                            <><CheckCircle size={20} /> Enviar a la Federación</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
