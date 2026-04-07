import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Starting seed process...");

    // 1. Fetch 2 generic teams
    const { data: teams, error: teamError } = await supabase.from('teams').select('id, name').limit(2);
    if (teamError) {
        console.error("Error fetching teams:", teamError);
        return;
    }
    if (!teams || teams.length < 2) {
        console.error("Not enough teams to perform seeding. Min 2 required.");
        return;
    }

    const teamA = teams[0].id;
    const teamB = teams[1].id;
    console.log(`Using Team A: ${teams[0].name}`);
    console.log(`Using Team B: ${teams[1].name}`);

    // 2. Insert Edge Case Players
    const adult = { team_id: teamA, name: 'QA Adulto Sin Deuda', number: 1, dni: '99912341', birth_date: '1990-01-01', gender: 'Masculino', status: 'active', has_debt: false };
    const minor = { team_id: teamA, name: 'QA Menor Sin Deuda', number: 2, dni: '99912342', birth_date: '2017-01-01', gender: 'Femenino', status: 'active', has_debt: false };
    const debtor = { team_id: teamA, name: 'QA Jugador Con Deuda', number: 3, dni: '99912343', birth_date: '1995-01-01', gender: 'Femenino', status: 'active', has_debt: true };

    console.log("Inserting QA players...");

    // Adulto
    await supabase.from('players').delete().in('dni', ['99912341', '99912342', '99912343']); // Clean previous attempts

    const { data: pAdult, error: eAdult } = await supabase.from('players').insert([adult]).select('id').single();
    if (eAdult) console.error("Error adult:", eAdult);

    const { data: pMinor, error: eMinor } = await supabase.from('players').insert([minor]).select('id').single();
    if (eMinor) console.error("Error minor:", eMinor);

    const { data: pDebtor, error: eDebtor } = await supabase.from('players').insert([debtor]).select('id').single();
    if (eDebtor) {
        console.error("Error debtor:", eDebtor);
        return;
    }

    console.log("Inserting Transfer (Pase) for debtor player...");
    const pase = {
        player_id: pDebtor.id,
        origen_club_id: teamA,
        solicitante_club_id: teamB,
        estado: 'solicitado'
    };
    const { error: ePase } = await supabase.from('tramites_pases').insert([pase]);
    if (ePase) console.error("Error pase:", ePase);

    console.log("Seeding fully complete.");
}

seed();
