'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Users, Building, Mail, Lock, Plus, Trash2,
    CheckCircle, ArrowRight, Loader2, Info
} from 'lucide-react'

// Tipo para las personas autorizadas
type AuthorizedPerson = {
    name: string
    role: string
    phone: string
}

export default function RegisterClubPage() {
    const supabase = createClient()
    const router = useRouter()

    // Steps: 1 = Auth/Club Info, 2 = Authorized Persons, 3 = Success
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form Data
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [clubName, setClubName] = useState('')
    const [persons, setPersons] = useState<AuthorizedPerson[]>([
        { name: '', role: 'Presidente/Responsable', phone: '' }
    ])

    // --- MANEJO DE PERSONAS ---
    const addPerson = () => {
        setPersons([...persons, { name: '', role: '', phone: '' }])
    }

    const removePerson = (index: number) => {
        setPersons(persons.filter((_, i) => i !== index))
    }

    const updatePerson = (index: number, field: keyof AuthorizedPerson, value: string) => {
        const newPersons = [...persons]
        newPersons[index][field] = value
        setPersons(newPersons)
    }

    // --- SUBMIT ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Validaciones Básicas
            if (persons.some(p => !p.name || !p.role || !p.phone)) {
                throw new Error("Por favor completa los datos de todas las personas autorizadas.")
            }

            // 2. Crear Usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: clubName }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error("No se pudo crear el usuario.")

            // 3. Crear Solicitud en BD
            const { error: reqError } = await supabase.from('club_requests').insert({
                user_id: authData.user.id,
                club_name: clubName,
                authorized_persons: persons,
                status: 'pending'
            })

            if (reqError) throw reqError

            // Éxito
            setStep(3)

        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error desconocido al procesar la solicitud.")
            setLoading(false)
        }
    }

    // --- VISTAS ---

    if (step === 3) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-emerald-500 animate-in zoom-in">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">¡Solicitud Enviada!</h2>
                    <p className="text-slate-500 mb-6">
                        Hemos recibido tu solicitud de registro para <strong>{clubName}</strong>.
                        El administrador revisará tus datos y las personas autorizadas.
                    </p>
                    <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl mb-6 flex items-start gap-3 text-left">
                        <Info size={20} className="shrink-0 mt-0.5" />
                        <div>
                            Recibirás una notificación cuando tu cuenta sea aprobada.
                            Hasta entonces, no podrás acceder al panel.
                        </div>
                    </div>
                    <Link href="/" className="btn-primary w-full py-3 rounded-xl flex justify-center font-bold">
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-tdf-blue-dark flex items-center justify-center p-4 md:p-8">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

                {/* Sidebar Visual */}
                <div className="bg-tdf-blue md:w-1/3 p-8 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1592656094267-764a45160876?q=80&w=2669&auto=format&fit=crop')] opacity-10 bg-cover bg-center"></div>
                    <div className="relative z-10">
                        <Link href="/" className="text-xs font-bold opacity-70 hover:opacity-100 uppercase tracking-widest mb-8 block">← Volver</Link>
                        <h2 className="text-3xl font-black leading-none mb-4">Registro Oficial</h2>
                        <p className="opacity-80 text-sm">Federación de Voley de Ushuaia</p>
                    </div>
                    <div className="relative z-10 mt-12 space-y-4 text-sm opacity-80">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold">1</div>
                            <span>Datos del Club</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-white text-tdf-blue' : 'bg-white/10'}`}>2</div>
                            <span>Personas Autorizadas</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold">3</div>
                            <span>Aprobación</span>
                        </div>
                    </div>
                </div>

                {/* Form Area */}
                <div className="flex-1 p-8 md:p-10 bg-white dark:bg-zinc-900">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        {step === 1 ? <Building /> : <Users />}
                        {step === 1 ? 'Información Institucional' : 'Autoridades y Accesos'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* PASO 1: DATOS BÁSICOS */}
                        {step === 1 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div>
                                    <label className="label-form">Nombre del Club / Institución</label>
                                    <input
                                        className="input-form w-full"
                                        placeholder="Ej: Club Deportivo ..."
                                        value={clubName}
                                        onChange={e => setClubName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="label-form">Email Institucional (Usuario)</label>
                                    <input
                                        type="email"
                                        className="input-form w-full"
                                        placeholder="contacto@club...”"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="label-form">Contraseña de Acceso</label>
                                    <input
                                        type="password"
                                        className="input-form w-full"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres.</p>
                                </div>
                            </div>
                        )}

                        {/* PASO 2: PERSONAS AUTORIZADAS */}
                        {step === 2 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    Indica quiénes serán los responsables autorizados para gestionar este club ante la Federación (Presidente, Delegado, Tesorero, etc).
                                </p>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {persons.map((person, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5 relative group">
                                            {persons.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePerson(idx)}
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <div className="grid md:grid-cols-2 gap-3">
                                                <input
                                                    className="input-form text-sm"
                                                    placeholder="Nombre Completo"
                                                    value={person.name}
                                                    onChange={e => updatePerson(idx, 'name', e.target.value)}
                                                />
                                                <input
                                                    className="input-form text-sm"
                                                    placeholder="Rol (Ej: Presidente)"
                                                    value={person.role}
                                                    onChange={e => updatePerson(idx, 'role', e.target.value)}
                                                />
                                                <div className="md:col-span-2">
                                                    <input
                                                        className="input-form text-sm w-full"
                                                        placeholder="Teléfono / WhatsApp"
                                                        value={person.phone}
                                                        onChange={e => updatePerson(idx, 'phone', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addPerson}
                                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-tdf-blue hover:text-tdf-blue transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Plus size={16} /> Agregar otra persona
                                </button>
                            </div>
                        )}

                        {/* ERROR MSG */}
                        {error && (
                            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg flex gap-2 items-center animate-in shake">
                                <Info size={16} /> {error}
                            </div>
                        )}

                        {/* FOOTER ACTIONS */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                            {step === 2 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-slate-500 hover:text-slate-800 font-bold text-sm underline"
                                >
                                    Atrás
                                </button>
                            ) : <div></div>}

                            <button
                                type="button"
                                onClick={step === 1 ? () => {
                                    if (!email || !password || !clubName) return setError("Completa todos los campos.")
                                    setError(null)
                                    setStep(2)
                                } : handleSubmit}
                                disabled={loading}
                                className="bg-tdf-orange hover:bg-tdf-orange-hover text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        {step === 1 ? 'Continuar' : 'Finalizar Registro'}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    )
}
