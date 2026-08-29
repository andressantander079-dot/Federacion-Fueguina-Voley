import { createClient } from '@/lib/supabase/client';

export async function executeLiveMatchCleanup() {
    const supabase = createClient();
    const cutoffDate = new Date(Date.now() - 40 * 60 * 1000).toISOString();

    // 1. Consultar partidos en curso o live
    const { data: liveMatches, error: fetchErr } = await supabase
        .from('matches')
        .select('id, scheduled_time, created_at, sheet_data, last_activity_at')
        .in('status', ['live', 'en_curso']);

    if (fetchErr || !liveMatches) {
        return { count: 0, error: fetchErr?.message };
    }

    const now = Date.now();
    const inactiveMatchIds: string[] = [];

    for (const match of liveMatches) {
        const sheet = match.sheet_data || {};
        const sets = sheet.sets_history || sheet.sets || [];

        // Verificar si el partido ya terminó por marcador
        const bestOf = sheet.metadata?.bestOfSets || 5;
        const targetSets = Math.ceil(bestOf / 2);
        
        const setsWonHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
        const setsWonAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

        if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
            // Partido concluido por score final
            inactiveMatchIds.push(match.id);
            continue;
        }

        // Evaluar sello de última actividad
        const lastPointTime = sheet.last_point_at ? new Date(sheet.last_point_at).getTime() : null;
        const lastActivityTime = match.last_activity_at ? new Date(match.last_activity_at).getTime() : null;
        const scheduledTime = match.scheduled_time ? new Date(match.scheduled_time).getTime() : null;
        const createdTime = match.created_at ? new Date(match.created_at).getTime() : now;

        const mostRecent = lastPointTime || lastActivityTime || scheduledTime || createdTime;
        const elapsed = now - mostRecent;

        if (elapsed > 40 * 60 * 1000) {
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
            status: 'suspendido',
            suspension_reason: 'inactividad_40min'
        })
        .in('id', inactiveMatchIds)
        .in('status', ['live', 'en_curso']);

    if (updateErr) {
        console.error("Error auto-suspending inactive matches:", updateErr);
        return { count: 0, error: updateErr.message };
    }

    return { count: inactiveMatchIds.length, suspendedIds: inactiveMatchIds };
}
