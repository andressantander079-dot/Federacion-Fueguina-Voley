'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Save, Phone, Loader2, LogOut, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRefereeAuth } from '@/hooks/useRefereeAuth'
import { useRouter } from 'next/navigation'

export default function RefereeProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const { userId, loading: authLoading } = useRefereeAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        phone: '',
        role: '',
        avatar_url: ''
    })

    const [category, setCategory] = useState('')

    useEffect(() => {
        if (userId) fetchProfile(userId)
    }, [userId])

    async function fetchProfile(uid: string) {
        setLoading(true)

        // 1. Fetch Auth Profile
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single()

        if (profileError) {
            toast.error('Error cargando perfil: ' + profileError.message)
            return
        }

        if (profileData) {
            setProfile({
                full_name: profileData.full_name || '',
                email: profileData.email || '',
                phone: profileData.phone || '',
                role: profileData.role || 'referee',
                avatar_url: profileData.avatar_url || ''
            })
        }

        // 2. Fetch Referee Category
        const { data: refData } = await supabase
            .from('referees')
            .select('category')
            .eq('id', uid)
            .single()

        if (refData) {
            setCategory(refData.category)
        }

        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const { error } = await supabase
            .from('profiles')
            .update({
                phone: profile.phone
            })
            .eq('id', userId)

        if (error) {
            toast.error('Error al actualizar: ' + error.message)
        } else {
            toast.success('Perfil actualizado correctamente')
        }

        setSaving(false)
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) return

            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${userId}-${Math.random()}.${fileExt}`

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // 3. Update Profile Table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', userId)

            if (updateError) throw updateError

            setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }))
            toast.success('Foto de perfil actualizada')

        } catch (error: any) {
            toast.error('Error subiendo imagen: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (authLoading || loading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-tdf-orange" />
        </div>
    )

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl font-black text-white">Mi Perfil</h2>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-zinc-800 to-black relative">
                    <div className="absolute inset-0 bg-tdf-orange/10"></div>
                </div>

                <div className="px-8 pb-8 relative">
                    {/* Avatar Upload */}
                    <div className="flex justify-between items-end -mt-16 mb-8">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden relative">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-600">
                                        {profile.full_name?.charAt(0) || '?'}
                                    </div>
                                )}

                                {/* Overlay Upload Icon */}
                                <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {uploading ? (
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    ) : (
                                        <>
                                            <Camera className="w-6 h-6 text-white mb-1" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Cambiar Foto</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Category Badge */}
                        {category && (
                            <div className="mb-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                                <CheckCircle size={16} className="text-blue-500" />
                                <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">{category}</span>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Read-Only Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-500 uppercase mb-2 ml-1">Nombre Completo</label>
                                <div className="w-full bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 font-bold text-zinc-400 cursor-not-allowed">
                                    {profile.full_name}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-500 uppercase mb-2 ml-1">Email (Usuario)</label>
                                <div className="w-full bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 font-bold text-zinc-400 cursor-not-allowed hidden md:block truncate">
                                    {profile.email}
                                </div>
                            </div>
                        </div>

                        {/* Editable Info */}
                        <div>
                            <label className="block text-xs font-black text-zinc-400 uppercase mb-2 ml-1">Teléfono Móvil (WhatsApp)</label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="tel"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 font-bold text-white outline-none focus:border-tdf-orange focus:ring-1 focus:ring-tdf-orange transition placeholder-zinc-700"
                                    placeholder="+54 2901..."
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold mt-2 ml-1">Solo visible para la Coordinación Arbitral de FVF.</p>
                        </div>

                        <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full md:w-auto px-6 py-3 rounded-xl font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} /> Cerrar Sesión
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full md:w-auto bg-tdf-orange hover:bg-tdf-orange-hover text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
