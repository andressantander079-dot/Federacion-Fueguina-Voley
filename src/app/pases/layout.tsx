'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

export default function PasesRestrictedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) {
                    router.push('/login');
                    return;
                }

                // Call profile to verify strict role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.role !== 'temp_pase') {
                    // Redirect them to their proper place
                    router.push('/');
                    return;
                }

                setAuthorized(true);
            } catch (err) {
                console.error("Layout Check Error:", err);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [router, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
                <Loader2 size={48} className="animate-spin text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Verificando Credenciales Oficiales...</p>
            </div>
        );
    }

    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            {/* Minimal Security Header */}
            <header className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center absolute top-0 w-full z-50">
                <div className="flex items-center gap-3">
                    <Shield className="text-blue-500" size={24} />
                    <div>
                        <h1 className="text-white font-black leading-none uppercase text-sm">Portal de Seguridad FVF</h1>
                        <p className="text-zinc-500 text-[10px] font-bold tracking-widest">Trámites Legales</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="text-xs font-bold text-zinc-400 hover:text-white transition px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                    Cerrar Sesión / Salir
                </button>
            </header>
            
            <main className="flex-1 pt-24 pb-12 overflow-y-auto w-full">
                {children}
            </main>
        </div>
    );
}
