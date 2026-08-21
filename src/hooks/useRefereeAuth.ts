import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useRefereeAuth() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []); // Stable SSR client instance
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [refereeId, setRefereeId] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 1. Get Session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/login');
                    return;
                }

                // 2. Check Profile Role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', session.user.id)
                    .single();

                if (profileError || (profile?.role !== 'referee' && profile?.role !== 'admin')) {
                    console.error("Access denied: User is neither a referee nor an admin");
                    router.push('/');
                    return;
                }

                setUserId(profile.id);

                if (profile.role === 'referee') {
                    const { data: refData } = await supabase
                        .from('referees')
                        .select('id')
                        .eq('user_id', profile.id)
                        .maybeSingle();

                    if (refData) {
                        setRefereeId(refData.id);
                    }
                } else {
                    // Es Administrador: asigna el id sin requerir fila en la tabla 'referees'
                    setRefereeId(profile.id);
                }

            } catch (error) {
                console.error('Referee Auth Error:', error);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    return { userId, refereeId, loading };
}
