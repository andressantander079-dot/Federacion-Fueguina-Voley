'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Copy, CheckCircle, AlertCircle, X, Loader2, DollarSign } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useClubAuth } from '@/hooks/useClubAuth';

export default function ClubTramitesPage() {
    const supabase = createClient();
    const router = useRouter();
    const { settings, loading: loadingSettings } = useSettings();

    const [procedures, setProcedures] = useState<any[]>([]);
    const [loadingProcedures, setLoadingProcedures] = useState(true);
    const [userClub, setUserClub] = useState<any>(null);

    // Modal / Selection State
    const [selectedFee, setSelectedFee] = useState<any>(null); // The fee item selected ({title, price})
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [operationNumber, setOperationNumber] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const { clubId, loading: authLoading, error: authError } = useClubAuth();

    useEffect(() => {
        if (clubId) fetchProcedures(clubId);
    }, [clubId]);

    // ... fetchProcedures methods ...

    const fetchProcedures = async (id: string) => {
        setLoadingProcedures(true);
        const { data, error } = await supabase
            .from('procedures')
            .select('*')
            .eq('club_id', id)
            .order('created_at', { ascending: false });

        if (data) setProcedures(data);
        setLoadingProcedures(false);
    };

    const openTramite = (fee: any) => {
        setSelectedFee(fee);
        setIsModalOpen(true);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedFee || !clubId) return;

        setSubmitting(true);
        try {
            // Upload file
            const fileExt = file.name.split('.').pop();
            const fileName = `${clubId}/${Date.now()}.${fileExt}`;
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('receipts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Create procedure in DB
            // Assuming table 'procedures' exists as implied by state name
            const { error: insertError } = await supabase
                .from('procedures')
                .insert({
                    club_id: clubId,
                    type: 'payment',
                    title: selectedFee.title,
                    amount: parseInt(String(selectedFee.price).replace(/\D/g, '') || '0'),
                    status: 'en_revision',
                    code: operationNumber, // storing operation number in code or metadata
                    metadata: {
                        operation_number: operationNumber,
                        receipt_path: uploadData?.path,
                        fee_title: selectedFee.title
                    }
                });

            if (insertError) throw insertError;

            // Refresh and close
            fetchProcedures(clubId);
            setIsModalOpen(false);
            setOperationNumber('');
            setFile(null);
            setSelectedFee(null);
        } catch (error) {
            console.error('Error submitting procedure:', error);
            alert('Hubo un error al enviar el trámite via.');
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loadingSettings || loadingProcedures) return <div className="p-12 text-center text-white">Cargando trámites...</div>;

    if (authError) return <div className="p-12 text-center text-red-500">Error: {authError}</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 pb-24 font-sans">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Trámites Administrativos</h1>
                    <p className="text-zinc-400 font-medium text-lg">Gestiona pagos, inscripciones y solicitudes ante la Federación.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COL 1: TRÁMITES DISPONIBLES (Fees) */}
                <div className="lg:col-span-2 space-y-8">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-tdf-blue">
                        <FileText size={24} /> Trámites Disponibles
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {settings?.procedure_fees?.map((fee: any, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => openTramite(fee)}
                                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-tdf-blue p-6 rounded-2xl transition text-left group flex flex-col justify-between h-40 shadow-lg relative overflow-hidden"
                            >
                                <div className="relative z-10">
                                    <h3 className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors mb-1">{fee.title}</h3>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Arancel Oficial</span>
                                </div>
                                <div className="relative z-10 flex items-end justify-between w-full mt-4">
                                    <div className="text-2xl font-black text-white">$ {parseInt(fee.price).toLocaleString('es-AR')}</div>
                                    <span className="bg-white text-black text-xs font-black px-3 py-1.5 rounded-lg group-hover:scale-105 transition-transform">INICIAR &rarr;</span>
                                </div>
                                {/* Decoracion */}
                                <div className="absolute -right-4 -bottom-4 text-zinc-800 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <FileText size={100} />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* HISTORIAL */}
                    <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-400 mt-12">
                        Historial de Solicitudes
                    </h2>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        {procedures.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 italic">No tienes trámites realizados.</div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                {procedures.map(proc => (
                                    <div key={proc.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition">
                                        <div>
                                            <h4 className="font-bold text-white">{proc.title}</h4>
                                            <div className="text-xs text-zinc-500 flex gap-3 mt-1">
                                                <span>Fecha: {new Date(proc.created_at).toLocaleDateString()}</span>
                                                <span>Cod: {proc.code}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${proc.status === 'aprobado' ? 'bg-green-500/10 text-green-500' :
                                                proc.status === 'rechazado' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {proc.status === 'en_revision' ? 'En Revisión' : proc.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* COL 2: INSTRUCTIONS / HELP */}
                <div className="lg:col-span-1">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-8">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="text-tdf-orange" /> Importante
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                            Todos los trámites deben abonarse mediante transferencia bancaria a la cuenta oficial de la Federación.
                            Debes adjuntar el comprobante de pago para que el trámite sea procesado.
                        </p>
                        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Cuenta Oficial</h4>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-zinc-500 block">Banco</span>
                                    <span className="font-bold text-sm text-white">{settings?.bank_name || 'No configurado'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 block">Alias</span>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-white font-mono">{settings?.bank_alias || '-'}</span>
                                        {settings?.bank_alias && <button onClick={() => handleCopy(settings.bank_alias)} className="text-zinc-500 hover:text-white"><Copy size={14} /></button>}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 block">CBU</span>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-white font-mono truncate max-w-[150px]">{settings?.bank_cbu || '-'}</span>
                                        {settings?.bank_cbu && <button onClick={() => handleCopy(settings.bank_cbu)} className="text-zinc-500 hover:text-white"><Copy size={14} /></button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE NUEVO TRAMITE */}
            {isModalOpen && selectedFee && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition"><X /></button>

                        <h3 className="text-2xl font-black text-white mb-1">{selectedFee.title}</h3>
                        <p className="text-zinc-400 text-sm font-medium mb-6">Completa los datos del pago.</p>

                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 flex justify-between items-center">
                            <span className="text-zinc-400 font-bold text-sm">Monto a Pagar:</span>
                            <span className="text-2xl font-black text-white">$ {parseInt(selectedFee.price).toLocaleString('es-AR')}</span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">N° Operación / Transferencia</label>
                                <input
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-bold text-white outline-none focus:border-tdf-blue"
                                    placeholder="Ej: 12345678"
                                    value={operationNumber}
                                    onChange={e => setOperationNumber(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Comprobante (Imagen/PDF)</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        required
                                        accept="image/*,.pdf"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    <div className={`
                                w-full bg-zinc-950 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition
                                ${file ? 'border-green-500/50 bg-green-500/5' : 'border-zinc-800 group-hover:border-zinc-600'}
                            `}>
                                        {file ? (
                                            <>
                                                <CheckCircle className="text-green-500 mb-2" size={32} />
                                                <span className="text-sm font-bold text-white max-w-full truncate px-4">{file.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="text-zinc-500 mb-2" size={32} />
                                                <span className="text-sm font-bold text-zinc-400">Click para subir comprobante</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={submitting}
                                className="w-full py-4 bg-tdf-blue hover:bg-blue-600 text-white font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-4"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Enviar Solicitud</>}
                            </button>
                            <p className="text-center text-xs text-zinc-500">
                                La Federación verificará el pago en las próximas 48hs.
                            </p>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}