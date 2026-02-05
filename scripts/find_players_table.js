
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABAS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    // We can't query pg_catalog directly via client usually, but we can try to select from likely candidates
    const candidates = ['players', 'members', 'team_players', 'squad_members', 'users'];

    for (const t of candidates) {
        const { data, error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log(`Table '${t}' EXISTS.`);
        else console.log(`Table '${t}' checked: ${error.code}`);
    }
}

listTables();
