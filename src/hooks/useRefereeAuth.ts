import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useRefereeAuth() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [refereeId, setRefereeId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) {
                    if (sessionError?.message?.includes('Refresh Token') || sessionError?.message?.includes('invalid')) {
                        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                    }
                    router.push('/login');
                    return;
                }

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

                const userIsAdmin = profile.role === 'admin';
                setIsAdmin(userIsAdmin);
                setUserId(profile.id);

                if (profile.role === 'referee') {
                    const { data: refData } = await supabase
                        .from('referees')
                        .select('id')
                        .eq('user_id', profile.id)
                        .maybeSingle();

                    if (refData) setRefereeId(refData.id);
                } else {
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
    }, [router, supabase]);

    return { userId, refereeId, isAdmin, loading };
}
