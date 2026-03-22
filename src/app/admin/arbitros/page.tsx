'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, X, Loader2, User, Phone, CheckCircle, XCircle, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner';

type Referee = {
    id: string
    category: string
    status: string
    created_at: string
    profile: {
        full_name: string
        email: string | null
        phone: string | null
    }
}

const getCategoryStyles = (category: string) => {
    switch (category) {
        case 'Aspirante': return 'bg-[#f5f5dc] dark:bg-[#2d2a23] text-[#4b5563] dark:text-[#d1d5db]';
        case 'Provincial': return 'bg-[#dbeafe] dark:bg-[#1e3a8a] text-[#1e3a8a] dark:text-[#93c5fd]';
        case 'Regional': return 'bg-[#e0f2fe] dark:bg-[#0c4a6e] text-[#0369a1] dark:text-[#7dd3fc]';
        case 'Nacional': return 'bg-[#bfdbfe] dark:bg-[#172554] text-[#1e40af] dark:text-[#bfdbfe]';
        case 'Internacional': return 'bg-gradient-to-r from-yellow-200 to-amber-400 dark:from-yellow-900 dark:to-orange-900 text-yellow-900 dark:text-yellow-100';
        default: return 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400';
    }
}

export default function RefereesAdminPage() {
    const [referees, setReferees] = useState<Referee[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        category: 'Aspirante' // Default
    })

    const supabase = createClient()

    useEffect(() => {
        fetchReferees()
    }, [])

    const fetchReferees = async () => {
        try {
            const { data, error } = await supabase
                .from('referees')
                .select(`
          id, category, status, created_at,
          profile:profiles(full_name, email, phone)
        `)
                .order('created_at', { ascending: false })

            if (data) {
                // @ts-ignore - Supabase types mapping for join
                setReferees(data)
            }
        } catch (err) {
            console.error('Error fetching referees:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateReferee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fullName || !formData.email || !formData.password) return toast.error("Completa los campos obligatorios");

        setCreating(true);
        try {
            const response = await fetch('/api/admin/create-referee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error("Error parsing JSON:", text);
                throw new Error("Respuesta inválida del servidor: " + text.substring(0, 100));
            }

            if (!response.ok) throw new Error(result.error || 'Error creando árbitro');

            // Refresh list
            fetchReferees();

            setFormData({ fullName: '', email: '', password: '', phone: '', category: 'Aspirante' });
            setShowCreateModal(false);
            toast.success(`¡Árbitro Creado! Usuario: ${result.user.email}`);

        } catch (error: any) {
            console.error("Error creating referee:", error);
            toast.error("Error: " + error.message);
        } finally {
            setCreating(false);
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}? Esta acción física no se puede deshacer.`)) return;

        try {
            const response = await fetch('/api/admin/delete-referee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: id })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al eliminar');
            }

            // Update local state
            setReferees(referees.filter(r => r.id !== id));
            toast.success("Árbitro eliminado permanentemente.");

        } catch (error: any) {
            toast.error("Error al eliminar: " + error.message);
        }
    }

    const handleApprove = async (id: string, name: string) => {
        if (!confirm(`¿Aprobar al árbitro ${name} y registrar su inscripción en tesorería?`)) return;

        try {
            const response = await fetch('/api/admin/approve-referee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referee_id: id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al aprobar');
            
            fetchReferees();
            toast.success(`Árbitro aprobado. Ingreso registrado por $${data.feeAmount}`);
        } catch (error: any) {
            toast.error("Error al aprobar: " + error.message);
        }
    }

    const handleReject = async (id: string, name: string) => {
        if (!confirm(`¿Rechazar a ${name}? (Esto ocultará su perfil vía Soft Delete)`)) return;

        try {
            const response = await fetch('/api/admin/reject-referee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referee_id: id })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al rechazar');
            }
            fetchReferees();
            toast.success("Árbitro rechazado correctamente.");
        } catch (error: any) {
            toast.error("Error al rechazar: " + error.message);
        }
    }

    const filteredReferees = referees.filter(r =>
        r.status !== 'rechazado' &&
        (r.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="p-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="text-tdf-blue" />
                        Gestión de Árbitros
                    </h1>
                    <p className="text-gray-500 mt-1">Administra el padrón de árbitros, sus categorías y datos de contacto.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                >
                    <Plus size={20} />
                    Nuevo Árbitro/a
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-8 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none transition-all shadow-sm"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />)
                ) : filteredReferees.length > 0 ? (
                    filteredReferees.map((ref) => (
                        <div key={ref.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all relative group">
                            {ref.status === 'pendiente' ? (
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => handleApprove(ref.id, ref.profile?.full_name)}
                                        title="Aprobar y Cobrar"
                                        className="text-gray-300 hover:text-green-500 transition-colors"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleReject(ref.id, ref.profile?.full_name)}
                                        title="Rechazar"
                                        className="text-gray-300 hover:text-orange-500 transition-colors"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleDelete(ref.id, ref.profile?.full_name)}
                                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 font-bold text-lg">
                                    {ref.profile?.full_name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]" title={ref.profile?.full_name}>
                                        {ref.profile?.full_name || 'Sin Nombre'}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCategoryStyles(ref.category)}`}>
                                            {ref.category}
                                        </span>
                                        {ref.status === 'pendiente' && (
                                            <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-full">
                                                Pendiente Pago
                                            </span>
                                        )}
                                        {ref.status === 'rechazado' && (
                                            <span className="text-xs font-bold px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full">
                                                Rechazado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} />
                                    <span className="truncate">{ref.profile?.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} />
                                    <span>{ref.profile?.phone || 'Sin Teléfono'}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        <p>No se encontraron árbitros.</p>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Nuevo Árbitro/a</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateReferee} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        placeholder="+54 2901..."
                                        className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl appearance-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Aspirante">Aspirante</option>
                                        <option value="Provincial">Provincial</option>
                                        <option value="Regional">Regional</option>
                                        <option value="Nacional">Nacional</option>
                                        <option value="Internacional">Internacional</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full py-3 bg-tdf-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg mt-4 flex justify-center gap-2 disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="animate-spin" /> : 'Crear Perfil'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
