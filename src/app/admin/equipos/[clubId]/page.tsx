'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Users, Plus, Edit, Shield, Save, X, Pencil, Camera, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProfileCropperModal } from '@/components/ui/ProfileCropperModal'

type Squad = {
    id: string
    name: string
    category_id: string
    coach_name: string | null
    players_count?: number
    gender?: string
}

type Club = {
    id: string
    name: string
    city: string
    shield_url: string | null
    has_paid_inscription?: boolean
}

type Category = {
    id: string
    name: string
}

export default function ClubDetailsPage() {
    const params = useParams()
    const clubId = params?.clubId as string
    const router = useRouter()
    const supabase = createClient()

    const [club, setClub] = useState<Club | null>(null)
    const [squads, setSquads] = useState<Squad[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    // UI States
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [togglingPayment, setTogglingPayment] = useState(false)

    // Form States
    const [newSquadCategory, setNewSquadCategory] = useState('')
    const [newSquadName, setNewSquadName] = useState('')
    const [newSquadCoach, setNewSquadCoach] = useState('')
    const [newSquadGender, setNewSquadGender] = useState('Femenino')

    // Editing States
    const [isEditingClub, setIsEditingClub] = useState(false)
    const [tempClubName, setTempClubName] = useState('')
    const [editingSquadId, setEditingSquadId] = useState<string | null>(null)
    const [tempSquadName, setTempSquadName] = useState('')

    // Cropper States
    const [isCroppingShield, setIsCroppingShield] = useState(false)
    const [tempShieldSrc, setTempShieldSrc] = useState<string | null>(null)

    // A helper to upload files (same strategy used across app)
    const uploadFileAPI = async (file: File, bucket: string, path: string) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', bucket)
        formData.append('path', path)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Failed to upload')
        }
        const { publicUrl } = await res.json()
        return publicUrl
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!clubId) return

            try {
                // 1. Fetch Club Details
                const { data: clubData } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('id', clubId)
                    .single()

                if (clubData) setClub(clubData)

                // 2. Fetch Squads
                // Note: We need to join with players count strictly speaking, but for now simple fetch
                const { data: squadsData } = await supabase
                    .from('squads')
                    .select('*')
                    .eq('team_id', clubId)

                if (squadsData) setSquads(squadsData)

                // 3. Fetch Categories for dropdown
                const { data: catData } = await supabase
                    .from('categories')
                    .select('*')
                    .order('name')

                if (catData) setCategories(catData)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [clubId])

    // Auto-generate name when category changes
    useEffect(() => {
        if (newSquadCategory && club) {
            const catName = categories.find(c => c.id === newSquadCategory)?.name
            if (catName) {
                setNewSquadName(`${club.name} ${catName}`)
            }
        }
    }, [newSquadCategory, club, categories])

    const handleCreateSquad = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { data, error } = await supabase
                .from('squads')
                .insert({
                    team_id: clubId,
                    category_id: newSquadCategory,
                    name: newSquadName,
                    coach_name: newSquadCoach,
                    gender: newSquadGender
                })
                .select()
                .single()

            if (error) throw error
            if (data) {
                setSquads([...squads, data])
                setIsCreateModalOpen(false)
                // Reset form
                setNewSquadCategory('')
                setNewSquadName('')
                setNewSquadCoach('')
                setNewSquadGender('Femenino')
            }
        } catch (error: any) {
            console.error('Error creating squad:', JSON.stringify(error, null, 2))
            alert('Error al crear el plantel: ' + (error.message || 'Permisos insuficientes o error desconocido'))
        }
    }

    const saveClubName = async () => {
        if (!tempClubName.trim() || !club || tempClubName === club.name) {
            setIsEditingClub(false)
            return
        }
        try {
            const { error } = await supabase.from('teams').update({ name: tempClubName }).eq('id', club.id)
            if (error) throw error
            setClub({ ...club, name: tempClubName })
            setIsEditingClub(false)
        } catch (error: any) {
            alert('Error guardando nombre del club: ' + error.message)
        }
    }

    const saveSquadName = async (squadId: string) => {
        if (!tempSquadName.trim()) {
            setEditingSquadId(null)
            return
        }
        try {
            const { error } = await supabase.from('squads').update({ name: tempSquadName }).eq('id', squadId)
            if (error) throw error
            setSquads(squads.map(s => s.id === squadId ? { ...s, name: tempSquadName } : s))
            setEditingSquadId(null)
        } catch (error: any) {
            alert('Error guardando nombre del plantel: ' + error.message)
        }
    }

    const handleShieldSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageUrl = URL.createObjectURL(file)
            setTempShieldSrc(imageUrl)
            setIsCroppingShield(true)
        }
        e.target.value = ''
    }

    const handleShieldCropComplete = async (croppedFile: File) => {
        setIsCroppingShield(false)
        if (tempShieldSrc) URL.revokeObjectURL(tempShieldSrc)
        setTempShieldSrc(null)

        try {
            const cleanFileName = croppedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
            const filePath = `${clubId}/shield_${Date.now()}_${cleanFileName}`
            
            // Subimos al bucket public_avatars o teams si existiera. Asumimos public_avatars que usamos p/ perfiles.
            const publicUrl = await uploadFileAPI(croppedFile, 'public_avatars', filePath)
            
            const { error } = await supabase.from('teams').update({ shield_url: publicUrl }).eq('id', clubId)
            if (error) throw error

            setClub(prev => prev ? { ...prev, shield_url: publicUrl } : prev)
        } catch (err: any) {
            console.error(err)
            alert('Error subiendo el escudo: ' + err.message)
        }
    }

    const toggleInscriptionPayment = async () => {
        if (!club) return
        if (!confirm(`¿Estás seguro de cambiar el estado de pago de inscripción de ${club.name}?`)) return

        setTogglingPayment(true)
        try {
            const newValue = !club.has_paid_inscription

            // FASE DE TESORERÍA (Solo si se está marcando como pagado, no al revocar)
            if (newValue) {
                const amountStr = prompt(`Ingrese el monto abonado por el club para la inscripción (Ej: 150000) o deje en 0 si está bonificado:`, "0");
                if (amountStr === null) {
                    setTogglingPayment(false);
                    return; // Cancelado
                }
                const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.') || '0');
                
                if (amount > 0) {
                    // Buscar una cuenta para asentar el INGRESO
                    let { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'INGRESO').limit(1);
                    if (!accounts || accounts.length === 0) {
                        // Fallback: buscar cuenta tipo ACTIVO si no hay INGRESO puras
                        const { data: fallbackAccounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'ACTIVO').limit(1);
                        accounts = fallbackAccounts;
                    }

                    const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;

                    if (accountId) {
                        const { data: userData } = await supabase.auth.getUser();
                        const { error: treasuryError } = await supabase.from('treasury_movements').insert([{
                            type: 'INGRESO',
                            amount: amount,
                            description: `Inscripción Anual Pagada vía Ficha Club`,
                            entity_name: club.name,
                            date: new Date().toISOString().split('T')[0],
                            account_id: accountId,
                            created_by: userData.user?.id
                        }]);

                        if (treasuryError) {
                            console.error("Error creating treasury movement:", treasuryError);
                            throw new Error("No se pudo registrar el ingreso en Tesorería.");
                        }
                    } else {
                        throw new Error('No se puede cobrar: No hay una cuenta de INGRESO configurada en Tesorería.');
                    }
                }
            }

            const { error } = await supabase
                .from('teams')
                .update({ has_paid_inscription: newValue })
                .eq('id', club.id)

            if (error) throw error

            setClub({ ...club, has_paid_inscription: newValue })
            alert(`Estado actualizado: ${newValue ? 'Inscripción Pagada y Registrada' : 'No Registra Pago'}`)
        } catch (error: any) {
            console.error('Error toggling payment details:', error)
            alert('Error al actualizar: ' + (error.message || 'Asegúrate de haber ejecutado el script SQL.'))
        } finally {
            setTogglingPayment(false)
        }
    }

    if (loading) return <div className="p-12 text-center text-gray-500">Cargando club...</div>
    if (!club) return <div className="p-12 text-center text-red-500">Club no encontrado</div>

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/equipos" className="inline-flex items-center text-sm text-gray-500 hover:text-tdf-orange mb-4 transition-colors">
                    <ChevronLeft size={16} /> Volver a Clubes
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-6 text-center sm:text-left relative">
                        <div className="relative group w-24 h-24 bg-white dark:bg-zinc-800 rounded-full shadow-sm border-2 border-white dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                            {club.shield_url ? (
                                <img src={club.shield_url} alt={club.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <Shield className="w-10 h-10 text-gray-300" />
                            )}
                            <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera size={20} className="mb-1" />
                                <span className="text-[10px] font-bold text-center px-1 leading-tight">Cambiar<br/>Escudo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleShieldSelect} />
                            </label>
                        </div>
                        <div>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                {isEditingClub ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={tempClubName}
                                            onChange={e => setTempClubName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && saveClubName()}
                                            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border-b-2 border-tdf-blue outline-none py-1 px-2 rounded-t"
                                            autoFocus
                                        />
                                        <button onClick={saveClubName} className="p-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition">
                                            <CheckCircle size={18} />
                                        </button>
                                        <button onClick={() => setIsEditingClub(false)} className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 relative group">
                                        {club.name}
                                        <button 
                                            onClick={() => { setTempClubName(club.name); setIsEditingClub(true); }}
                                            className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-tdf-blue focus:opacity-100"
                                            title="Editar Nombre del Club"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    </h1>
                                )}
                                {!isEditingClub && club.has_paid_inscription && (
                                    <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Shield size={12} /> Inscripción OK
                                    </span>
                                )}
                                {!isEditingClub && !club.has_paid_inscription && (
                                    <span className="bg-red-100 text-red-700 border border-red-200 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Shield size={12} /> Sin Pago Anual
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 mt-2 sm:mt-0">{club.city}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-end items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button
                            onClick={toggleInscriptionPayment}
                            disabled={togglingPayment}
                            className={`w-full sm:w-auto shrink-0 justify-center flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold shadow-md transition-all ${club.has_paid_inscription
                                    ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            <Shield size={18} />
                            {club.has_paid_inscription ? 'Revocar Inscripción' : 'Marcar Pagada'}
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full sm:w-auto shrink-0 justify-center flex items-center gap-2 px-5 py-2.5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus size={20} />
                            Nuevo Plantel
                        </button>
                    </div>
                </div>
            </div>

            {/* Squads Grid */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="text-tdf-blue" size={24} />
                Planteles Activos
            </h2>

            {squads.length === 0 ? (
                <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-12 text-center">
                    <p className="text-gray-500 mb-4">Este club no tiene planteles registrados aún.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-tdf-blue font-bold hover:underline"
                    >
                        Crear el primero ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {squads.map(squad => (
                        <Link
                            key={squad.id}
                            href={`/admin/equipos/${clubId}/${squad.id}`}
                            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 rounded-xl p-6 hover:shadow-lg hover:border-tdf-blue/30 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1 relative max-w-[70%]">
                                    {editingSquadId === squad.id ? (
                                        <div className="flex items-center gap-1 mb-1">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={tempSquadName}
                                                onChange={e => setTempSquadName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && saveSquadName(squad.id)}
                                                onClick={e => e.preventDefault()} // prevent link navigation
                                                className="text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border-b-2 border-tdf-blue outline-none py-1 px-1 w-full"
                                            />
                                            <button onClick={(e) => { e.preventDefault(); saveSquadName(squad.id); }} className="text-green-500 shrink-0"><CheckCircle size={16}/></button>
                                            <button onClick={(e) => { e.preventDefault(); setEditingSquadId(null); }} className="text-red-500 shrink-0"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/title">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-tdf-blue transition-colors truncate">
                                                {squad.name}
                                            </h3>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); setTempSquadName(squad.name); setEditingSquadId(squad.id); }}
                                                className="text-slate-400 opacity-0 group-hover/title:opacity-100 hover:text-tdf-orange shrink-0 transition-opacity"
                                                title="Renombrar plantel"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        </div>
                                    )}
                                    
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md inline-block mt-1 ${squad.gender === 'Masculino' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'}`}>
                                        Rama {squad.gender || 'Femenino'}
                                    </span>
                                </div>
                                <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-1 rounded font-semibold ml-2 text-right shrink-0">
                                    {categories.find(c => c.id === squad.category_id)?.name || 'Categoría'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                                <Users size={16} />
                                <span>Ver Jugadores</span>
                            </div>

                            <div className="text-xs text-gray-400 border-t border-gray-50 dark:border-white/5 pt-3">
                                DT: {squad.coach_name || 'Sin asignar'}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Nuevo Plantel</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSquad} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoría</label>
                                <select
                                    required
                                    value={newSquadCategory}
                                    onChange={(e) => setNewSquadCategory(e.target.value)}
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tdf-orange"
                                >
                                    <option value="">Seleccionar Categoría...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {categories.length === 0 && <p className="text-xs text-red-500 mt-1">No hay categorías cargadas en el sistema.</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Rama / Género</label>
                                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 relative h-[42px]">
                                    <div 
                                        className="absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-600 rounded-md shadow-sm transition-all duration-300 ease-out"
                                        style={{ left: newSquadGender === 'Femenino' ? '4px' : 'calc(50%)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewSquadGender('Femenino')}
                                        className={`flex-1 text-sm font-bold relative z-10 transition-colors ${newSquadGender === 'Femenino' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        Femenino
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewSquadGender('Masculino')}
                                        className={`flex-1 text-sm font-bold relative z-10 transition-colors ${newSquadGender === 'Masculino' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        Masculino
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre del Plantel</label>
                                <input
                                    type="text"
                                    required
                                    value={newSquadName}
                                    onChange={(e) => setNewSquadName(e.target.value)}
                                    placeholder="Ej: Club Galicia Sub 13 Verde"
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tdf-orange"
                                />
                                <p className="text-xs text-gray-400 mt-1">Puedes personalizarlo si hay varios equipos (ej. "Rojo", "Verde").</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Director Técnico (DT)</label>
                                <input
                                    type="text"
                                    value={newSquadCoach}
                                    onChange={(e) => setNewSquadCoach(e.target.value)}
                                    placeholder="Nombre del DT"
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tdf-orange"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 text-white bg-tdf-orange hover:bg-tdf-orange-hover rounded-lg font-semibold shadow-lg transition-colors flex justify-center items-center gap-2"
                                >
                                    <Save size={18} />
                                    Crear Plantel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Photo Cropper Modal */}
            {isCroppingShield && tempShieldSrc && (
                <ProfileCropperModal
                    imageSrc={tempShieldSrc}
                    onClose={() => {
                        setIsCroppingShield(false)
                        URL.revokeObjectURL(tempShieldSrc)
                        setTempShieldSrc(null)
                    }}
                    onCropComplete={handleShieldCropComplete}
                />
            )}

        </div>
    )
}
