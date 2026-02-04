'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Save, Image as ImageIcon, X, Check, ZoomIn, RotateCw, Eye, Calendar, Pin, User } from 'lucide-react'
import Link from 'next/link'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/lib/cropImage'
import RichTextEditor from '@/components/admin/RichTextEditor'

export default function CreateNewsPage() {
    const router = useRouter()
    const supabase = createClient()

    // Form State
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const [error, setError] = useState('')

    // Advanced State
    const [category, setCategory] = useState('Institucional')
    const [tags, setTags] = useState('')
    const [pinned, setPinned] = useState(false)
    const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 16)) // datetime-local format
    const [status, setStatus] = useState('published')
    const [showPreview, setShowPreview] = useState(false)

    // Editor State
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [showEditor, setShowEditor] = useState(false)

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const readFile = (file: File) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.addEventListener('load', () => resolve(reader.result), false)
            reader.readAsDataURL(file)
        })
    }

    const processFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageDataUrl: any = await readFile(file)
            setImageSrc(imageDataUrl)
            setShowEditor(true)
            e.target.value = ''
        }
    }

    const saveCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const croppedBlob: any = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
            const myFile = new File([croppedBlob], "news-image.jpg", { type: "image/jpeg" })
            setFile(myFile)
            setImageUrl('')
            setShowEditor(false)
        } catch (e) {
            console.error(e)
            setError('Error al recortar la imagen')
        }
    }



    const isValidImage = (url: string) => {
        if (!url) return true; // Optional? Or required? Let's say required as per request.
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        // Validation
        if (!title || (!imageUrl && !file)) {
            setError('Falta el título o la imagen.')
            return
        }

        if (imageUrl && !isValidImage(imageUrl)) {
            setError('La URL de la imagen no parece válida (.jpg, .png).')
            return
        }

        setLoading(true)
        setError('')

        try {
            let finalImageUrl = imageUrl;

            // Upload File if present
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `news-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from('news-images').upload(fileName, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
            }

            const { error: dbError } = await supabase
                .from('news')
                .insert({
                    title,
                    body: body || ' ',
                    image_url: finalImageUrl,
                    category,
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                    pinned,
                    published_at: new Date(publishedAt).toISOString(),
                    status: status, // 'draft' or 'published'
                    archived: false // Legacy support
                })

            if (dbError) throw dbError

            router.push('/admin/noticias')
            router.refresh()

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al crear la noticia')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <Link href="/admin/noticias" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-6">
                <ArrowLeft size={18} className="mr-2" /> Volver al listado
            </Link>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-slate-100 dark:border-white/5 p-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
                    Nueva Noticia
                </h1>

                {error && (
                    <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Título
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ej: Inicio de Inscripciones 2026"
                            className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none transition-all font-bold text-lg"
                        />
                    </div>

                    {/* Image Source Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Imagen de Portada
                        </label>

                        <div className="flex gap-4 items-start flex-col md:flex-row">
                            <div className="flex-1 w-full space-y-4">
                                {/* Option A: Upload */}
                                <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${file ? 'border-tdf-orange bg-orange-50 dark:bg-orange-900/10' : 'border-dashed border-slate-300 dark:border-white/20 hover:border-tdf-orange'}`}>
                                    <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={processFileSelection}
                                        />
                                        <ImageIcon className={`w-8 h-8 ${file ? 'text-tdf-orange' : 'text-slate-400'}`} />
                                        <span className="text-sm font-bold text-slate-500">
                                            {file ? "Imagen lista (Click para cambiar)" : "Click para subir imagen"}
                                        </span>
                                        <span className="text-xs text-slate-400">(Max 5MB - JPG, PNG)</span>
                                    </label>
                                </div>

                                <div className="text-center text-xs text-slate-400 font-bold uppercase">- O -</div>

                                {/* Option B: URL */}
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={e => {
                                        setImageUrl(e.target.value);
                                        setFile(null); // Clear file if URL typed
                                    }}
                                    placeholder="Pegar URL de imagen externa..."
                                    className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none text-sm font-mono"
                                />
                            </div>

                            {/* Preview */}
                            <div className="w-full md:w-48 h-32 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center overflow-hidden shrink-0 relative">
                                {file ? (
                                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                ) : imageUrl && isValidImage(imageUrl) ? (
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-slate-400 p-2">
                                        <ImageIcon className="mx-auto mb-1 opacity-50" />
                                        <span className="text-[10px]">Vista Previa</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Categoría
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none"
                            >
                                <option value="Institucional">Institucional</option>
                                <option value="Torneo Apertura">Torneo Apertura</option>
                                <option value="Torneo Clausura">Torneo Clausura</option>
                                <option value="Selecciones">Selecciones</option>
                                <option value="Fichajes">Fichajes</option>
                            </select>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Etiquetas (separadas por coma)
                            </label>
                            <input
                                type="text"
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                placeholder="Ej: Finales, Sub-20, Voley"
                                className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Published At */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Calendar size={14} /> Fecha de Publicación
                            </label>
                            <input
                                type="datetime-local"
                                value={publishedAt}
                                onChange={e => setPublishedAt(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none"
                            />
                        </div>

                        {/* Pinned */}
                        <div className="flex items-center pt-8">
                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-full hover:border-tdf-orange transition-colors">
                                <input
                                    type="checkbox"
                                    checked={pinned}
                                    onChange={e => setPinned(e.target.checked)}
                                    className="w-5 h-5 accent-tdf-orange"
                                />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <Pin size={14} className="text-tdf-orange" /> Destacar en Portada
                                    </span>
                                    <span className="text-xs text-slate-500">Aparecerá primera en el inicio</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Rich Editor */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Contenido (Editor Enriquecido)
                        </label>
                        <RichTextEditor content={body} onChange={setBody} />
                    </div>

                    {/* Action Bar */}
                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-wrap justify-between items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-white font-bold rounded-xl transition-all"
                        >
                            <Eye size={20} /> Vista Previa
                        </button>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                onClick={() => setStatus('draft')}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 text-slate-700 dark:text-white font-bold rounded-xl transition-all"
                            >
                                <Save size={20} /> Guardar Borrador
                            </button>
                            <button
                                type="submit"
                                onClick={() => setStatus('published')}
                                disabled={loading}
                                className="flex items-center gap-2 px-8 py-3 bg-tdf-blue hover:bg-tdf-blue-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                Publicar
                            </button>
                        </div>
                    </div>
                </form>

                {/* Preview Modal */}
                {showPreview && (
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="p-8">
                                <div className="text-xs font-bold text-tdf-orange uppercase tracking-wider mb-2">
                                    {category}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-6">
                                    {title || "Sin título"}
                                </h1>
                                {tags && (
                                    <div className="flex gap-2 mb-6">
                                        {tags.split(',').map(t => (
                                            <span key={t} className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-xs font-bold rounded-full">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {file ? (
                                    <img src={URL.createObjectURL(file)} className="w-full h-[400px] object-cover rounded-xl mb-8" />
                                ) : imageUrl ? (
                                    <img src={imageUrl} className="w-full h-[400px] object-cover rounded-xl mb-8" />
                                ) : null}

                                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: body }} />
                            </div>
                        </div>
                    </div>
                )}
                {/* IMAGE EDITOR MODAL */}
                {showEditor && imageSrc && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-in fade-in">
                        <div className="relative flex-1">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={16 / 9}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                            />
                        </div>

                        <div className="bg-zinc-900 p-6 flex flex-col gap-4 border-t border-white/10">
                            <div className="flex items-center gap-6 max-w-xl mx-auto w-full">
                                <div className="flex-1 flex items-center gap-2">
                                    <ZoomIn className="text-white w-4 h-4" />
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full accent-tdf-orange"
                                    />
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                    <RotateCw className="text-white w-4 h-4" />
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                        onChange={(e) => setRotation(Number(e.target.value))}
                                        className="w-full accent-tdf-orange"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => { setShowEditor(false); setImageSrc(null); }}
                                    className="px-6 py-2 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveCroppedImage}
                                    className="px-6 py-2 bg-tdf-orange text-white font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2"
                                >
                                    <Check size={18} /> Aplicar Recorte
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
