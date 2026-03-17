'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

export function ThemeToggle({ className }: { className?: string }) {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const supabase = createClient()

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        
        // Persistir en Supabase de forma silenciosa
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ theme_preference: newTheme })
                    .eq('id', user.id)
            }
        } catch (error) {
            console.error("Error persistiendo preferencia de tema", error)
        }
    }

    if (!mounted) {
        return <div className={`w-9 h-9 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse ${className}`} />
    }

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-300 ${theme === 'dark'
                ? 'bg-zinc-800 text-yellow-500 hover:bg-zinc-700'
                : 'bg-white/90 backdrop-blur-sm text-tdf-blue hover:text-tdf-orange border border-tdf-blue/10 shadow-sm'
                } ${className}`}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    )
}
