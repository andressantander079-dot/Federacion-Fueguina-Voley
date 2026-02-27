'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, UserPlus, Upload, FileText, Save, Trash2, Edit2, CheckCircle, AlertCircle, Users, AlertTriangle, Lock, Unlock, Camera, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/hooks/useSettings'

// Types
type Player = {
    id: string
    name: string
    number: number
    dni: string | null
    status: string
    // Add medical/payment fields if in schema, assuming placeholders for now or JSON
}

type Squad = {
    id: string
    name: string
    category_id: string
    coach_name: string | null
    password?: string | null
}

export default function SquadPlayersPage() {
    const params = useParams()
    const clubId = params?.clubId as string
    const squadId = params?.squadId as string
    const supabase = createClient()
    const { settings } = useSettings()

    const [squad, setSquad] = useState<Squad | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)

    const [categories, setCategories] = useState<any[]>([])

    // Create Player Mode
    const [isAddingPlayer, setIsAddingPlayer] = useState(false)
    const [newPlayer, setNewPlayer] = useState({
        name: '',
        number: '',
        dni: '',
        birth_date: '',
        position: 'Punta',
        photo: null as File | null,
        medical: null as File | null,
        payment: null as File | null
    })

    useEffect(() => {
        const fetchSquadData = async () => {
            if (!squadId) return
            try {
                // Fetch Categories for age validation
                const { data: catsData } = await supabase.from('categories').select('*')
                if (catsData) setCategories(catsData)

                // Fetch Squad
                const { data: squadData } = await supabase
                    .from('squads')
                    .select('*')
                    .eq('id', squadId)
                    .single()

                if (squadData) setSquad(squadData)

                // Fetch Players
                const { data: playersData } = await supabase
                    .from('players')
                    .select('*')
                    .eq('squad_id', squadId)
                    .order('number', { ascending: true })

                if (playersData) setPlayers(playersData)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchSquadData()
    }, [squadId, supabase])

    const manejarPassword = async () => {
        if (!squad) return;
        if (squad.password) {
            if (confirm(`El plantel actualmente tiene el PIN: ${squad.password}\n¿Desea eliminar la protección por contraseña?`)) {
                await supabase.from('squads').update({ password: null }).eq('id', squad.id);
                setSquad({ ...squad, password: null });
                alert('Protección eliminada.');
            }
        } else {
            const pin = prompt('Ingrese un nuevo PIN exacto de 4 dígitos para proteger este plantel:');
            if (pin && /^\d{4}$/.test(pin)) {
                await supabase.from('squads').update({ password: pin }).eq('id', squad.id);
                setSquad({ ...squad, password: pin });
                alert('Protección activada correctamente.');
            } else if (pin) {
                alert('Error: El PIN debe contener exactamente 4 números.');
            }
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'medical' | 'payment') => {
        if (e.target.files && e.target.files[0]) {
            setNewPlayer(prev => ({ ...prev, [field]: e.target.files![0] }))
        }
    }

    const uploadFile = async (file: File, folder: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${folder}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('players-docs')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('players-docs').getPublicUrl(filePath)
        return data.publicUrl
    }

    const handleSavePlayer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPlayer.dni || !newPlayer.name || !newPlayer.birth_date) return alert("Completa Nombre, DNI y Fecha de Nacimiento.")

        if (squad && squad.category_id) {
            const category = categories.find(c => c.id === squad.category_id);
            if (category) {
                const birthYear = parseInt(newPlayer.birth_date.split('-')[0]);

                if (category.min_year && birthYear < category.min_year) {
                    return alert(`JUGADOR NO HABILITADO: El año de nacimiento (${birthYear}) es menor al permitido para la categoría ${category.name} (Min: ${category.min_year})`);
                }
                if (category.max_year && birthYear > category.max_year) {
                    return alert(`JUGADOR NO HABILITADO: El año de nacimiento (${birthYear}) es mayor al permitido para la categoría ${category.name} (Max: ${category.max_year})`);
                }
            }
        }

        setLoading(true) // Reusing loading state for submission for simplicity, or add specific submitting state

        try {
            // 1. DUPLICATE REGISTRATION CHECK
            const { data: existingPlayers, error: dupErr } = await supabase
                .from('players')
                .select('team_id, teams(name)')
                .eq('dni', newPlayer.dni)
                .eq('birth_date', newPlayer.birth_date);

            if (dupErr) throw dupErr;

            if (existingPlayers && existingPlayers.length > 0) {
                const conflict = existingPlayers.find(p => p.team_id !== clubId);
                if (conflict) {
                    setLoading(false);
                    // @ts-ignore
                    const conflictTeamName = conflict.teams ? (Array.isArray(conflict.teams) ? conflict.teams[0]?.name : conflict.teams.name) : 'otro club';
                    return alert(`REGISTRO BLOQUEADO: El DNI ${newPlayer.dni} ya está registrado activamente en "${conflictTeamName}".`);
                }
            }

            let photoUrl = null
            let medicalUrl = null
            let paymentUrl = null

            // Use exact same bucket locations as clubs to match Tramites process
            if (newPlayer.photo) {
                const fileExt = newPlayer.photo.name.split('.').pop()
                const fileName = `foto-${Date.now()}-${newPlayer.dni}.${fileExt}`
                await supabase.storage.from('player-photos').upload(fileName, newPlayer.photo)
                photoUrl = supabase.storage.from('player-photos').getPublicUrl(fileName).data.publicUrl
            }
            if (newPlayer.payment) {
                const fileExt = newPlayer.payment.name.split('.').pop()
                const payFileName = `pago-${Date.now()}-${newPlayer.dni}.${fileExt}`
                await supabase.storage.from('procedure-files').upload(payFileName, newPlayer.payment)
                paymentUrl = supabase.storage.from('procedure-files').getPublicUrl(payFileName).data.publicUrl
            }
            if (newPlayer.medical) {
                const fileExt = newPlayer.medical.name.split('.').pop()
                const medFileName = `medico-${Date.now()}-${newPlayer.dni}.${fileExt}`
                await supabase.storage.from('procedure-files').upload(medFileName, newPlayer.medical)
                medicalUrl = supabase.storage.from('procedure-files').getPublicUrl(medFileName).data.publicUrl
            }

            // Insert Player with exactly the same payload as club/plantel
            const { data, error } = await supabase.from('players').insert([{
                squad_id: squadId,
                team_id: clubId,
                category_id: squad?.category_id,
                name: newPlayer.name,
                birth_date: newPlayer.birth_date,
                position: newPlayer.position,
                number: newPlayer.number ? parseInt(newPlayer.number) : null,
                dni: newPlayer.dni,
                photo_url: photoUrl,
                medical_url: medicalUrl,
                payment_url: paymentUrl,
                status: 'pending' // MATCH: Trigger Tramite
            }]).select().single()

            if (error) throw error

            if (data) {
                setPlayers([...players, data])
                setNewPlayer({ name: '', number: '', dni: '', birth_date: '', position: 'Punta', photo: null, medical: null, payment: null })
                alert('Jugador inscrito y trámite generado.')
            }
        } catch (error: any) {
            console.error('Error saving player', error)
            alert('Error al guardar jugador: ' + (error.message || 'Desconocido'))
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-12 text-center">Cargando plantel...</div>

    return (
        <div className="p-8 min-h-screen pb-32 bg-zinc-950 font-sans text-white selection:bg-orange-500 selection:text-white">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/admin/equipos/${clubId}`} className="inline-flex items-center text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors font-medium">
                    <ChevronLeft size={16} /> Volver al Club
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            {squad?.name}
                            <button className="text-gray-400 hover:text-tdf-orange"><Edit2 size={18} /></button>
                            {squad && (
                                <button
                                    onClick={manejarPassword}
                                    className={`p-2 rounded-lg transition ${squad.password ? 'text-amber-500 hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
                                    title={squad.password ? "Cambiar/Quitar PIN" : "Proteger con PIN"}
                                >
                                    {squad.password ? <Lock size={18} /> : <Unlock size={18} />}
                                </button>
                            )}
                        </h1>
                        <p className="text-zinc-500 flex items-center gap-2 mt-1">
                            <span className="font-bold text-zinc-400">DT:</span>
                            {squad?.coach_name || 'Sin asignar'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Players List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={18} className="text-orange-500" />
                        <h3 className="font-bold text-lg text-white">Lista de Buena Fe</h3>
                        <span className="bg-zinc-800 text-white text-xs px-2 py-0.5 rounded-full">{players.length}</span>
                    </div>

                    {players.length === 0 ? (
                        <div className="p-12 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
                            <p className="text-zinc-500 italic">No hay jugadores inscritos.</p>
                            <p className="text-zinc-600 text-sm">Usa el formulario para inscribir al primero.</p>
                        </div>
                    ) : (
                        players.map((j: any) => (
                            <div
                                key={j.id}
                                className={`
                                    border p-4 rounded-xl flex items-center gap-4 transition group cursor-pointer relative overflow-hidden
                                    ${j.status === 'pending'
                                        ? 'bg-yellow-500/10 border-yellow-500/50 hover:bg-yellow-500/20'
                                        : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                                    }
                                `}
                            >
                                {j.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />}

                                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-black text-zinc-500 text-sm">
                                    {j.number || '#'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-white">{j.name}</h4>
                                        {j.status === 'pending' && (
                                            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Pendiente
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <span>DNI {j.dni}</span>
                                        {j.position && <><span className="w-1 h-1 bg-zinc-700 rounded-full" /><span>{j.position}</span></>}
                                        {j.birth_date && (
                                            <span className="text-zinc-600">({j.birth_date.split('-')[0]})</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {j.medical_url && <span title="Apto Médico OK"><FileText size={16} className="text-green-500" /></span>}
                                    {j.photo_url && <span title="Foto OK"><Camera size={16} className="text-blue-500" /></span>}
                                </div>

                                <button className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100 z-10">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Right: Add Player Form */}
                <div className="lg:col-span-1">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24 shadow-2xl shadow-black/50">
                        {!settings?.registration_open ? (
                            <div className="text-center py-6">
                                <AlertTriangle className="mx-auto text-red-500 mb-3" size={40} />
                                <h3 className="font-bold text-lg text-white mb-2">Inscripciones Cerradas</h3>
                                <p className="text-sm text-zinc-400 font-medium">
                                    {settings?.registration_message || "El periodo de inscripción ha finalizado. No se pueden agregar nuevos jugadores."}
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-white">
                                    <UserPlus className="text-orange-500" />
                                    Nuevo Jugador
                                </h3>

                                <form onSubmit={handleSavePlayer} className="space-y-4">
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Dorsal</label>
                                            <input
                                                type="number"
                                                required
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-center font-bold text-white outline-none focus:border-orange-500 transition-colors"
                                                placeholder="#"
                                                value={newPlayer.number}
                                                onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                                                placeholder="Apellido y Nombre"
                                                value={newPlayer.name}
                                                onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">DNI (Sin puntos)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                                                placeholder="Ej: 12345678"
                                                value={newPlayer.dni}
                                                onChange={e => setNewPlayer({ ...newPlayer, dni: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nacimiento</label>
                                            <input
                                                type="date"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                                                value={newPlayer.birth_date}
                                                onChange={e => setNewPlayer({ ...newPlayer, birth_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Documentación</p>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                                            <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><Camera size={16} /></div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-zinc-300">Foto de Perfil</div>
                                                <div className="text-[10px] text-zinc-500 truncate">{newPlayer.photo ? newPlayer.photo.name : 'Subir JPG/PNG'}</div>
                                            </div>
                                            <input type="file" hidden accept="image/*" onChange={e => handleFileUpload(e, 'photo')} />
                                            {newPlayer.photo && <CheckCircle size={14} className="text-green-500" />}
                                        </label>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                                            <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><FileText size={16} /></div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-zinc-300">Ficha Médica</div>
                                                <div className="text-[10px] text-zinc-500 truncate">{newPlayer.medical ? newPlayer.medical.name : 'Subir PDF'}</div>
                                            </div>
                                            <input type="file" hidden accept=".pdf,.jpg" onChange={e => handleFileUpload(e, 'medical')} />
                                            {newPlayer.medical && <CheckCircle size={14} className="text-green-500" />}
                                        </label>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-dashed border-zinc-700 group">
                                            <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-white transition"><DollarSign size={16} /></div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-zinc-300">Pago Inscripción</div>
                                                <div className="text-[10px] text-zinc-500 truncate">{newPlayer.payment ? newPlayer.payment.name : 'Subir Comprobante'}</div>
                                            </div>
                                            <input type="file" hidden accept=".pdf,.jpg,.png" onChange={e => handleFileUpload(e, 'payment')} />
                                            {newPlayer.payment && <CheckCircle size={14} className="text-green-500" />}
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl mt-2 transition shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={18} />}
                                        {loading ? 'Guardando...' : 'Inscribir Jugador'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
