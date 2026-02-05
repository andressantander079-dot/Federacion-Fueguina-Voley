
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPlayers() {
    console.log("--- Checking Squad Players ---");
    // ID from previous run: River ID: 9c3e6867-9bc4-426e-b97a-31bd5c565415
    // Squad ID? Need to fetch again.

    const riverId = '9c3e6867-9bc4-426e-b97a-31bd5c565415';

    const { data: squads } = await supabase.from('squads').select('*').eq('team_id', riverId);
    if (!squads || squads.length === 0) { console.log("No squads"); return; }

    const squad = squads[0]; // The first one
    console.log(`Checking Squad: ${squad.name} (${squad.id})`);

    const { data: players, error } = await supabase.from('squad_players').select('player_id').eq('squad_id', squad.id);

    if (error) console.error("Error fetching players:", error);
    console.log(`Players Count: ${players ? players.length : 0}`);
}
checkPlayers();
