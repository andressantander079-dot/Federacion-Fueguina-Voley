
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMatches() {
    console.log("--- Checking Matches Statuses ---");
    const { data: matches, error } = await supabase.from('matches').select('id, status, scheduled_time, home_team_id, away_team_id');

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Group by status
    const counts = {};
    matches.forEach(m => {
        counts[m.status] = (counts[m.status] || 0) + 1;
    });
    console.log("Status Counts:", counts);
    console.log("Total Matches:", matches.length);
}
checkMatches();
