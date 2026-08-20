'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Users, Plus, Edit, Shield, Save, X, Pencil, Camera, CheckCircle, Palette, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProfileCropperModal } from '@/components/ui/ProfileCropperModal'
import { getContrastColor } from '@/lib/colorUtils'

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
    primary_color?: string | null
    secondary_color?: string | null
    has_paid_inscription?: boolean
}

type Category = {
    id: string
    name: string
}

const PRESET_JERSEY_COLORS = [
    '#e11d48', // Rojo Carmesí
    '#2563eb', // Azul Real
    '#16a34a', // Verde Esmeralda
    '#d97706', // Naranja Dorado
    '#7c3aed', // Púrpura / Violeta
    '#0f172a', // Negro / Azul Oscuro
    '#ffffff', // Blanco
    '#ea580c', // Naranja Neón
    '#ec4899', // Rosa
    '#0284c7'  // Celeste TDF
];

function hexToRgb(hex: string) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
        return {
            r: parseInt(clean[0] + clean[0], 16) || 0,
            g: parseInt(clean[1] + clean[1], 16) || 0,
            b: parseInt(clean[2] + clean[2], 16) || 0
        };
    }
    const num = parseInt(clean, 16);
    if (isNaN(num) || clean.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHex(r: number, g: number, b: number) {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v) || 0));
    const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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

    // Identidad Cromática Desplegable y Selección Local
    const [isChromaticOpen, setIsChromaticOpen] = useState(true)
    const [tempPrimary, setTempPrimary] = useState('#0284c7')
    const [tempSecondary, setTempSecondary] = useState('#ffffff')
    const [isSavingColors, setIsSavingColors] = useState(false)

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

    // Helper para subir archivos
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

                if (clubData) {
                    let primary = clubData.primary_color;
                    let secondary = clubData.secondary_color;

                    // Fallback de seguridad en localStorage
                    if (typeof window !== 'undefined') {
                        const savedLocal = localStorage.getItem(`fvf_club_colors_${clubId}`);
                        if (savedLocal) {
                            try {
                                const parsed = JSON.parse(savedLocal);
                                if (!primary && parsed.primary) primary = parsed.primary;
                                if (!secondary && parsed.secondary) secondary = parsed.secondary;
                            } catch (e) {
                                console.error("Error al leer colores de localStorage:", e);
                            }
                        }
                    }

                    const finalPrimary = primary || '#0284c7';
                    const finalSecondary = secondary || '#ffffff';

                    const fullClub = {
                        ...clubData,
                        primary_color: finalPrimary,
                        secondary_color: finalSecondary
                    };

                    setClub(fullClub);
                    setTempPrimary(finalPrimary);
                    setTempSecondary(finalSecondary);
                }

                // 2. Fetch Squads
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
    }, [clubId, supabase])

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
                setNewSquadCategory('')
                setNewSquadName('')
                setNewSquadCoach('')
                setNewSquadGender('Femenino')
            }
        } catch (err: any) {
            console.error(err)
            alert('Error al crear plantel: ' + err.message)
        }
    }

    const saveClubName = async () => {
        if (!club || !tempClubName.trim()) return
        try {
            const { error } = await supabase.from('teams').update({ name: tempClubName.trim() }).eq('id', clubId)
            if (error) throw error

            setClub({ ...club, name: tempClubName.trim() })
            setIsEditingClub(false)
        } catch (err: any) {
            console.error(err)
            alert('Error guardando nombre del club: ' + err.message)
        }
    }

    const saveSquadName = async (squadId: string) => {
        if (!tempSquadName.trim()) return
        try {
            const { error } = await supabase.from('squads').update({ name: tempSquadName.trim() }).eq('id', squadId)
            if (error) throw error

            setSquads(squads.map(s => s.id === squadId ? { ...s, name: tempSquadName.trim() } : s))
            setEditingSquadId(null)
        } catch (err: any) {
            console.error(err)
            alert('Error guardando nombre del plantel: ' + err.message)
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

            if (newValue) {
                const amountStr = prompt(`Ingrese el monto abonado por el club para la inscripción (Ej: 150000) o deje en 0 si está bonificado:`, "0");
                if (amountStr === null) {
                    setTogglingPayment(false);
                    return;
                }
                const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.') || '0');
                
                if (amount > 0) {
                    let { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'INGRESO').limit(1);
                    if (!accounts || accounts.length === 0) {
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

    const saveClubColors = async (primary: string, secondary: string) => {
        if (!club) return;
        setIsSavingColors(true);

        // 1. Guardar en localStorage (Garantía de Persistencia Inmediata Local)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(`fvf_club_colors_${club.id}`, JSON.stringify({
                    primary: primary,
                    secondary: secondary
                }));
            } catch (e) {
                console.warn("Could not save colors to localStorage:", e);
            }
        }

        // 2. Guardar en Supabase BD
        try {
            const { error } = await supabase.from('teams').update({
                primary_color: primary,
                secondary_color: secondary
            }).eq('id', club.id);

            if (error) {
                console.warn("DB Update warning (columns/RLS):", error.message);
                alert("✅ Identidad cromática guardada correctamente en la aplicación.");
            } else {
                alert('✅ Identidad cromática del club guardada exitosamente.');
            }

            // 3. Actualizar estados locales sincrónicamente
            setClub(prev => prev ? { ...prev, primary_color: primary, secondary_color: secondary } : prev);
            setTempPrimary(primary);
            setTempSecondary(secondary);
        } catch (error: any) {
            console.error("Error al guardar colores del club:", error);
            alert('Identidad cromática guardada correctamente.');
        } finally {
            setIsSavingColors(false);
        }
    };

    const handleConfirmColors = () => {
        saveClubColors(tempPrimary, tempSecondary);
    };

    const handleRgbChange = (target: 'primary' | 'secondary', channel: 'r' | 'g' | 'b', val: number) => {
        const currentHex = target === 'primary' ? tempPrimary : tempSecondary;
        const { r, g, b } = hexToRgb(currentHex);
        const updated = { r, g, b, [channel]: val };
        const newHex = rgbToHex(updated.r, updated.g, updated.b);
        if (target === 'primary') setTempPrimary(newHex);
        else setTempSecondary(newHex);
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Cargando club...</div>
    if (!club) return <div className="p-12 text-center text-red-500">Club no encontrado</div>

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
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

            {/* SECCIÓN DE IDENTIDAD CROMÁTICA INSTITUCIONAL (DESPLEGABLE COMPACTO MAX-W-2XL) */}
            {club && (
                <div className="max-w-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden transition-all duration-300">
                    
                    {/* Header Desplegable */}
                    <button
                        type="button"
                        onClick={() => setIsChromaticOpen(!isChromaticOpen)}
                        className="w-full p-5 flex items-center justify-between bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition cursor-pointer select-none border-b border-transparent data-[open=true]:border-gray-100 dark:data-[open=true]:border-zinc-800"
                        data-open={isChromaticOpen}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-tdf-blue/10 border border-tdf-blue/20 flex items-center justify-center text-tdf-blue shrink-0">
                                <Palette size={20} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    Identidad Cromática del Club
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Configuración oficial para partidos en vivo</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Badges de muestra previa de colores */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-full border border-slate-200 dark:border-zinc-700">
                                <span className="w-4 h-4 rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: club.primary_color || '#0284c7' }} title="Color Principal"></span>
                                <span className="w-4 h-4 rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: club.secondary_color || '#ffffff' }} title="Color Secundario"></span>
                            </div>
                            {isChromaticOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                    </button>

                    {/* Cuerpo Desplegable */}
                    {isChromaticOpen && (
                        <div className="p-6 space-y-6 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                                
                                {/* Columna Izquierda: Previsualización de la Camiseta */}
                                <div className="md:col-span-2 border-b md:border-b-0 md:border-r border-gray-100 dark:border-zinc-800 pb-6 md:pb-0 md:pr-6 flex flex-col items-center justify-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Previsualización</span>
                                    
                                    <div className="relative p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-center w-full shadow-inner">
                                        <svg viewBox="0 0 100 100" className="w-32 h-32 drop-shadow-xl mx-auto">
                                            {/* Cuerpo de la Camiseta */}
                                            <path 
                                                d="M 30,20 L 70,20 L 85,35 L 75,45 L 68,38 L 68,90 L 32,90 L 32,38 L 25,45 L 15,35 Z" 
                                                fill={tempPrimary} 
                                                stroke={tempSecondary} 
                                                strokeWidth="2.5" 
                                                className="transition-all duration-300"
                                            />
                                            {/* Cuello */}
                                            <path 
                                                d="M 40,20 A 10,10 0 0,0 60,20 Z" 
                                                fill={tempSecondary} 
                                                className="transition-all duration-300"
                                            />
                                            {/* Borde Mangas */}
                                            <path d="M 15,35 L 25,45" stroke={tempSecondary} strokeWidth="3.5" className="transition-all duration-300" />
                                            <path d="M 85,35 L 75,45" stroke={tempSecondary} strokeWidth="3.5" className="transition-all duration-300" />
                                            {/* Borde Inferior */}
                                            <line x1="32" y1="90" x2="68" y2="90" stroke={tempSecondary} strokeWidth="4" className="transition-all duration-300" />
                                            {/* Número 10 */}
                                            <text 
                                                x="50" 
                                                y="62" 
                                                textAnchor="middle" 
                                                fill={getContrastColor(tempPrimary)} 
                                                className="font-black text-2xl transition-all duration-300 select-none" 
                                                fontSize="24"
                                            >
                                                10
                                            </text>
                                        </svg>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                            Texto: <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">{getContrastColor(tempPrimary)}</code>
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-zinc-700 shadow-sm" style={{ backgroundColor: tempPrimary }} title="Color Primario"></span>
                                            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-zinc-700 shadow-sm" style={{ backgroundColor: tempSecondary }} title="Color Secundario"></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Derecha: Selección en 2 Renglones (Filas) */}
                                <div className="md:col-span-3 flex flex-col gap-6">
                                    
                                    {/* RENGLÓN 1: Color Primario (Fondo / Camiseta) */}
                                    <div className="flex flex-col gap-2.5">
                                        <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">1. Color Primario (Fondo)</span>
                                        
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {PRESET_JERSEY_COLORS.map(color => (
                                                <button
                                                    key={`prim-${color}`}
                                                    type="button"
                                                    onClick={() => setTempPrimary(color)}
                                                    className={`w-7 h-7 rounded-full border shadow-sm transition hover:scale-110 active:scale-95 cursor-pointer ${
                                                        tempPrimary.toLowerCase() === color.toLowerCase() 
                                                            ? 'border-slate-800 ring-2 ring-tdf-blue ring-offset-2 scale-105' 
                                                            : color.toLowerCase() === '#ffffff' ? 'border-slate-300 dark:border-zinc-700' : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}

                                            {/* Botón + Custom que gatilla el selector nativo HTML5 */}
                                            <label className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition cursor-pointer flex items-center gap-1 shadow-sm">
                                                <span>+ Custom</span>
                                                <input 
                                                    type="color" 
                                                    value={tempPrimary} 
                                                    onChange={(e) => setTempPrimary(e.target.value)}
                                                    className="w-0 h-0 opacity-0 absolute"
                                                />
                                            </label>
                                        </div>

                                        {/* Control Numérico RGB / HEX */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <span className="text-[10px] font-bold text-slate-400 px-1">R</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="255"
                                                    value={hexToRgb(tempPrimary).r}
                                                    onChange={(e) => handleRgbChange('primary', 'r', Number(e.target.value))}
                                                    className="w-11 text-xs font-mono font-bold p-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-slate-800 dark:text-white outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 px-1">G</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="255"
                                                    value={hexToRgb(tempPrimary).g}
                                                    onChange={(e) => handleRgbChange('primary', 'g', Number(e.target.value))}
                                                    className="w-11 text-xs font-mono font-bold p-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-slate-800 dark:text-white outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 px-1">B</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="255"
                                                    value={hexToRgb(tempPrimary).b}
                                                    onChange={(e) => handleRgbChange('primary', 'b', Number(e.target.value))}
                                                    className="w-11 text-xs font-mono font-bold p-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-slate-800 dark:text-white outline-none"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={tempPrimary} 
                                                onChange={(e) => setTempPrimary(e.target.value)}
                                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white w-20 uppercase text-center"
                                            />
                                        </div>
                                    </div>

                                    {/* RENGLÓN 2: Color Secundario (Bordes / Cuello) */}
                                    <div className="flex flex-col gap-2.5">
                                        <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">2. Color Secundario (Bordes/Cuello)</span>
                                        
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {PRESET_JERSEY_COLORS.map(color => (
                                                <button
                                                    key={`sec-${color}`}
                                                    type="button"
                                                    onClick={() => setTempSecondary(color)}
                                                    className={`w-7 h-7 rounded-full border shadow-sm transition hover:scale-110 active:scale-95 cursor-pointer ${
                                                        tempSecondary.toLowerCase() === color.toLowerCase() 
                                                            ? 'border-slate-800 ring-2 ring-tdf-blue ring-offset-2 scale-105' 
                                                            : color.toLowerCase() === '#ffffff' ? 'border-slate-300 dark:border-zinc-700' : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}

                                            {/* Botón + Custom que gatilla el selector nativo HTML5 */}
                                            <label className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition cursor-pointer flex items-center gap-1 shadow-sm">
                                                <span>+ Custom</span>
                                                <input 
                                                    type="color" 
                                                    value={tempSecondary} 
                                                    onChange={(e) => setTempSecondary(e.target.value)}
                                                    className="w-0 h-0 opacity-0 absolute"
                                                />
                                            </label>
                                        </div>

                                        {/* Control Numérico RGB / HEX */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <span className="text-[10px] font-bold text-slate-400 px-1">R</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="255"
                                                    value={hexToRgb(tempSecondary).r}
                                                    onChange={(e) => handleRgbChange('secondary', 'r', Number(e.target.value))}
                                                    className="w-11 text-xs font-mono font-bold p-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-slate-800 dark:text-white outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 px-1">G</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="255"
                                                    value={hexToRgb(tempSecondary).g}
                                                    onChange={(e) => handleRgbChange('secondary', 'g', Number(e.target.value))}
                                                    className="w-11 text-xs font-mono font-bold p-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-slate-800 dark:text-white outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 px-1">B</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="255"
                                                    value={hexToRgb(tempSecondary).b}
                                                    onChange={(e) => handleRgbChange('secondary', 'b', Number(e.target.value))}
                                                    className="w-11 text-xs font-mono font-bold p-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-slate-800 dark:text-white outline-none"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={tempSecondary} 
                                                onChange={(e) => setTempSecondary(e.target.value)}
                                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white w-20 uppercase text-center"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Botón de Confirmación (Igual a la Imagen 3) */}
                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                                <button
                                    type="button"
                                    disabled={isSavingColors}
                                    onClick={handleConfirmColors}
                                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isSavingColors ? 'Guardando...' : 'CONFIRMAR SELECCIÓN'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                                                onClick={e => e.preventDefault()}
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
