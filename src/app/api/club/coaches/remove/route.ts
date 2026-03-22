import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { coach_id, club_id } = body;

        if (!coach_id || !club_id) {
            return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Security check: Ensure coach actually belongs to this club
        const { data: coachData } = await supabase
            .from('coaches')
            .select('club_id, status')
            .eq('id', coach_id)
            .single();

        if (!coachData || coachData.club_id !== club_id) {
            return NextResponse.json({ error: 'No autorizado o técnico Inexistente' }, { status: 403 });
        }

        // --- Roster Check Logic (Mocked conceptually for now - depends on actual roster table schema) ---
        // In a real scenario, you'd check something like:
        // const { data: activeRosters } = await supabase.from('rosters').select('id').eq('coach_id', coach_id).eq('status', 'active');
        // if (activeRosters.length > 0) throw new Error("No se puede dar de baja a un técnico asignado a una Lista de Buena Fe activa.");
        
        // Soft Delete -> "inactivo"
        const { error: updateError } = await supabase
            .from('coaches')
            .update({ status: 'inactivo' })
            .eq('id', coach_id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
