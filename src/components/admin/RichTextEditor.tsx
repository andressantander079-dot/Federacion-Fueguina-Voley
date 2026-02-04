'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Youtube as YoutubeIcon, Heading2, Heading3 } from 'lucide-react'

// Define default extensions outside to prevent recreation
const extensions = [
    StarterKit,
    Link.configure({
        openOnClick: false,
    }),
    Youtube.configure({
        controls: false,
    }),
]

interface RichTextEditorProps {
    content: string
    onChange: (html: string) => void
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
    const editor = useEditor({
        extensions,
        content,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        immediatelyRender: false,
    })

    if (!editor) {
        return null
    }

    const addYoutubeVideo = () => {
        const url = prompt('Ingresa la URL del video de YouTube')

        if (url) {
            editor.commands.setYoutubeVideo({
                src: url,
                width: 640,
                height: 480,
            })
        }
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        // cancelled
        if (url === null) {
            return
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        // update
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Negrita"
                >
                    <Bold size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Cursiva"
                >
                    <Italic size={18} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1" />

                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Subtítulo H2"
                >
                    <Heading2 size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Subtítulo H3"
                >
                    <Heading3 size={18} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1" />

                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Lista con viñetas"
                >
                    <List size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Lista numerada"
                >
                    <ListOrdered size={18} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1" />

                <button
                    onClick={setLink}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('link') ? 'bg-slate-200 dark:bg-white/20 text-tdf-orange' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Enlace"
                >
                    <LinkIcon size={18} />
                </button>
                <button
                    onClick={addYoutubeVideo}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition ${editor.isActive('youtube') ? 'bg-slate-200 dark:bg-white/20 text-tdf-red' : 'text-slate-600 dark:text-slate-300'}`}
                    type="button"
                    title="Insertar Video YouTube"
                >
                    <YoutubeIcon size={18} />
                </button>
            </div>

            <EditorContent editor={editor} />
        </div>
    )
}
