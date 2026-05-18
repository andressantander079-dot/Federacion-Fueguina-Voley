require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log("Starting Treasury Details Migration...");

    // 1. Delete aggregated records
    console.log("Deleting Regulación DB aggregated entries...");
    const { data: deleted, error: deleteError } = await supabase
        .from('treasury_movements')
        .delete()
        .ilike('description', '%Regulación DB%')
        .select('id');

    if (deleteError) {
        console.error("Error deleting:", deleteError);
        return;
    }
    console.log(`Deleted ${deleted.length} aggregated entries.`);

    // 2. Get Treasury Account
    const { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'INGRESO').limit(1);
    const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;
    if (!accountId) {
        console.error("No Ingreso account found!");
        return;
    }

    // Prepare batch insertions array
    let movementsToInsert = [];

    // Helper: Check if DNI already exists in DB to prevent duplicates
    const checkDuplicates = new Set();
    const { data: existingMovs } = await supabase.from('treasury_movements').select('description');
    if (existingMovs) {
        for (const mov of existingMovs) {
            // Very naive duplicate tracking: we assume duplicate checks rely on DNI or Name within description
            checkDuplicates.add(mov.description);
        }
    }

    const addMovement = (desc, amount, date, entity_name) => {
        // Simple check to avoid creating duplicates
        if (!checkDuplicates.has(desc)) {
            movementsToInsert.push({
                type: 'INGRESO',
                amount: amount,
                description: desc,
                entity_name: entity_name || 'Generico',
                date: date,
                account_id: accountId,
                created_at: date // Preserving original timestamp
            });
            checkDuplicates.add(desc); // prevent duplicate in same batch
        }
    }

    // 3. Process Active Clubs
    console.log("Fetching Clubs...");
    const { data: clubs } = await supabase.from('teams').select('*').eq('has_paid_inscription', true);
    for (const club of (clubs || [])) {
        const desc = `Inscripción Anual de Clubes: ${club.name}`;
        addMovement(desc, 450000, club.created_at, club.name);
    }

    // 4. Process Referees
    console.log("Fetching Referees...");
    const { data: referees } = await supabase.from('referees').select('*').eq('status', 'active');
    for (const ref of (referees || [])) {
        const desc = `Alta Árbitro: ${ref.first_name} ${ref.last_name}`;
        addMovement(desc, 120000, ref.created_at, "Colegio de Árbitros");
    }

    // 5. Process Coaches
    console.log("Fetching Coaches...");
    const { data: coaches } = await supabase.from('coaches').select('*, teams(name)').eq('status', 'active');
    for (const coach of (coaches || [])) {
        const desc = `Alta Técnico: ${coach.first_name} ${coach.last_name} - DNI ${coach.dni}`;
        const teamName = coach.teams ? coach.teams.name : "Colegio de Técnicos";
        addMovement(desc, 120000, coach.created_at, teamName);
    }

    // 6. Process Players
    console.log("Fetching Active Players...");
    const { data: players, error: playersError } = await supabase.from('players').select('*, teams(name)').eq('status', 'active');
    if (playersError) console.error("Error fetching players:", playersError);
    
    for (const player of (players || [])) {
        // Calculate age
        const birthDate = new Date(player.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

        const targetFeeId = age >= 12 ? 2 : 3;
        const feeTitle = targetFeeId === 2 ? 'Inscripción de jugadores/as mayores de 12 años' : 'Inscripción de Jugadoras/es menores de 12 años';
        const feeAmount = targetFeeId === 2 ? 60000 : 36000;

        const desc = `Inscripción Jugador (${feeTitle}): ${player.name} - DNI ${player.dni}`;
        const teamName = player.teams ? player.teams.name : "Jugador Libre";
        
        addMovement(desc, feeAmount, player.created_at, teamName);
    }

    // 7. Process Transfers (Pases)
    console.log("Fetching Transfers...");
    // Assuming transfers are in procedures table with type Pase or in a dedicated transfers table.
    // Based on user screenshot "Pases Completados (Regulación DB: 14 Pases Oficiales)", we look at procedures table.
    const { data: procedures } = await supabase.from('procedures').select('*, teams(name)').eq('status', 'aprobado').ilike('title', '%Pase%');
    for (const proc of (procedures || [])) {
        const amount = Number(proc.amount) || 60000; // default Pase Mayor if not set
        const code = proc.code || proc.id.substring(0, 8);
        const desc = `Trámite: ${proc.title} - Op: ${code}`;
        const teamName = proc.teams ? proc.teams.name : "Club Destino";

        addMovement(desc, amount, proc.created_at, teamName);
    }

    console.log(`Ready to insert ${movementsToInsert.length} individual movements.`);

    // 8. Insert in chunks of 100 to avoid limits
    let insertedCount = 0;
    const chunkSize = 100;
    for (let i = 0; i < movementsToInsert.length; i += chunkSize) {
        const chunk = movementsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('treasury_movements').insert(chunk);
        if (insertError) {
            console.error(`Error inserting chunk ${i}:`, insertError);
        } else {
            insertedCount += chunk.length;
            console.log(`Inserted chunk... (${insertedCount}/${movementsToInsert.length})`);
        }
    }

    console.log("Migration completed successfully!");
}

runMigration();
