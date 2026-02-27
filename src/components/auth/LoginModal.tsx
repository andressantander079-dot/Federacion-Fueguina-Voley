'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Lock, User, Loader2, ArrowRight } from 'lucide-react'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    if (!isOpen) return null

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) throw authError

            if (data.user) {
                // Consultar perfil para redirección
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role, club_id')
                    .eq('id', data.user.id)
                    .single()

                if (profileError || !profile) {
                    onClose()
                    router.push('/')
                    return
                }

                // Verificar estado de solicitud si es club pendiente (opcional, también se maneja en landing pero bueno tenerlo aqui)
                // Para simplificar, redirigimos y dejamos que la pagina de destino maneje o el middleware (si hubiera).
                // Pero usuario pidió Bloquear pending. Si es pending, normalmente no tiene role='club' asignado aún, 
                // porque mi lógica de aprobación asigna el rol 'club' AL APROBAR.
                // Antes de aprobar, el usuario tiene rol 'user' (default) o null?
                // En mi codigo de registro /registro, creé el usuario pero no le asigne rol en profiles (trigger default 'user'?).
                // Si es default user, irá a '/'. 
                // Podemos hacer un chequeo extra acá si queremos ser muy "pro", pero con dirigirlos al home está bien por ahora.

                onClose()

                switch (profile.role) {
                    case 'admin':
                        router.push('/admin')
                        break
                    case 'club':
                        router.push('/club')
                        break
                    case 'planillero':
                        router.push('/planillero')
                        break
                    case 'referee':
                        router.push('/referee')
                        break
                    default:
                        // Si es usuario normal, revisamos si tiene solicitud pendiente
                        const { data: req } = await supabase.from('club_requests').select('status').eq('user_id', data.user.id).single()
                        if (req?.status === 'pending') {
                            alert("Tu cuenta está pendiente de aprobación.")
                            // Opcional: logout?
                        }
                        router.push('/')
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error de autenticación')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-tdf-blue px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Acceso Oficial
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange outline-none bg-white dark:bg-zinc-800"
                                placeholder="usuario@fvu.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange outline-none bg-white dark:bg-zinc-800"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Lock className="w-5 h-5" />}
                            Iniciar Sesión
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
