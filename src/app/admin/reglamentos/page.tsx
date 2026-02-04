'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FileText, Upload, Trash2, Download, Eye, Plus, ArrowLeft, Archive, EyeOff } from 'lucide-react'
import Link from 'next/link'

type Document = {
    id: string
    title: string
    file_url: string
    type: 'reglamento' | 'descarga' | 'ficha_medica'
    created_at: string
    archived: boolean
}

const DOC_TYPES = [
    { value: 'reglamento', label: 'Reglamento' },
    { value: 'descarga', label: 'Descarga General' },
    { value: 'ficha_medica', label: 'Ficha Médica' }
]

export default function AdminReglamentosPage() {
    const supabase = createClient()
    // ... imports and states
    const [docs, setDocs] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [newDocTitle, setNewDocTitle] = useState('')
    const [newDocType, setNewDocType] = useState('reglamento')
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => { fetchDocs() }, [])

    const fetchDocs = async () => {
        // Fetch ALL docs (archived and active)
        const { data } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setDocs(data as Document[])
        setLoading(false)
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !newDocTitle) return alert('Completa todos los campos')

        setIsUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${newDocType}-${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('players-docs') // Keeping bucket for now
                .upload(`public-docs/${fileName}`, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('players-docs')
                .getPublicUrl(`public-docs/${fileName}`)

            const { error: dbError } = await supabase.from('documents').insert({
                title: newDocTitle,
                type: newDocType,
                file_url: publicUrl,
                archived: false
            })

            if (dbError) throw dbError

            setNewDocTitle('')
            setFile(null)
            setShowForm(false)
            fetchDocs()
        } catch (error: any) {
            alert('Error al subir: ' + error.message)
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (id: string, url: string) => {
        if (!confirm('¿Seguro que deseas eliminar este documento permanentemente?')) return

        try {
            await supabase.from('documents').delete().eq('id', id)
            // Storage delete optional (good practice)
            fetchDocs()
        } catch (error) {
            console.error(error)
        }
    }

    const handleToggleArchive = async (doc: Document) => {
        try {
            await supabase
                .from('documents')
                .update({ archived: !doc.archived })
                .eq('id', doc.id)

            fetchDocs()
        } catch (error) {
            console.error("Error archiving:", error)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando documentos...</div>

    return (
        <div className="p-8 min-h-screen bg-gray-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-white rounded-full transition shadow-sm"><ArrowLeft size={20} /></Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Gestión de Reglamentos</h1>
                        <p className="text-sm text-slate-500">Sube archivos visibles para toda la comunidad.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md transition-all"
                >
                    {showForm ? 'Cancelar' : <><Upload size={18} /> Subir Nuevo</>}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 mb-8 animate-in slide-in-from-top-4">
                    <h3 className="font-bold mb-4 text-lg border-b pb-2">Nuevo Documento</h3>
                    <form onSubmit={handleUpload} className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Título del Documento</label>
                                <input
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-zinc-800"
                                    placeholder="Ej: Reglamento Oficial 2026"
                                    value={newDocTitle}
                                    onChange={e => setNewDocTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Categoría</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-zinc-800"
                                    value={newDocType}
                                    onChange={e => setNewDocType(e.target.value)}
                                >
                                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Archivo (PDF / Img)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} required />
                                    {file ? (
                                        <div className="text-green-600 font-bold flex items-center justify-center gap-2">
                                            <FileText size={20} /> {file.name}
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-sm">
                                            <Upload size={24} className="mx-auto mb-2" />
                                            Arrastra o clickea para subir
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition disabled:opacity-50"
                            >
                                {isUploading ? 'Subiendo...' : 'Publicar Documento'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid gap-4">
                {docs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No hay documentos cargados aún.</p>
                    </div>
                ) : (
                    docs.map(doc => (
                        <div key={doc.id} className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${doc.archived ? 'border-orange-200 opacity-60' : 'border-gray-100 dark:border-white/5 hover:shadow-md'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${doc.type === 'reglamento' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {doc.title}
                                        {doc.archived && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">ARCHIVADO</span>}
                                    </h4>
                                    <span className="text-xs uppercase font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">{DOC_TYPES.find(t => t.value === doc.type)?.label}</span>
                                    <span className="text-xs text-gray-400 ml-2">{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={doc.file_url} target="_blank" className="p-2 text-gray-500 hover:text-tdf-blue hover:bg-blue-50 rounded-lg transition" title="Ver / Descargar">
                                    <Download size={20} />
                                </a>

                                <button
                                    onClick={() => handleToggleArchive(doc)}
                                    className={`p-2 rounded-lg transition ${doc.archived ? 'text-green-600 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`}
                                    title={doc.archived ? "Desarchivar (Mostrar en Home)" : "Archivar (Ocultar en Home)"}
                                >
                                    {doc.archived ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>

                                <button onClick={() => handleDelete(doc.id, doc.file_url)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar Permanentemente">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
