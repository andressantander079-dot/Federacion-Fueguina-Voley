
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDetails() {
    console.log("--- Checking Teams ---");
    const { data: teams } = await supabase.from('teams').select('id, name');
    const river = teams.find(t => t.name.includes('River'));
    const instituto = teams.find(t => t.name.includes('Instituto'));

    if (!river) { console.log("River not found"); return; }

    console.log(`River ID: ${river.id}`);

    // Fetch Match
    console.log("--- Checking Matches (River vs Instituto) ---");
    const { data: matches } = await supabase
        .from('matches')
        .select('*, category:categories(*)')
        .or(`home_team_id.eq.${river.id},away_team_id.eq.${river.id}`)
        //.eq('away_team_id', instituto ? instituto.id : '') // Optional, just list recent
        .order('created_at', { ascending: false })
        .limit(3);

    matches.forEach(m => {
        console.log(`Match: ${m.id} | Gender: ${m.gender} | Category: ${m.category?.name} (${m.category_id})`);
    });

    if (matches.length > 0) {
        const match = matches[0];
        console.log(`Analyzing Match: ${match.id} (Gender: ${match.gender})`);

        // Check Squads for this match criteria
        console.log("--- River Squads ---");
        const { data: squads } = await supabase.from('squads').select('*').eq('team_id', river.id);

        squads.forEach(s => {
            let status = "❌";
            if (!match.gender || s.gender === match.gender || !s.gender) status = "✅ Gender";

            // Check Category Min Year logic if possible, or just IDs
            // We need categories table for that.
            console.log(`${status} Squad: ${s.name} | Gender: ${s.gender} | CatID: ${s.category_id}`);
        });
    }
}

checkDetails();
