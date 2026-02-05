
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

async function checkColumns() {
    // Try to select specific columns expected
    const cols = ['id', 'match_id', 'team_id', 'player_id', 'jersey_number', 'is_captain', 'is_libero'];
    const { data, error } = await supabase.from('match_lineups').select(cols.join(',')).limit(1);

    if (error) {
        console.error("Error selecting columns:", error.message);
        // Try minimal
        const { error: err2 } = await supabase.from('match_lineups').select('match_id').limit(1);
        if (!err2) console.log("match_id exists");

        const { error: err3 } = await supabase.from('match_lineups').select('player_id').limit(1);
        if (!err3) console.log("player_id exists");

        const { error: err4 } = await supabase.from('match_lineups').select('jersey_number').limit(1);
        if (!err4) console.log("jersey_number exists");

        const { error: err5 } = await supabase.from('match_lineups').select('shirt_number').limit(1);
        if (!err5) console.log("shirt_number exists (alternative to jersey_number)");
    } else {
        console.log("All standard columns exist:", cols.join(', '));
    }
}

checkColumns();
