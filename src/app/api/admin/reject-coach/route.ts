import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { coach_id, reason } = body;

        if (!coach_id || !reason) {
            return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Update status to rechazado and log reason
        const { error: updateError } = await supabase
            .from('coaches')
            .update({ 
                status: 'rechazado',
                rejection_reason: reason
            })
            .eq('id', coach_id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
