import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export type ClubAuthResult = {
    loading: boolean;
    clubId: string | null;
    error: string | null;
    user: any | null;
    profile: any | null;
};

export function useClubAuth(redirectOnFail: boolean = true): ClubAuthResult {
    const router = useRouter();
    // Stable client instance
    const [supabase] = useState(() => createClient());

    const [loading, setLoading] = useState(true);
    const [clubId, setClubId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        async function resolveAuth() {
            try {
                // 1. Get User
                const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

                if (authError || !currentUser) {
                    if (redirectOnFail && mounted) router.push('/login');
                    return;
                }

                if (mounted) setUser(currentUser);

                // 2. Get Profile & Club ID (Robustly)
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('*, club:teams(id, name, shield_url)')
                    .eq('id', currentUser.id)
                    .single();

                let effectiveClubId = existingProfile?.club_id;

                // 3. Auto-Repair / Fallback Logic
                // 3. Fallback: Removed admin_id check as column does not exist.
                // Rely solely on profile.club_id linkage.

                if (mounted) {
                    setProfile(existingProfile);

                    if (effectiveClubId) {
                        setClubId(effectiveClubId);
                    } else {
                        // User exists but has no club associated
                        const msg = "Tu usuario no tiene un club asignado.";
                        setError(msg);
                        if (redirectOnFail) {
                            // Optional: Redirect to a generic "No Club" page or show error?
                            // Preventing Infinite Loop: Don't redirect to /club if we are already there logic?
                            // The page using this hook usually handles the UI for "loading" or "error".
                        }
                    }
                }

            } catch (err: any) {
                console.error("useClubAuth Error:", err);
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        resolveAuth();

        return () => {
            mounted = false;
        };
    }, [redirectOnFail]);

    return { loading, clubId, error, user, profile };
}
