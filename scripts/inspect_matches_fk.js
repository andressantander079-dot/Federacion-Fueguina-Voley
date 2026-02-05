
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

async function inspectMatches() {
    // Check if venue_id column exists
    const { data: cols, error } = await supabase.from('matches').select('id, venue_id').limit(1);
    if (error) console.error("Error selecting matches:", error);
    else console.log("Matches columns sample:", Object.keys(cols[0] || {}));

    // We can't easily check constraints via client unless we try to join and fail (which we know it does)
    // or use RPC if we had one.
    // But we can try to guess if it is 'venue_id' or 'court_id' etc.
}

inspectMatches();
