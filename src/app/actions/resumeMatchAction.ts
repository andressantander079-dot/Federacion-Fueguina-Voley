import { createClient } from '@/lib/supabase/client';

export async function resumeMatchAction(matchId: string) {
    if (!matchId) throw new Error("ID de partido inválido");

    const supabase = createClient();
    const userRes = await supabase.auth.getUser();
    const user = userRes.data.user;

    if (!user) {
        throw new Error("No autorizado: Debe iniciar sesión para reanudar el partido.");
    }

    // 1. RBAC: Verificar si el usuario es Admin o Coordinador
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'coordinador';

    // 2. RBAC: Verificar si es el Árbitro designado para el encuentro
    const { data: isOfficial } = await supabase
        .from('match_officials')
        .select('id')
        .eq('match_id', matchId)
        .eq('user_id', user.id)
        .maybeSingle();

    const { data: matchData } = await supabase
        .from('matches')
        .select('referee_id')
        .eq('id', matchId)
        .maybeSingle();

    const isDesignatedReferee = matchData?.referee_id === user.id || !!isOfficial;

    if (!isAdmin && !isDesignatedReferee) {
        throw new Error("Acceso denegado: Solo el árbitro designado o un administrador pueden reanudar este partido.");
    }

    // 3. Operación atómica de reanudación con actualización de last_activity_at y limpieza de causa
    const { data, error } = await supabase
        .from('matches')
        .update({ 
            status: 'en_curso',
            suspension_reason: null,
            last_activity_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .eq('status', 'suspendido')
        .select();

    if (error) {
        console.error("Error al reanudar partido:", error);
        throw new Error("Error al reanudar el partido: " + error.message);
    }

    return { success: true, match: data?.[0] };
}
