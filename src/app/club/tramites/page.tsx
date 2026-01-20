// src/app/club/tramites/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useConfig } from '../../../lib/useConfig'; // <--- 1. IMPORTAMOS EL CEREBRO
import Link from 'next/link';
import { 
  FileText, Upload, Plus, Download, Clock, CheckCircle, 
  XCircle, AlertCircle, ArrowLeft, DollarSign, 
  Briefcase, Gavel, File, Copy, CreditCard
} from 'lucide-react';

const BANCOS = [
  "Banco Nación", "Banco Galicia", "Banco Santander", 
  "Banco Provincia", "BBVA", "Banco Macro", 
  "ICBC", "Banco Credicoop", "Banco Ciudad", 
  "Mercado Pago", "Otro"
];

export default function TramitesClub() {
  const router = useRouter();
  const { config, loading: configLoading } = useConfig(); // <--- 2. USAMOS LA CONFIGURACIÓN
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
  const [paymentConcept, setPaymentConcept] = useState('libre'); // Estado para el selector de concepto
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

  // <--- 3. EFECTO CALCULADORA: Si cambia el concepto, cambia el precio y título --->
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
          // Si es libre, no tocamos el monto si ya escribió algo, pero limpiamos el título si estaba automático
          break;
      }

      if (paymentConcept !== 'libre') {
        setNewProc(prev => ({ ...prev, amount: monto, title: titulo }));
      } else if (viewMode === 'nuevo' && newProc.title === '') {
         // Limpiar si vuelve a libre y estaba vacio
         setNewProc(prev => ({ ...prev, amount: '', title: '' }));
      }
    }
  }, [paymentConcept, config, activeTab, viewMode]);


  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: perfil } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
    if (!perfil?.team_id) return router.push('/club/dashboard');
    setTeamId(perfil.team_id);

    cargarTramites(perfil.team_id);
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
      setPaymentConcept('libre'); // Resetear selector
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
    switch(status) {
      case 'aprobado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rechazado': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const proceduresFiltered = procedures.filter(p => p.category === activeTab);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando Gestiones...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 sticky top-0 z-20">
        <Link href="/club/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20}/></Link>
        <h1 className="font-black text-xl text-slate-800">Trámites Federativos</h1>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

        {/* DASHBOARD STATUS */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-yellow-600">{procedures.filter(p => p.status === 'en_revision').length}</span>
                <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide mt-1 flex items-center gap-1"><Clock size={12}/> Revisión</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-emerald-600">{procedures.filter(p => p.status === 'aprobado').length}</span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide mt-1 flex items-center gap-1"><CheckCircle size={12}/> OK</span>
            </div>
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-red-600">{procedures.filter(p => p.status === 'rechazado').length}</span>
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide mt-1 flex items-center gap-1"><XCircle size={12}/> Error</span>
            </div>
        </div>

        {/* TABS */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['Pagos', 'Pases', 'Sanciones'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setViewMode('lista'); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    {tab === 'Pagos' && <DollarSign size={16}/>}
                    {tab === 'Pases' && <Briefcase size={16}/>}
                    {tab === 'Sanciones' && <Gavel size={16}/>}
                    {tab === 'Sanciones' ? 'Sanciones' : tab}
                </button>
            ))}
        </div>

        {/* --- VISTA: LISTA --- */}
        {viewMode === 'lista' && (
            <div className="space-y-4 animate-in fade-in">
                <button 
                    onClick={() => setViewMode('nuevo')}
                    className="w-full py-4 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition"
                >
                    <Plus size={20}/> 
                    {activeTab === 'Pagos' ? 'Informar Nuevo Pago' : activeTab === 'Pases' ? 'Solicitar Pase' : 'Presentar Descargo'}
                </button>

                {proceduresFiltered.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>No hay registros en {activeTab}.</p>
                    </div>
                ) : (
                    proceduresFiltered.map(proc => (
                        <div key={proc.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition hover:shadow-md">
                            <div className="p-5 flex items-start justify-between cursor-pointer" onClick={() => toggleExpand(proc.id)}>
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${proc.category === 'Pagos' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {proc.category === 'Pagos' ? <DollarSign size={20}/> : <FileText size={20}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{proc.title}</h3>
                                        <p className="text-xs text-slate-500 font-mono mt-1">Ref: {proc.code}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(proc.status)}`}>
                                        {proc.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-slate-400">{new Date(proc.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {expandedId === proc.id && (
                                <div className="bg-slate-50 border-t border-slate-100 p-5 animate-in slide-in-from-top-2">
                                    {proc.status === 'rechazado' && proc.rejection_reason && (
                                        <div className="mb-4 bg-red-100 text-red-800 p-3 rounded-lg text-sm font-medium flex gap-2 items-start border border-red-200">
                                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0"/>
                                            <div><span className="font-bold block uppercase text-[10px]">Motivo del Rechazo:</span>{proc.rejection_reason}</div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3 text-sm">
                                            {/* DETALLES DEL TRÁMITE */}
                                            {proc.category === 'Pagos' && proc.amount && (
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                                                    <div className="flex justify-between border-b border-slate-100 pb-2 mb-2"><span className="text-slate-500 text-xs uppercase font-bold">Detalle</span><span className="font-bold text-slate-800">Transferencia</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Monto</span><span className="font-black text-lg text-green-600">${proc.amount}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Banco</span><span className="font-bold">{proc.bank_name || '-'}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">N° Op</span><span className="font-mono font-bold text-xs bg-slate-100 px-2 rounded">{proc.operation_number || '-'}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Fecha</span><span className="font-bold">{proc.payment_date}</span></div>
                                                </div>
                                            )}
                                            
                                            <div className="flex gap-2 mt-4">
                                                <a href={proc.attachment_url} target="_blank" className="flex-1 bg-white border border-slate-300 py-2 rounded-lg text-center font-bold text-slate-700 hover:bg-slate-50 flex justify-center gap-2 items-center">
                                                    <Download size={14}/> Comprobante
                                                </a>
                                                <button onClick={(e) => { e.stopPropagation(); descargarComprobante(proc); }} className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-black flex justify-center gap-2 items-center">
                                                    <File size={14}/> Ticket
                                                </button>
                                            </div>
                                        </div>
                                        <div className="border-l-2 border-slate-200 pl-4 space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase">Historial de Cambios</h4>
                                            {!historyMap[proc.id] ? <p className="text-xs text-slate-400 italic">Cargando...</p> : historyMap[proc.id].map((h: any) => (
                                                <div key={h.id} className="relative pl-4 border-l border-slate-300 last:border-0">
                                                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                                                    <p className="text-xs font-bold text-slate-700">{h.status.replace('_', ' ').toUpperCase()}</p>
                                                    {h.comment && <p className="text-[10px] text-slate-500 italic">"{h.comment}"</p>}
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
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
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">
                        {activeTab === 'Pagos' ? 'Informar Pago' : activeTab === 'Sanciones' ? 'Nueva Sanción / Descargo' : 'Nuevo Pase'}
                    </h2>
                    <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition">
                        <Download size={14}/> Guía
                    </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* COLUMNA IZQUIERDA: TARJETA BANCARIA (SOLO EN PAGOS) */}
                    {activeTab === 'Pagos' && (
                        <div className="order-2 lg:order-1">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Banco Oficial</p>
                                            <h3 className="text-xl font-bold">{config.banco_nombre || 'Consultar'}</h3>
                                        </div>
                                        <CreditCard className="text-white/20" size={32}/>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">CBU / CVU</p>
                                            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                                                <span className="font-mono text-sm md:text-base tracking-wider truncate">{config.banco_cbu || '---'}</span>
                                                <button onClick={() => handleCopy(config.banco_cbu)} className="p-1 hover:bg-white/20 rounded"><Copy size={12}/></button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Alias</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-yellow-400 text-lg">{config.banco_alias || '---'}</span>
                                                    <button onClick={() => handleCopy(config.banco_alias)} className="p-1 hover:bg-white/20 rounded"><Copy size={12}/></button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Titular: <span className="text-white normal-case font-medium">{config.banco_titular}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                            </div>
                            <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800">
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
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Concepto del Pago</label>
                                    <select 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
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
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Referencia / Detalle</label>
                                <input 
                                    className={`w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition ${paymentConcept !== 'libre' && activeTab === 'Pagos' ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
                                    placeholder={activeTab === 'Sanciones' ? "Ej: Descargo Jugadora X" : "Ej: Solicitud..."}
                                    value={newProc.title}
                                    onChange={e => setNewProc({...newProc, title: e.target.value})}
                                    readOnly={activeTab === 'Pagos' && paymentConcept !== 'libre'}
                                />
                            </div>

                            {/* CAMPOS DE PAGO */}
                            {activeTab === 'Pagos' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Monto ($)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    className={`w-full p-3 border border-slate-200 rounded-xl outline-none ${paymentConcept !== 'libre' ? 'bg-green-50 text-green-700 font-bold border-green-200' : 'bg-white'}`}
                                                    placeholder="0.00" 
                                                    value={newProc.amount} 
                                                    onChange={e => setNewProc({...newProc, amount: e.target.value})}
                                                    readOnly={paymentConcept !== 'libre'}
                                                />
                                                {paymentConcept !== 'libre' && <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"/>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fecha Pago</label>
                                            <input type="date" className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={newProc.payment_date} onChange={e => setNewProc({...newProc, payment_date: e.target.value})}/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Banco Origen</label>
                                            <select className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none" value={newProc.bank_name} onChange={e => setNewProc({...newProc, bank_name: e.target.value})}>
                                                <option value="">Seleccionar...</option>
                                                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">N° Operación</label>
                                            <input className="w-full p-3 border border-slate-200 rounded-xl bg-white" placeholder="Ej: 12345678" value={newProc.operation_number} onChange={e => setNewProc({...newProc, operation_number: e.target.value})}/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ADJUNTO */}
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative group">
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setNewProc({...newProc, attachment: e.target.files?.[0] || null})} accept="image/*,application/pdf"/>
                                {newProc.attachment ? (
                                    <div className="text-green-600 font-bold flex flex-col items-center">
                                        <div className="bg-green-100 p-2 rounded-full mb-2"><CheckCircle size={24}/></div>
                                        <span className="text-sm">{newProc.attachment.name}</span>
                                        <span className="text-xs text-green-500 font-medium mt-1">Listo para subir</span>
                                    </div>
                                ) : (
                                    <div className="text-slate-400 flex flex-col items-center group-hover:text-blue-500 transition">
                                        <Upload size={32} className="mb-2"/>
                                        <span className="text-sm font-bold">Adjuntar Comprobante / Nota</span>
                                        <span className="text-xs mt-1">PDF o Imagen (Máx 5MB)</span>
                                    </div>
                                )}
                            </div>

                            {/* BOTONES */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setViewMode('lista')} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Cancelar</button>
                                <button disabled={uploading} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-2">
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