'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, UserPlus, Upload, FileText, Save, Trash2, Edit2, CheckCircle, AlertCircle, Users, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/hooks/useSettings'

// Types
type Player = {
    id: string
    name: string
    number: number
    dni: string | null
    // Add medical/payment fields if in schema, assuming placeholders for now or JSON
}

type Squad = {
    id: string
    name: string
    coach_name: string | null
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

    // Create Player Mode
    const [isAddingPlayer, setIsAddingPlayer] = useState(false)
    const [newPlayer, setNewPlayer] = useState({
        name: '',
        number: '',
        dni: '',
        photo: null as File | null,
        medical: null as File | null,
        payment: null as File | null
    })

    useEffect(() => {
        const fetchSquadData = async () => {
            if (!squadId) return
            try {
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
    }, [squadId])

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
        setLoading(true) // Reusing loading state for submission for simplicity, or add specific submitting state

        try {
            let photoUrl = null
            let medicalUrl = null
            let paymentUrl = null

            // Upload Files if present
            if (newPlayer.photo) {
                photoUrl = await uploadFile(newPlayer.photo, `photos/${clubId}`)
            }
            if (newPlayer.medical) {
                medicalUrl = await uploadFile(newPlayer.medical, `medical/${clubId}`)
            }
            if (newPlayer.payment) {
                paymentUrl = await uploadFile(newPlayer.payment, `payments/${clubId}`)
            }

            // Insert Player
            const { data, error } = await supabase.from('players').insert({
                squad_id: squadId,
                team_id: clubId,
                name: newPlayer.name,
                number: parseInt(newPlayer.number),
                dni: newPlayer.dni,
                photo_url: photoUrl,
                medical_url: medicalUrl,
                payment_url: paymentUrl
            }).select().single()

            if (error) throw error

            if (data) {
                setPlayers([...players, data])
                setIsAddingPlayer(false)
                setNewPlayer({ name: '', number: '', dni: '', photo: null, medical: null, payment: null })
                alert('Jugador inscrito correctamente')
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
        <div className="p-8 min-h-screen pb-32">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/admin/equipos/${clubId}`} className="inline-flex items-center text-sm text-gray-500 hover:text-tdf-orange mb-4 transition-colors">
                    <ChevronLeft size={16} /> Volver al Club
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            {squad?.name}
                            <button className="text-gray-400 hover:text-tdf-orange"><Edit2 size={18} /></button>
                        </h1>
                        <p className="text-gray-500 flex items-center gap-2 mt-1">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">DT:</span>
                            {squad?.coach_name || 'Sin asignar'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Players List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="text-tdf-blue" />
                            Lista de Buena Fe
                            <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-full text-gray-500">{players.length}</span>
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                        {players.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <p>No hay jugadores en este plantel.</p>
                                <p className="text-sm">Usa el formulario para inscribir al primero.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 font-semibold border-b border-gray-100 dark:border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">#</th>
                                        <th className="px-6 py-4">Nombre</th>
                                        <th className="px-6 py-4">Docs</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {players.map(player => (
                                        <tr key={player.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-tdf-orange">{player.number}</td>
                                            <td className="px-6 py-4 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs overflow-hidden">
                                                        {/* Avatar Placeholder */}
                                                        {player.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {player.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <span className="p-1 rounded bg-green-100 text-green-700" title="Apto Médico"><CheckCircle size={14} /></span>
                                                    <span className="p-1 rounded bg-red-100 text-red-700" title="Pago Pendiente"><AlertCircle size={14} /></span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right: Add Player Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-white/5 p-6 sticky top-8">
                        {!settings?.registration_open ? (
                            <div className="text-center py-6">
                                <AlertTriangle className="mx-auto text-red-400 mb-3" size={40} />
                                <h3 className="font-bold text-lg text-red-500 mb-2">Inscripciones Cerradas</h3>
                                <p className="text-sm text-gray-500 font-medium">
                                    {settings?.registration_message || "El periodo de inscripción ha finalizado. No se pueden agregar nuevos jugadores."}
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <UserPlus className="text-tdf-orange" />
                                    Nuevo Jugador
                                </h3>

                                <form onSubmit={handleSavePlayer} className="space-y-4">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dorsal</label>
                                            <input
                                                type="number"
                                                required
                                                className="w-full p-2 border rounded-lg bg-gray-50 text-center font-mono text-lg font-bold outline-none focus:ring-2 focus:ring-tdf-orange"
                                                placeholder="#"
                                                value={newPlayer.number}
                                                onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-tdf-orange"
                                                placeholder="Apellido y Nombre"
                                                value={newPlayer.name}
                                                onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-tdf-orange"
                                            placeholder="Sin puntos"
                                            value={newPlayer.dni}
                                            onChange={e => setNewPlayer({ ...newPlayer, dni: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Documentación</p>

                                        <div className="border hover:border-tdf-blue/50 border-dashed rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors bg-gray-50/50">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Upload size={16} /></div>
                                            <div className="overflow-hidden">
                                                <div className="text-sm font-medium text-gray-700">Foto de Perfil</div>
                                                <div className="text-xs text-gray-400 truncate">{newPlayer.photo ? newPlayer.photo.name : 'Subir JPG/PNG'}</div>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'photo')} />
                                        </div>

                                        <div className="border hover:border-tdf-blue/50 border-dashed rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors bg-gray-50/50">
                                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><FileText size={16} /></div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-700">Ficha Médica</div>
                                                <div className="text-xs text-gray-400">{newPlayer.medical ? newPlayer.medical.name : 'Subir PDF Requerido'}</div>
                                            </div>
                                            <input type="file" className="hidden" accept=".pdf,.jpg" onChange={e => handleFileUpload(e, 'medical')} />
                                        </div>

                                        <div className="border hover:border-tdf-blue/50 border-dashed rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors bg-gray-50/50">
                                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FileText size={16} /></div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-700">Pago Inscripción</div>
                                                <div className="text-xs text-gray-400">{newPlayer.payment ? newPlayer.payment.name : 'Subir Comprobante'}</div>
                                            </div>
                                            <input type="file" className="hidden" accept=".pdf,.jpg" onChange={e => handleFileUpload(e, 'payment')} />
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full py-3 bg-tdf-blue hover:bg-tdf-blue-dark text-white rounded-lg font-bold shadow-lg transition-colors flex items-center justify-center gap-2 mt-4">
                                        <Save size={18} />
                                        Inscribir Jugador
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
