
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMatches() {
    console.log("Checking Matches...");
    const now = new Date().toISOString();
    console.log("Current Time (ISO):", now);

    // Get all matches
    const { data: matches, error } = await supabase
        .from('matches')
        .select(`id, scheduled_time, status, home_team_id, away_team_id`)
        .order('scheduled_time', { ascending: false });

    if (error) {
        console.error("Error fetching matches:", error);
        return;
    }

    console.log(`Total Matches Found: ${matches.length}`);
    matches.forEach(m => {
        console.log(`- ${m.scheduled_time} | Status: ${m.status} | ID: ${m.id}`);
    });

    // Check Matches >= NOW
    const future = matches.filter(m => m.scheduled_time >= now);
    console.log(`Matches >= NOW: ${future.length}`);

    // Check Officials
    const { data: officials } = await supabase.from('match_officials').select('*');
    console.log(`Total Officials Assignments: ${officials.length}`);
}

checkMatches();
