import { createClient } from '@/lib/supabase/client';

export async function executeLiveMatchCleanup() {
    const supabase = createClient();

    // 1. Consultar partidos únicamente en estado 'live' o 'en_curso'
    const { data: liveMatches, error: fetchErr } = await supabase
        .from('matches')
        .select('id, scheduled_time, created_at, sheet_data, updated_at')
        .in('status', ['live', 'en_curso']);

    if (fetchErr || !liveMatches) {
        if (fetchErr) console.error("Error fetching live matches for cleanup:", fetchErr.message);
        return { count: 0, error: fetchErr?.message };
    }

    const now = Date.now();
    const inactiveMatchIds: string[] = [];

    for (const match of liveMatches) {
        const sheet = match.sheet_data || {};
        const sets = sheet.sets_history || sheet.sets || [];

        // 1. Verificar si el partido ya terminó deportivamente por marcador final
        const bestOf = sheet.metadata?.bestOfSets || 5;
        const targetSets = Math.ceil(bestOf / 2);
        
        const setsWonHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
        const setsWonAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

        if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
            inactiveMatchIds.push(match.id);
            continue;
        }

        // 2. REGLA ESTRICTA DE INACTIVIDAD:
        // Jamás evaluar scheduled_time ni created_at (los retrasos en el gimnasio son normales).
        // Únicamente evaluar si existe una marca explícita de actividad en sheet_data.last_point_at.
        const lastPointTime = sheet.last_point_at ? new Date(sheet.last_point_at).getTime() : null;

        // Si NO hay marca explícita de puntos iniciados (partido sin iniciar o sin puntos), NUNCA auto-suspender
        if (!lastPointTime) {
            continue;
        }

        // Si existe registro explícito de puntos y han transcurrido más de 40 min ininterrumpidos sin modificaciones, suspender
        if (now - lastPointTime > 40 * 60 * 1000) {
            inactiveMatchIds.push(match.id);
        }
    }

    if (inactiveMatchIds.length === 0) {
        return { count: 0 };
    }

    // Auto-suspensión atómica en BD
    const { data: updatedData, error: updateErr } = await supabase
        .from('matches')
        .update({
            status: 'suspendido'
        })
        .in('id', inactiveMatchIds)
        .in('status', ['live', 'en_curso']);

    if (updateErr) {
        console.error("Error auto-suspending inactive matches:", updateErr);
        return { count: 0, error: updateErr.message };
    }

    return { count: inactiveMatchIds.length, suspendedIds: inactiveMatchIds };
}
