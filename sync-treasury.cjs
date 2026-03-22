const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncTreasury() {
    console.log("Starting Treasury Sync...");
    
    // 1. Get Accounts and Fees
    const { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'INGRESO').limit(1);
    const accountId = accounts?.[0]?.id;
    if (!accountId) throw new Error("No INGRESO account");
    
    const { data: settings } = await supabase.from('settings').select('procedure_fees').single();
    const fees = settings.procedure_fees;
    
    const getFee = (id) => fees.find(f => f.id === id);
    const mayorFee = getFee(2);
    const menorFee = getFee(3);
    const coachFee = getFee(5);
    const refFee = getFee(9);

    // 2. Delete auto-generated movements
    console.log("Deleting old generated movements...");
    const exactDelete = await supabase.from('treasury_movements')
        .delete()
        .or('description.ilike.Inscripción Jugador%,description.ilike.Inscripción y Fichaje Jugador%,description.ilike.%Ítem #5:%,description.ilike.Ítem 9: Inscripción de Árbitro%');
    console.log("Deleted old movements:", exactDelete.error ? exactDelete.error : 'Success');

    // 3. Players
    const { data: players } = await supabase.from('players').select('id, name, dni, birth_date, teams(name)').eq('status', 'active');
    console.log(`Processing ${players?.length || 0} active players...`);
    let targetMovements = [];
    const today = new Date();
    
    for (const p of players || []) {
        const birthDate = new Date(p.birth_date);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        
        const isMayor = age >= 12; // NEW RULE
        const feeObj = isMayor ? mayorFee : menorFee;
        const feeTitle = isMayor ? 'Inscripción Mayores (>12)' : 'Inscripción Menores (<12)';
        
        targetMovements.push({
            date: new Date().toISOString(),
            amount: Number(feeObj.price),
            type: 'INGRESO',
            description: `Inscripción Jugador (${feeTitle}): ${p.name} - DNI ${p.dni}`,
            entity_name: p.teams?.name || 'Club Adquirente',
            account_id: accountId
        });
    }

    // 4. Coaches
    const { data: coaches } = await supabase.from('coaches').select('first_name, last_name, teams(name)').eq('status', 'habilitado');
    console.log(`Processing ${coaches?.length || 0} approved coaches...`);
    for (const c of coaches || []) {
        targetMovements.push({
            date: new Date().toISOString(),
            amount: Number(coachFee.price),
            type: 'INGRESO',
            description: `Ítem #5: Inscripción de Técnicos (${c.teams?.name} - ${c.first_name} ${c.last_name})`,
            entity_name: c.teams?.name || 'Club Adquirente',
            account_id: accountId
        });
    }
    
    // 5. Referees
    const { data: referees } = await supabase.from('referees').select('first_name, last_name').eq('status', 'aprobado');
    console.log(`Processing ${referees?.length || 0} approved referees...`);
    for (const r of referees || []) {
        targetMovements.push({
            date: new Date().toISOString(),
            amount: Number(refFee.price),
            type: 'INGRESO',
            description: `Ítem 9: Inscripción de Árbitro/a (${r.first_name} ${r.last_name}) - Temporada 2026`,
            entity_name: 'Colegio de Árbitros',
            account_id: accountId
        });
    }

    // 6. Insert All in chunks
    console.log(`Inserting ${targetMovements.length} total movements...`);
    const chunkSize = 100;
    for (let i = 0; i < targetMovements.length; i += chunkSize) {
        const chunk = targetMovements.slice(i, i + chunkSize);
        const ins = await supabase.from('treasury_movements').insert(chunk);
        if (ins.error) console.error("Insert error:", ins.error);
    }
    
    console.log("Treasury Sync Complete!");
}
syncTreasury();
