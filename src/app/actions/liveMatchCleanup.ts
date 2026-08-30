import { createClient } from '@/lib/supabase/client';

export async function executeLiveMatchCleanup() {
    const supabase = createClient();

    // 1. Consultar partidos en curso o live (usando columnas base garantizadas)
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

        // 1. Verificar si el partido ya terminó por marcador
        const bestOf = sheet.metadata?.bestOfSets || 5;
        const targetSets = Math.ceil(bestOf / 2);
        
        const setsWonHome = sets.filter((s: any) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
        const setsWonAway = sets.filter((s: any) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

        if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
            inactiveMatchIds.push(match.id);
            continue;
        }

        // 2. Evaluar sello de última actividad (last_point_at, started_at, scheduled_time o created_at)
        const lastPointTime = sheet.last_point_at ? new Date(sheet.last_point_at).getTime() : null;
        const startedTime = sheet.started_at ? new Date(sheet.started_at).getTime() : null;
        const scheduledTime = match.scheduled_time ? new Date(match.scheduled_time).getTime() : null;
        const createdTime = match.created_at ? new Date(match.created_at).getTime() : null;

        // Tomar la fecha más relevante disponible
        const mostRecent = lastPointTime || startedTime || scheduledTime || createdTime || now;
        const elapsed = now - mostRecent;

        // Si pasaron más de 40 minutos sin modificaciones, agregar a la lista de auto-suspensión
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
