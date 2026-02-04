'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ClubSidebar from '@/components/Club/ClubSidebar';
import GlobalBanner from '@/components/layout/GlobalBanner';
import { Shield } from 'lucide-react';

export default function ClubLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [clubData, setClubData] = useState<any>(null);

    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            // Obtener datos del perfil y club
            const { data: profile } = await supabase
                .from('profiles')
                .select('club_id, full_name, role')
                .eq('id', user.id)
                .single();

            if (!profile) {
                console.error("Layout: Profile not found");
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            if (!profile.club_id && profile.role !== 'admin') {
                console.warn("Layout: User has no club and is not admin.");
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            // Obtener logo del club si existe
            let logoUrl = null;
            if (profile?.club_id) {
                const { data: team } = await supabase.from('teams').select('shield_url').eq('id', profile.club_id).single();
                logoUrl = team?.shield_url;
            }

            setClubData({
                name: profile?.full_name || 'Mi Club',
                logoUrl: logoUrl
            });

        } catch (error) {
            console.error("Layout Session Error:", error);
            setAccessDenied(true);
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <Shield size={48} className="text-zinc-800 mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Plataforma...</p>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
                <Shield size={64} className="text-red-500 mb-6" />
                <h1 className="text-3xl font-black mb-2">Acceso Restringido</h1>
                <p className="text-zinc-400 mb-8 max-w-md">
                    Tu usuario no tiene un Club asociado o permisos suficientes para ver esta sección.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={handleLogout}
                        className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition"
                    >
                        Cerrar Sesión
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 rounded-xl font-bold border border-zinc-800 hover:bg-zinc-900 transition"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 dark:bg-zinc-950 min-h-screen">
            <GlobalBanner />
            <ClubSidebar
                clubName={clubData?.name}
                logoUrl={clubData?.logoUrl}
                onLogout={handleLogout}
            />
            <main className="flex-1 max-h-screen overflow-y-auto w-full">
                {children}
            </main>
        </div>
    );
}
