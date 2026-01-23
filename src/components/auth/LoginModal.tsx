'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Lock, User, Loader2 } from 'lucide-react'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [isRegister, setIsRegister] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    if (!isOpen) return null

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (isRegister) {
                // REGISTRO
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: 'Usuario Registrado',
                        }
                    }
                })
                if (signUpError) throw signUpError
                setMessage('¡Cuenta creada! Revisa tu email o intenta iniciar sesión.')
                setIsRegister(false)
            } else {
                // LOGIN
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (authError) throw authError

                if (data.user) {
                    // Consultar perfil
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role, club_id')
                        .eq('id', data.user.id)
                        .single()

                    // Si no tiene perfil pero se acaba de loguear, puede ser un usuario nuevo sin rol asignado
                    if (profileError || !profile) {
                        // Permitir entrada básica o mostrar mensaje
                        // Por ahora, asumimos que si no tiene rol ADMIN, va al home
                        onClose()
                        router.push('/')
                        return
                    }

                    onClose()

                    // Redirección basada en rol
                    switch (profile.role) {
                        case 'admin':
                            router.push('/admin')
                            break
                        case 'club':
                            if (profile.club_id) {
                                router.push('/club')
                            } else {
                                router.push('/')
                            }
                            break
                        case 'planillero':
                            router.push('/planillero')
                            break
                        default:
                            router.push('/')
                    }
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
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-tdf-blue px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {isRegister ? 'Crear Cuenta' : 'Acceso Oficial'}
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
                    <form onSubmit={handleAuth} className="space-y-6">

                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 bg-green-100 border border-green-200 text-green-700 text-sm rounded-lg">
                                {message}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-white dark:bg-zinc-800 transition-all font-sans"
                                placeholder="usuario@fvu.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-white dark:bg-zinc-800 transition-all font-sans"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {isRegister ? 'Creando...' : 'Ingresando...'}
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-gray-500">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister)
                                setError(null)
                                setMessage(null)
                            }}
                            className="text-tdf-blue hover:underline font-semibold"
                        >
                            {isRegister ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
