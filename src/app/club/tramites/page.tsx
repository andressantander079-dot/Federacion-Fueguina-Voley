// src/app/club/tramites/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Upload, Plus, Download, Clock, CheckCircle, 
  XCircle, AlertCircle, ArrowLeft, DollarSign, 
  Briefcase, Gavel, File, Check
} from 'lucide-react';

// Lista de Bancos para el desplegable
const BANCOS = [
  "Banco Nación", "Banco Galicia", "Banco Santander", 
  "Banco Provincia", "BBVA", "Banco Macro", 
  "ICBC", "Banco Credicoop", "Banco Ciudad", 
  "Mercado Pago", "Otro"
];

export default function TramitesClub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Usuario
  const [teamId, setTeamId] = useState<string | null>(null);

  // Datos
  const [procedures, setProcedures] = useState<any[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({}); 

  // Estados UI (Cambiamos 'Legales' por 'Sanciones')
  const [activeTab, setActiveTab] = useState<'Pagos' | 'Pases' | 'Sanciones'>('Pagos');
  const [viewMode, setViewMode] = useState<'lista' | 'nuevo'>('lista');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Formulario Nuevo (Agregamos campos nuevos)
  const [newProc, setNewProc] = useState({
    title: '',
    amount: '',
    payment_date: '',
    operation_number: '', // Nuevo
    bank_name: '',        // Nuevo
    attachment: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

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

  async function crearTramite(e: React.FormEvent) {
    e.preventDefault();
    
    // Validaciones
    if (!newProc.title || !newProc.attachment) return alert("Faltan datos obligatorios (Título o Archivo).");
    
    // Validación específica para PAGOS
    if (activeTab === 'Pagos') {
        if (!newProc.amount || !newProc.payment_date || !newProc.operation_number || !newProc.bank_name) {
            return alert("En pagos, debes completar Monto, Fecha, Banco y N° de Operación.");
        }
    }

    setUploading(true);
    try {
      // 1. Subir Archivo
      const fileExt = newProc.attachment.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: upError } = await supabase.storage.from('procedure-files').upload(fileName, newProc.attachment);
      if (upError) throw upError;

      const { data: publicUrl } = supabase.storage.from('procedure-files').getPublicUrl(fileName);

      // 2. Crear Registro (Incluyendo los campos nuevos)
      const { error: dbError } = await supabase.from('procedures').insert([{
        team_id: teamId,
        category: activeTab,
        title: newProc.title,
        amount: newProc.amount ? parseFloat(newProc.amount) : null,
        payment_date: newProc.payment_date || null,
        operation_number: newProc.operation_number || null, // Nuevo
        bank_name: newProc.bank_name || null,               // Nuevo
        attachment_url: publicUrl.publicUrl,
        code: Math.random().toString(36).substring(2, 10).toUpperCase()
      }]);

      if (dbError) throw dbError;

      // 3. Reset
      setNewProc({ title: '', amount: '', payment_date: '', operation_number: '', bank_name: '', attachment: null });
      setViewMode('lista');
      cargarTramites(teamId!);

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  const descargarComprobante = (proc: any) => {
    const content = `COMPROBANTE OFICIAL - TRÁMITE ${proc.code}\nFecha: ${new Date(proc.created_at).toLocaleString()}\nTrámite: ${proc.title}\nEstado: ${proc.status}\n\nDetalles:\n${proc.amount ? `Monto: $${proc.amount}\nBanco: ${proc.bank_name}\nOperación: ${proc.operation_number}` : ''}`;
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando Gestiones...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 sticky top-0 z-20">
        <Link href="/club/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20}/></Link>
        <h1 className="font-black text-xl text-slate-800">Trámites Federativos</h1>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

        {/* --- TABLERO SEMÁFORO --- */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-yellow-600">{procedures.filter(p => p.status === 'en_revision').length}</span>
                <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide mt-1 flex items-center gap-1"><Clock size={12}/> En Revisión</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-emerald-600">{procedures.filter(p => p.status === 'aprobado').length}</span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide mt-1 flex items-center gap-1"><CheckCircle size={12}/> Aprobados</span>
            </div>
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-red-600">{procedures.filter(p => p.status === 'rechazado').length}</span>
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide mt-1 flex items-center gap-1"><XCircle size={12}/> Rechazados</span>
            </div>
        </div>

        {/* --- TABS DE NAVEGACIÓN --- */}
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
                    {tab === 'Sanciones' ? 'Sanciones Jugadores' : tab}
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
                    {activeTab === 'Sanciones' ? 'Presentar Descargo / Sanción' : `Iniciar Trámite de ${activeTab}`}
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
                                        {proc.category === 'Sanciones' ? <Gavel size={20}/> : <FileText size={20}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{proc.title}</h3>
                                        <p className="text-xs text-slate-500 font-mono mt-1">COD: {proc.code}</p>
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
                                            {/* DETALLES DE PAGO (NUEVO) */}
                                            {proc.category === 'Pagos' && proc.amount && (
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                                    <div className="flex justify-between"><span className="text-slate-500">Monto</span><span className="font-bold">${proc.amount}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Banco</span><span className="font-bold">{proc.bank_name || '-'}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Operación</span><span className="font-mono font-bold text-xs">{proc.operation_number || '-'}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Fecha Pago</span><span className="font-bold">{proc.payment_date}</span></div>
                                                </div>
                                            )}
                                            
                                            <div className="flex gap-2 mt-4">
                                                <a href={proc.attachment_url} target="_blank" className="flex-1 bg-white border border-slate-300 py-2 rounded-lg text-center font-bold text-slate-700 hover:bg-slate-50 flex justify-center gap-2 items-center">
                                                    <Download size={14}/> Ver Adjunto
                                                </a>
                                                <button onClick={(e) => { e.stopPropagation(); descargarComprobante(proc); }} className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-black flex justify-center gap-2 items-center">
                                                    <File size={14}/> Ticket
                                                </button>
                                            </div>
                                        </div>
                                        <div className="border-l-2 border-slate-200 pl-4 space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase">Historial</h4>
                                            {!historyMap[proc.id] ? <p className="text-xs text-slate-400 italic">Cargando...</p> : historyMap[proc.id].map((h: any) => (
                                                <div key={h.id} className="relative">
                                                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                                                    <p className="text-xs font-bold text-slate-700">{h.status.toUpperCase()}</p>
                                                    <p className="text-[10px] text-slate-500">{h.comment}</p>
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
                        {activeTab === 'Sanciones' ? 'Nueva Gestión de Sanción' : `Nuevo Trámite: ${activeTab}`}
                    </h2>
                    <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition">
                        <Download size={14}/> Descargar Modelo
                    </button>
                </div>

                <form onSubmit={crearTramite} className="space-y-6 max-w-lg mx-auto">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Referencia / Título</label>
                        <input 
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition bg-slate-50"
                            placeholder={activeTab === 'Pagos' ? "Ej: Cuota Inscripción 2026" : activeTab === 'Sanciones' ? "Ej: Descargo Jugadora X - Fecha 4" : "Ej: Solicitud Pase"}
                            value={newProc.title}
                            onChange={e => setNewProc({...newProc, title: e.target.value})}
                        />
                    </div>

                    {/* CAMPOS EXCLUSIVOS PARA PAGOS */}
                    {activeTab === 'Pagos' && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase">Detalles de Transferencia</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Monto ($)</label>
                                    <input type="number" className="w-full p-3 border border-slate-200 rounded-xl bg-white" placeholder="0.00" value={newProc.amount} onChange={e => setNewProc({...newProc, amount: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fecha</label>
                                    <input type="date" className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={newProc.payment_date} onChange={e => setNewProc({...newProc, payment_date: e.target.value})}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Banco Destino</label>
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

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setNewProc({...newProc, attachment: e.target.files?.[0] || null})} accept="image/*,application/pdf"/>
                        {newProc.attachment ? (
                            <div className="text-green-600 font-bold flex flex-col items-center"><CheckCircle size={32} className="mb-2"/><span className="text-sm">{newProc.attachment.name}</span></div>
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center"><Upload size={32} className="mb-2"/><span className="text-sm font-medium">Adjuntar Comprobante / Nota</span></div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setViewMode('lista')} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Cancelar</button>
                        <button disabled={uploading} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg">{uploading ? 'Enviando...' : 'Enviar Trámite'}</button>
                    </div>
                </form>
            </div>
        )}

      </div>
    </div>
  );
}