
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSquads() {
    console.log("--- Checking Teams ---");
    const { data: teams } = await supabase.from('teams').select('id, name');
    const river = teams.find(t => t.name.includes('River'));

    if (!river) {
        console.log("River Plate not found in teams");
        return;
    }
    console.log("River Plate ID:", river.id);

    console.log("--- Checking Squads for River ---");
    const { data: squads, error } = await supabase.from('squads').select('*').eq('team_id', river.id);
    if (error) console.error(error);
    console.log("Squads Found:", squads.length);
    if (squads.length > 0) console.log("Sample Squad:", squads[0]);

    console.log("--- Checking Categories ---");
    const { data: cats } = await supabase.from('categories').select('*');
    console.log("Categories:", cats.map(c => ({ id: c.id, name: c.name, gender: c.gender })));
}

checkSquads();
