import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { referee_id } = body;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Get referee name
        const { data: refData } = await supabase
            .from('referees')
            .select(`
                id,
                profile:profiles(full_name)
            `)
            .eq('id', referee_id)
            .single();

        if (!refData) throw new Error("Árbitro no encontrado");

        // @ts-ignore
        const refereeName = refData.profile?.full_name || 'Desconocido';

        // 2. Fetch procedure_fees item 9 "Inscripción de Árbitro/a"
        const { data: settings } = await supabase.from('settings').select('procedure_fees').single();
        let feeAmount = 100000; // fallback default
        
        if (settings && settings.procedure_fees) {
            const item9 = settings.procedure_fees.find((item: any) => item.id === 9);
            if (item9 && item9.price) {
                feeAmount = parseInt(item9.price);
            }
        }

        // 3. Obtain a general Income Account ID for 'Tramites' or fallback
        const { data: accountData } = await supabase
            .from('treasury_accounts')
            .select('id')
            .eq('type', 'INGRESO')
            .limit(1)
            .single();

        const accountId = accountData?.id || null;

        // 4. Update status to activo
        const { error: updateError } = await supabase
            .from('referees')
            .update({ status: 'activo' })
            .eq('id', referee_id);

        if (updateError) throw updateError;

        // 5. Insert Treasury Movement
        const { error: treasuryError } = await supabase
            .from('treasury_movements')
            .insert({
                amount: feeAmount,
                type: 'INGRESO',
                description: `Ítem 9: Inscripción de Árbitro/a (${refereeName}) - Temporada 2026`,
                account_id: accountId
            });

        if (treasuryError) throw treasuryError;

        return NextResponse.json({ success: true, feeAmount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
