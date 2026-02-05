const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

// Using Service Role to see truth
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMatches() {
    const { data: matches, error } = await supabase
        .from('matches')
        .select('id, status, sheet_data, home_team_id, away_team_id')
        .neq('status', 'finalizado'); // Just active ones

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- ACTIVE MATCHES STATUS ---');
    matches.forEach(m => {
        console.log(`ID: ${m.id} | Status: ${m.status} | Sheet Data Sets: ${m.sheet_data?.sets_history?.length || 0}`);
    });
}

checkMatches();
