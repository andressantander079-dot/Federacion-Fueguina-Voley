'use client';
import { useState, useEffect } from 'react';
import OfficialMatchSheet from '@/components/match/OfficialMatchSheet';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function RefereeMatchPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const matchId = params.id as string;
    const isOverrideParam = searchParams.get('override') === 'true';

    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMatchSubmitted, setIsMatchSubmitted] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loadingVerify, setLoadingVerify] = useState(false);

    useEffect(() => {
        const initPage = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Check profile role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                const userIsAdmin = profile?.role === 'admin';
                setIsAdmin(userIsAdmin);

                // Check match status
                if (matchId) {
                    const { data: match } = await supabase
                        .from('matches')
                        .select('sheet_status, status')
                        .eq('id', matchId)
                        .single();

                    if (match?.sheet_status === 'submitted' || match?.status === 'finalizado') {
                        setIsMatchSubmitted(true);
                    }
                }

                // Si es Admin y viene por override, o si el partido ya está cerrado (read-only), auto-verificamos
                if (userIsAdmin || isOverrideParam) {
                    setIsVerified(true);
                }
            } catch (err) {
                console.error("Error al inicializar página de partido:", err);
            } finally {
                setLoadingAuth(false);
            }
        };

        initPage();
    }, [matchId, isOverrideParam, router, supabase]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingVerify(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
            setError("No se pudo identificar al usuario.");
            setLoadingVerify(false);
            return;
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (authError) {
            setError("Contraseña incorrecta.");
            setLoadingVerify(false);
        } else {
            setIsVerified(true);
            setLoadingVerify(false);
        }
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold animate-pulse">
                Cargando Planilla...
            </div>
        );
    }

    if (!isVerified) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Acceso Restringido</h1>
                        <p className="text-zinc-500 text-sm mt-2 font-medium">Estás ingresando a la <strong>Planilla Oficial</strong>. Por seguridad, verifica tu identidad.</p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-tdf-orange outline-none font-bold placeholder-zinc-700 transition"
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-center text-red-400 text-xs font-bold">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => router.back()} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition text-sm">Cancelar</button>
                            <button type="submit" disabled={loadingVerify} className="flex-1 py-3 bg-tdf-orange hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-lg shadow-orange-900/20 text-sm flex justify-center items-center gap-2">
                                {loadingVerify && <Loader2 size={16} className="animate-spin" />}
                                Ingresar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Si el partido ya fue homologado/cerrado, forzamos ReadOnly estricto
    const forceReadOnly = isMatchSubmitted;
    const redirectPath = isAdmin ? '/admin/competencias' : '/referee';

    return (
        <OfficialMatchSheet
            redirectAfterSubmit={redirectPath}
            isAdminOverride={isAdmin && !forceReadOnly}
            initialReadOnly={forceReadOnly}
        />
    );
}
