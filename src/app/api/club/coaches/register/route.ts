import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');
    const checkOnly = searchParams.get('checkOnly');

    if (!dni) {
        return NextResponse.json({ error: 'Falta DNI' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Check if DNI already is in use by another active/pending team
    const { data: existingCoach, error: fetchErr } = await supabase
        .from('coaches')
        .select('*')
        .eq('dni', dni)
        .maybeSingle();

    if (fetchErr) {
        return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 });
    }

    if (existingCoach) {
        if (existingCoach.status === 'habilitado' || existingCoach.status === 'pendiente') {
            return NextResponse.json({ 
                error: 'Este DNI ya se encuentra activo o en trámite en otro club. El club actual debe darle de baja primero.' 
            }, { status: 400 });
        }
        // If it's 'inactivo' or 'rechazado', it is reactivable.
    }

    if (checkOnly) {
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Usa POST para registrar' }, { status: 405 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { club_id, first_name, last_name, dni, photo_url, id_document_url, payment_url } = body;

        if (!club_id || !first_name || !last_name || !dni || !photo_url || !id_document_url || !payment_url) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. DNI Lookup again for security
        const { data: existingCoach } = await supabase
            .from('coaches')
            .select('*')
            .eq('dni', dni)
            .maybeSingle();

        if (existingCoach) {
            if (existingCoach.status === 'habilitado' || existingCoach.status === 'pendiente') {
                return NextResponse.json({ 
                    error: 'Este DNI ya se encuentra activo o en trámite en otro club. El club actual debe darle de baja primero.' 
                }, { status: 400 });
            }

            // REACTIVATION LOGIC
            const { error: updateError } = await supabase
                .from('coaches')
                .update({
                    club_id,
                    first_name, // Update in case of typos fixed by new club
                    last_name,
                    status: 'pendiente',
                    rejection_reason: null,
                    photo_url,
                    id_document_url,
                    payment_url
                })
                .eq('id', existingCoach.id);

            if (updateError) {
                console.error("Reactivation error:", updateError);
                throw new Error("Error reactivando el perfil existente.");
            }

            return NextResponse.json({ success: true, reactivated: true });
        }

        // NEW REGISTRATION LOGIC
        const { error: insertError } = await supabase
            .from('coaches')
            .insert({
                club_id,
                first_name,
                last_name,
                dni,
                status: 'pendiente',
                photo_url,
                id_document_url,
                payment_url
            });

        if (insertError) {
            console.error("Insert error:", insertError);
            throw new Error("Error registrando al nuevo técnico.");
        }

        return NextResponse.json({ success: true, created: true });

    } catch (error: any) {
        console.error("POST Coaches register error:", error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
