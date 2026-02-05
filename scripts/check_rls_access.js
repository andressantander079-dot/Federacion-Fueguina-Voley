
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log("No .env.local found or error reading it");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABAS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL; // Fix typo handling
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccess() {
    console.log("Checking plain anonymous access to 'matches'...");
    const { data: matches, error: mError } = await supabase.from('matches').select('id, status').limit(5);
    if (mError) {
        console.error("Matches Error:", mError);
    } else {
        console.log(`Matches found: ${matches.length}`);
    }

    console.log("Checking plain access to 'teams'...");
    const { data: teams, error: tError } = await supabase.from('teams').select('id, name').limit(5);
    if (tError) {
        console.error("Teams Error:", tError);
    } else {
        console.log(`Teams found: ${teams.length}`);
    }
}

checkAccess();
