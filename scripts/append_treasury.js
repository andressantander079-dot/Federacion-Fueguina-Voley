require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAppend() {
    console.log("Appending missing coaches, referees, and pases...");

    const { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'INGRESO').limit(1);
    const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;
    if (!accountId) return console.error("No Ingreso account");

    let movementsToInsert = [];

    const checkDuplicates = new Set();
    const { data: existingMovs } = await supabase.from('treasury_movements').select('description');
    if (existingMovs) {
        for (const mov of existingMovs) checkDuplicates.add(mov.description);
    }

    const addMovement = (desc, amount, date, entity_name) => {
        if (!checkDuplicates.has(desc)) {
            movementsToInsert.push({
                type: 'INGRESO',
                amount: amount,
                description: desc,
                entity_name: entity_name || 'Generico',
                date: date,
                account_id: accountId,
                created_at: date
            });
            checkDuplicates.add(desc);
        }
    }

    // 1. Referees
    const { data: referees } = await supabase.from('referees').select('*').eq('status', 'activo');
    for (const ref of (referees || [])) {
        const desc = `Alta Árbitro: ${ref.first_name} ${ref.last_name}`;
        addMovement(desc, 120000, ref.created_at, "Colegio de Árbitros");
    }

    // 2. Coaches
    const { data: coaches } = await supabase.from('coaches').select('*, teams(name)').eq('status', 'habilitado');
    for (const coach of (coaches || [])) {
        const desc = `Alta Técnico: ${coach.first_name} ${coach.last_name} - DNI ${coach.dni}`;
        const teamName = coach.teams ? coach.teams.name : "Colegio de Técnicos";
        addMovement(desc, 120000, coach.created_at, teamName);
    }

    // 3. Pases
    const { data: pases } = await supabase.from('tramites_pases').select('*, player:players(name, dni, birth_date), solicitante:teams!solicitante_club_id(name)').eq('estado', 'completado');
    for (const pase of (pases || [])) {
        if (!pase.player) continue;

        if (pase.tipo_pase === 'prestamo') continue; // prestamos are $0, usually skip

        const birthDate = new Date(pase.player.birth_date);
        const today = new Date(pase.created_at);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

        const feeTitleRaw = age >= 18 ? 'Pase Mayor de 18 años' : 'Pase menor de 18 años';
        const feeAmount = age >= 18 ? 60000 : 40000;

        const desc = `Arancel de Pase (${feeTitleRaw}): Jugador ${pase.player.name} - DNI ${pase.player.dni}`;
        addMovement(desc, feeAmount, pase.created_at, pase.solicitante ? pase.solicitante.name : 'Club Adquirente');
    }

    console.log(`Ready to insert ${movementsToInsert.length} individual movements.`);
    if (movementsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('treasury_movements').insert(movementsToInsert);
        if (insertError) console.error("Error inserting:", insertError);
        else console.log("Success! Inserted missing entities.");
    }
}
runAppend();
