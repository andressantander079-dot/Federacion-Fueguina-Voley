import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { coach_id } = body;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Get coach name & club info
        const { data: coachData } = await supabase
            .from('coaches')
            .select(`
                id,
                first_name,
                last_name,
                team:teams(id, name)
            `)
            .eq('id', coach_id)
            .single();

        if (!coachData) throw new Error("Técnico no encontrado");

        const coachName = `${coachData.first_name} ${coachData.last_name}`;
        const teamName = (coachData.team as any)?.name || 'Club';
        const clubId = (coachData.team as any)?.id;

        // 2. Fetch procedure_fees item 5 "Inscripción de Técnicos"
        const { data: settings } = await supabase.from('settings').select('procedure_fees').single();
        let feeAmount = 120000; // fallback default
        
        if (settings && settings.procedure_fees) {
            const item = settings.procedure_fees.find((item: any) => item.id === 5);
            if (item && item.price) {
                feeAmount = parseInt(item.price);
            }
        }

        // 3. Obtain a general Income Account ID
        const { data: accountData } = await supabase
            .from('treasury_accounts')
            .select('id')
            .eq('type', 'INGRESO')
            .limit(1)
            .single();

        const accountId = accountData?.id || null;

        // 4. Update status to habilitado
        const { error: updateError } = await supabase
            .from('coaches')
            .update({ status: 'habilitado' })
            .eq('id', coach_id);

        if (updateError) throw updateError;

        // 5. Insert Treasury Movement
        if (accountId) {
            const { error: treasuryError } = await supabase
                .from('treasury_movements')
                .insert({
                    date: new Date().toISOString(),
                    amount: feeAmount,
                    type: 'INGRESO',
                    description: `Ítem #5: Inscripción de Técnicos (${teamName} - ${coachName})`,
                    account_id: accountId,
                    entity_name: teamName
                });

            if (treasuryError) {
                console.error("Error creating treasury movement:", treasuryError);
                throw treasuryError;
            }
        }

        return NextResponse.json({ success: true, feeAmount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
