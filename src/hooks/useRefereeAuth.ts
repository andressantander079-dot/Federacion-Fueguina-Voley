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

                if (profileError || profile?.role !== 'referee') {
                    console.error("Access denied: User is not a referee");
                    router.push('/');
                    return;
                }

                setUserId(profile.id);

                // 3. Get Referee Record (if needed for ID, though usually it uses user_id or same UUID)
                // Assuming referees have a record in 'referees' or just use user_id in 'match_officials' table.
                // In referee/page.tsx it uses 'user_id' in match_officials.
                // But let's check if there is a referees table linked.
                // Previous tasks mentioned 'referees' table updates.
                const { data: refData, error: refError } = await supabase
                    .from('referees')
                    .select('id')
                    .eq('user_id', profile.id)
                    .maybeSingle();

                if (refData) {
                    setRefereeId(refData.id);
                } else {
                    // Could be that referee record is missing but profile role is set.
                    // Just use user_id or warn.
                    console.warn("Referee profile found but no record in 'referees' table.");
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
