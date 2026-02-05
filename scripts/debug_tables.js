
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStructure() {
    console.log("--- Checking 'players' table ---");
    const { data: players, error } = await supabase.from('players').select('*').limit(1);

    if (error) {
        console.log("players table error:", error.message);
    } else {
        console.log("players table found. Row sample:", players[0]);
    }

    console.log("--- Checking 'squad_players' table ---");
    const { data: sp, error: spError } = await supabase.from('squad_players').select('*').limit(1);
    if (spError) {
        console.log("squad_players table error:", spError.message);
    } else {
        console.log("squad_players table found. Row sample:", sp[0]);
    }
}
checkStructure();
