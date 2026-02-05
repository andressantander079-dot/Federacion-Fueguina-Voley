
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

async function inspect() {
    console.log("--- Categories ---");
    const { data: cats, error: cErr } = await supabase.from('categories').select('*');
    if (cErr) console.error(cErr);
    else console.table(cats);

    console.log("--- Tables starting with 'match' ---");
    // We can't list tables easily via JS client without admin/pg_meta, but we can guess or try to select from likely names
    // Common names: match_players, match_squads, lineups

    const tables = ['match_players', 'match_lineups', 'lineups', 'sheets'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log(`Table '${t}' EXISTS.`);
        else console.log(`Table '${t}' likely does not exist or error:`, error.code);
    }
}

inspect();
