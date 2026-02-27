'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Lock, User, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()
    // Stable instance to prevent useEffect re-firing
    const [supabase] = useState(() => createClient())

    // Redirect if already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                // Check profile for smart redirect
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, club_id')
                    .eq('id', session.user.id)
                    .single()

                if (profile?.role === 'admin') router.push('/admin')
                else if (profile?.role === 'club' && profile.club_id) router.push('/club')
                else if (profile?.role === 'referee') router.push('/referee')
                else router.push('/')
            }
        }
        checkSession()
    }, [router, supabase])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
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

                if (profileError || !profile) {
                    router.push('/')
                    return
                }

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
                    case 'referee':
                        router.push('/referee')
                        break
                    default:
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-tdf-blue relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=2607&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-tdf-blue/90 to-black/50"></div>

            {/* Login Card */}
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-white dark:bg-zinc-800 px-8 py-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-tdf-blue dark:text-white uppercase tracking-tight">Acceso Oficial</h2>
                        <p className="text-sm text-gray-400">Federación de Voley Ushuaia</p>
                    </div>
                    <Link href="/" className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20} className="text-gray-500" />
                    </Link>
                </div>

                {/* Body */}
                <div className="p-8">
                    <form onSubmit={handleAuth} className="space-y-6">

                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg flex gap-2 items-center animate-in slide-in-from-top-2">
                                <Lock size={16} /> {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 bg-green-100 border border-green-200 text-green-700 text-sm rounded-lg animate-in slide-in-from-top-2">
                                {message}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-xs font-bold uppercase text-gray-500 tracking-wider">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-gray-50 dark:bg-zinc-800 transition-all font-medium text-gray-900 dark:text-white"
                                placeholder="usuario@fvu.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-xs font-bold uppercase text-gray-500 tracking-wider">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tdf-orange focus:border-transparent outline-none bg-gray-50 dark:bg-zinc-800 transition-all font-medium text-gray-900 dark:text-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Ingresar al Portal
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
            <div className="absolute bottom-6 text-white/40 text-xs font-medium">
                &copy; 2026 Federación de Voley Ushuaia
            </div>
        </div>
    );
}
