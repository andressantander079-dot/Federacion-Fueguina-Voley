// src/app/club/tramites/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import {
    FileText, Upload, Plus, Download, Clock, CheckCircle,
    XCircle, AlertCircle, ArrowLeft, DollarSign,
    Briefcase, Gavel, File, Copy, CreditCard, Shield
} from 'lucide-react';

const BANCOS = [
    "Banco Nación", "Banco Galicia", "Banco Santander",
    "Banco Provincia", "BBVA", "Banco Macro",
    "ICBC", "Banco Credicoop", "Banco Ciudad",
    "Mercado Pago", "Otro"
];

export default function TramitesClub() {
    const router = useRouter();
    const { settings: config, loading: configLoading } = useSettings();
    const [loading, setLoading] = useState(true);

    // Usuario
    const [teamId, setTeamId] = useState<string | null>(null);

    // Datos
    const [procedures, setProcedures] = useState<any[]>([]);
    const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});

    // Estados UI
    const [activeTab, setActiveTab] = useState<'Pagos' | 'Pases' | 'Sanciones'>('Pagos');
    const [viewMode, setViewMode] = useState<'lista' | 'nuevo'>('lista');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Formulario Nuevo
    const [paymentConcept, setPaymentConcept] = useState('libre');
    const [newProc, setNewProc] = useState({
        title: '',
        amount: '',
        payment_date: '',
        operation_number: '',
        bank_name: '',
        attachment: null as File | null
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        inicializar();
    }, []);

    useEffect(() => {
        if (activeTab === 'Pagos' && !configLoading) {
            let monto = '';
            let titulo = '';

            switch (paymentConcept) {
                case 'arancel_jugador':
                    monto = config.arancel_jugador.toString();
                    titulo = 'Fichaje / Seguro Jugador';
                    break;
                case 'arancel_equipo':
                    monto = config.arancel_equipo.toString();
                    titulo = 'Inscripción de Equipo';
                    break;
                case 'arancel_pase':
                    monto = config.arancel_pase.toString();
                    titulo = 'Costo de Pase';
                    break;
                default:
                    break;
            }

            if (paymentConcept !== 'libre') {
                setNewProc(prev => ({ ...prev, amount: monto, title: titulo }));
            } else if (viewMode === 'nuevo' && newProc.title === '') {
                setNewProc(prev => ({ ...prev, amount: '', title: '' }));
            }
        }
    }, [paymentConcept, config, activeTab, viewMode]);


    async function inicializar() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        const { data: perfil } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
        if (!perfil?.club_id) return router.push('/club');
        setTeamId(perfil.club_id);

        cargarTramites(perfil.club_id);
    }

    async function cargarTramites(idClub: string) {
        const { data } = await supabase
            .from('procedures')
            .select('*')
            .eq('team_id', idClub)
            .order('created_at', { ascending: false });

        setProcedures(data || []);
        setLoading(false);
    }

    async function toggleExpand(procId: string) {
        if (expandedId === procId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(procId);
        if (!historyMap[procId]) {
            const { data } = await supabase.from('procedure_history').select('*').eq('procedure_id', procId).order('created_at', { ascending: false });
            setHistoryMap(prev => ({ ...prev, [procId]: data || [] }));
        }
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado: " + text);
    };

    async function crearTramite(e: React.FormEvent) {
        e.preventDefault();

        if (!newProc.title || !newProc.attachment) return alert("Faltan datos obligatorios (Título o Archivo).");

        if (activeTab === 'Pagos') {
            if (!newProc.amount || !newProc.payment_date || !newProc.operation_number || !newProc.bank_name) {
                return alert("En pagos, debes completar Monto, Fecha, Banco y N° de Operación.");
            }
        }

        setUploading(true);
        try {
            const fileExt = newProc.attachment.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: upError } = await supabase.storage.from('procedure-files').upload(fileName, newProc.attachment);
            if (upError) throw upError;

            const { data: publicUrl } = supabase.storage.from('procedure-files').getPublicUrl(fileName);

            const { error: dbError } = await supabase.from('procedures').insert([{
                team_id: teamId,
                category: activeTab,
                title: newProc.title,
                amount: newProc.amount ? parseFloat(newProc.amount) : null,
                payment_date: newProc.payment_date || null,
                operation_number: newProc.operation_number || null,
                bank_name: newProc.bank_name || null,
                attachment_url: publicUrl.publicUrl,
                code: Math.random().toString(36).substring(2, 10).toUpperCase()
            }]);

            if (dbError) throw dbError;

            setNewProc({ title: '', amount: '', payment_date: '', operation_number: '', bank_name: '', attachment: null });
            setPaymentConcept('libre');
            setViewMode('lista');
            cargarTramites(teamId!);

        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setUploading(false);
        }
    }

    const descargarComprobante = (proc: any) => {
        const content = `COMPROBANTE OFICIAL\nTrámite: ${proc.code}\nFecha: ${new Date(proc.created_at).toLocaleString()}\nAsunto: ${proc.title}\nEstado: ${proc.status}\n\n${proc.amount ? `Monto: $${proc.amount}\nBanco: ${proc.bank_name}\nOp: ${proc.operation_number}` : ''}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ticket-${proc.code}.txt`;
        a.click();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'aprobado': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'rechazado': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        }
    };

    const proceduresFiltered = procedures.filter(p => p.category === activeTab);

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center">
                <Briefcase size={48} className="text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Gestiones...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 font-sans pb-20 text-white">

            {/* HEADER */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-3 sticky top-0 z-20">
                <Link href="/club" className="p-2 hover:bg-zinc-800 rounded-full transition text-zinc-400"><ArrowLeft size={20} /></Link>
                <h1 className="font-black text-xl text-white">Trámites Federativos</h1>
            </div>

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

                {/* DASHBOARD STATUS */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-yellow-500">{procedures.filter(p => p.status === 'en_revision').length}</span>
                        <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide mt-1 flex items-center gap-1"><Clock size={12} /> Revisión</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-emerald-500">{procedures.filter(p => p.status === 'aprobado').length}</span>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide mt-1 flex items-center gap-1"><CheckCircle size={12} /> OK</span>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-red-500">{procedures.filter(p => p.status === 'rechazado').length}</span>
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wide mt-1 flex items-center gap-1"><XCircle size={12} /> Error</span>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-sm">
                    {(['Pagos', 'Pases', 'Sanciones'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setViewMode('lista'); }}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                        >
                            {tab === 'Pagos' && <DollarSign size={16} />}
                            {tab === 'Pases' && <Briefcase size={16} />}
                            {tab === 'Sanciones' && <Gavel size={16} />}
                            {tab === 'Sanciones' ? 'Sanciones' : tab}
                        </button>
                    ))}
                </div>

                {/* --- VISTA: LISTA --- */}
                {viewMode === 'lista' && (
                    <div className="space-y-4 animate-in fade-in">
                        <button
                            onClick={() => setViewMode('nuevo')}
                            className="w-full py-4 border-2 border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-900 hover:text-white transition hover:border-zinc-500"
                        >
                            <Plus size={20} />
                            {activeTab === 'Pagos' ? 'Informar Nuevo Pago' : activeTab === 'Pases' ? 'Solicitar Pase' : 'Presentar Descargo'}
                        </button>

                        {proceduresFiltered.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600">
                                <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                <p>No hay registros en {activeTab}.</p>
                            </div>
                        ) : (
                            proceduresFiltered.map(proc => (
                                <div key={proc.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition hover:border-zinc-700">
                                    <div className="p-5 flex items-start justify-between cursor-pointer" onClick={() => toggleExpand(proc.id)}>
                                        <div className="flex gap-4 items-center">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${proc.category === 'Pagos' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {proc.category === 'Pagos' ? <DollarSign size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-zinc-200">{proc.title}</h3>
                                                <p className="text-xs text-zinc-500 font-mono mt-1">Ref: {proc.code}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(proc.status)}`}>
                                                {proc.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-zinc-500">{new Date(proc.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {expandedId === proc.id && (
                                        <div className="bg-zinc-950/50 border-t border-zinc-800 p-5 animate-in slide-in-from-top-2">
                                            {proc.status === 'rechazado' && proc.rejection_reason && (
                                                <div className="mb-4 bg-red-500/10 text-red-400 p-3 rounded-lg text-sm font-medium flex gap-2 items-start border border-red-500/20">
                                                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                                    <div><span className="font-bold block uppercase text-[10px]">Motivo del Rechazo:</span>{proc.rejection_reason}</div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3 text-sm">
                                                    {/* DETALLES DEL TRÁMITE */}
                                                    {proc.category === 'Pagos' && proc.amount && (
                                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                                                            <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2"><span className="text-zinc-500 text-xs uppercase font-bold">Detalle</span><span className="font-bold text-zinc-300">Transferencia</span></div>
                                                            <div className="flex justify-between"><span className="text-zinc-500">Monto</span><span className="font-black text-lg text-emerald-400">${proc.amount}</span></div>
                                                            <div className="flex justify-between"><span className="text-zinc-500">Banco</span><span className="font-bold text-zinc-300">{proc.bank_name || '-'}</span></div>
                                                            <div className="flex justify-between"><span className="text-zinc-500">N° Op</span><span className="font-mono font-bold text-xs bg-zinc-800 px-2 rounded text-zinc-300">{proc.operation_number || '-'}</span></div>
                                                            <div className="flex justify-between"><span className="text-zinc-500">Fecha</span><span className="font-bold text-zinc-300">{proc.payment_date}</span></div>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 mt-4">
                                                        <a href={proc.attachment_url} target="_blank" className="flex-1 bg-zinc-800 border border-zinc-700 py-2 rounded-lg text-center font-bold text-zinc-300 hover:bg-zinc-700 flex justify-center gap-2 items-center transition">
                                                            <Download size={14} /> Comprobante
                                                        </a>
                                                        <button onClick={(e) => { e.stopPropagation(); descargarComprobante(proc); }} className="flex-1 bg-white text-black py-2 rounded-lg font-bold hover:bg-zinc-200 flex justify-center gap-2 items-center transition">
                                                            <File size={14} /> Ticket
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="border-l-2 border-zinc-800 pl-4 space-y-4">
                                                    <h4 className="text-xs font-bold text-zinc-500 uppercase">Historial de Cambios</h4>
                                                    {!historyMap[proc.id] ? <p className="text-xs text-zinc-600 italic">Cargando...</p> : historyMap[proc.id].map((h: any) => (
                                                        <div key={h.id} className="relative pl-4 border-l border-zinc-700 last:border-0">
                                                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-600 border-2 border-zinc-900"></div>
                                                            <p className="text-xs font-bold text-zinc-300">{h.status.replace('_', ' ').toUpperCase()}</p>
                                                            {h.comment && <p className="text-[10px] text-zinc-400 italic">"{h.comment}"</p>}
                                                            <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- VISTA: NUEVO --- */}
                {viewMode === 'nuevo' && (
                    <div className="bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-800 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {activeTab === 'Pagos' ? 'Informar Pago' : activeTab === 'Sanciones' ? 'Nueva Sanción / Descargo' : 'Nuevo Pase'}
                            </h2>
                            <button className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-500/20 transition">
                                <Download size={14} /> Guía
                            </button>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* COLUMNA IZQUIERDA: TARJETA BANCARIA (SOLO EN PAGOS) */}
                            {activeTab === 'Pagos' && (
                                <div className="order-2 lg:order-1">
                                    <div className="bg-gradient-to-br from-zinc-800 to-black rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden border border-zinc-700">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Banco Oficial</p>
                                                    <h3 className="text-xl font-bold">{config.banco_nombre || 'Consultar'}</h3>
                                                </div>
                                                <CreditCard className="text-white/20" size={32} />
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">CBU / CVU</p>
                                                    <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                                                        <span className="font-mono text-sm md:text-base tracking-wider truncate">{config.banco_cbu || '---'}</span>
                                                        <button onClick={() => handleCopy(config.banco_cbu)} className="p-1 hover:bg-white/20 rounded"><Copy size={12} /></button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <div>
                                                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Alias</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-yellow-500 text-lg">{config.banco_alias || '---'}</span>
                                                            <button onClick={() => handleCopy(config.banco_alias)} className="p-1 hover:bg-white/20 rounded"><Copy size={12} /></button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Titular: <span className="text-white normal-case font-medium">{config.banco_titular}</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-900 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                                    </div>
                                    <div className="mt-4 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-xs text-blue-300">
                                        <strong>Importante:</strong> Los pagos informados después de las 18:00hs se procesarán al día siguiente hábil.
                                    </div>
                                </div>
                            )}

                            {/* COLUMNA DERECHA: FORMULARIO */}
                            <div className={`order-1 lg:order-2 ${activeTab !== 'Pagos' ? 'lg:col-span-2 max-w-2xl mx-auto w-full' : ''}`}>
                                <form onSubmit={crearTramite} className="space-y-5">

                                    {/* SELECTOR DE CONCEPTO (SOLO PAGOS) */}
                                    {activeTab === 'Pagos' ? (
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Concepto del Pago</label>
                                            <select
                                                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-bold text-zinc-300 outline-none focus:border-blue-500 cursor-pointer"
                                                value={paymentConcept}
                                                onChange={(e) => setPaymentConcept(e.target.value)}
                                            >
                                                <option value="libre">Otro (Monto Libre)</option>
                                                <option value="arancel_equipo">Inscripción Equipo (${config.arancel_equipo})</option>
                                                <option value="arancel_jugador">Fichaje Jugador (${config.arancel_jugador})</option>
                                                <option value="arancel_pase">Pase Interclub (${config.arancel_pase})</option>
                                            </select>
                                        </div>
                                    ) : null}

                                    {/* TITULO / REFERENCIA */}
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Referencia / Detalle</label>
                                        <input
                                            className={`w-full p-3 border border-zinc-800 rounded-xl outline-none focus:border-blue-500 transition ${paymentConcept !== 'libre' && activeTab === 'Pagos' ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-950 text-white'}`}
                                            placeholder={activeTab === 'Sanciones' ? "Ej: Descargo Jugadora X" : "Ej: Solicitud..."}
                                            value={newProc.title}
                                            onChange={e => setNewProc({ ...newProc, title: e.target.value })}
                                            readOnly={activeTab === 'Pagos' && paymentConcept !== 'libre'}
                                        />
                                    </div>

                                    {/* CAMPOS DE PAGO */}
                                    {activeTab === 'Pagos' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Monto ($)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            className={`w-full p-3 border border-zinc-800 rounded-xl outline-none ${paymentConcept !== 'libre' ? 'bg-emerald-500/10 text-emerald-500 font-bold border-emerald-500/30' : 'bg-zinc-950 text-white'}`}
                                                            placeholder="0.00"
                                                            value={newProc.amount}
                                                            onChange={e => setNewProc({ ...newProc, amount: e.target.value })}
                                                            readOnly={paymentConcept !== 'libre'}
                                                        />
                                                        {paymentConcept !== 'libre' && <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Fecha Pago</label>
                                                    <input type="date" className="w-full p-3 border border-zinc-800 rounded-xl bg-zinc-950 text-white" value={newProc.payment_date} onChange={e => setNewProc({ ...newProc, payment_date: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Banco Origen</label>
                                                    <select className="w-full p-3 border border-zinc-800 rounded-xl bg-zinc-950 text-white outline-none" value={newProc.bank_name} onChange={e => setNewProc({ ...newProc, bank_name: e.target.value })}>
                                                        <option value="">Seleccionar...</option>
                                                        {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">N° Operación</label>
                                                    <input className="w-full p-3 border border-zinc-800 rounded-xl bg-zinc-950 text-white placeholder-zinc-700" placeholder="Ej: 12345678" value={newProc.operation_number} onChange={e => setNewProc({ ...newProc, operation_number: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ADJUNTO */}
                                    <div className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center hover:bg-zinc-900/50 transition cursor-pointer relative group">
                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setNewProc({ ...newProc, attachment: e.target.files?.[0] || null })} accept="image/*,application/pdf" />
                                        {newProc.attachment ? (
                                            <div className="text-emerald-500 font-bold flex flex-col items-center">
                                                <div className="bg-emerald-500/10 p-2 rounded-full mb-2"><CheckCircle size={24} /></div>
                                                <span className="text-sm">{newProc.attachment.name}</span>
                                                <span className="text-xs text-emerald-600 font-medium mt-1">Listo para subir</span>
                                            </div>
                                        ) : (
                                            <div className="text-zinc-500 flex flex-col items-center group-hover:text-blue-400 transition">
                                                <Upload size={32} className="mb-2" />
                                                <span className="text-sm font-bold">Adjuntar Comprobante / Nota</span>
                                                <span className="text-xs mt-1 text-zinc-600">PDF o Imagen (Máx 5MB)</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* BOTONES */}
                                    <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                        <button type="button" onClick={() => setViewMode('lista')} className="flex-1 py-4 text-zinc-500 font-bold hover:bg-zinc-900 rounded-xl transition">Cancelar</button>
                                        <button disabled={uploading} className="flex-1 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-300 transition shadow-lg flex items-center justify-center gap-2">
                                            {uploading ? 'Enviando...' : `Confirmar ${activeTab === 'Pagos' ? 'Pago' : 'Trámite'}`}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}