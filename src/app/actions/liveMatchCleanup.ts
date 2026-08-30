import { createClient } from '@/lib/supabase/client';

export async function executeLiveMatchCleanup() {
    const supabase = createClient();

    // 1. Consultar partidos en curso o live
    const { data: liveMatches, error: fetchErr } = await supabase
        .from('matches')
        .select('id, scheduled_time, created_at, sheet_data')
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

        // 1. Verificar si el partido ya terminó por marcador final
        const bestOf = sheet.metadata?.bestOfSets || 5;
        const targetSets = Math.ceil(bestOf / 2);
        
        const setsWonHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
        const setsWonAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

        if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
            inactiveMatchIds.push(match.id);
            continue;
        }

        // 2. Solo auto-suspender si hay timestamp explícito de último punto o inicio registrado y han pasado más de 40 min de inactividad
        const lastPointTime = sheet.last_point_at ? new Date(sheet.last_point_at).getTime() : null;
        const startedTime = sheet.started_at ? new Date(sheet.started_at).getTime() : null;

        const lastExplicitActivity = lastPointTime || startedTime;

        // Si hay registro explícito de actividad previa y supera los 40 min sin modificaciones, suspender
        if (lastExplicitActivity && (now - lastExplicitActivity > 40 * 60 * 1000)) {
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
