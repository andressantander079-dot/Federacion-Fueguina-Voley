
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

async function checkReferees() {
    console.log("Checking Referees:");
    const { data: refs, error } = await supabase.from('referees').select('id, first_name, last_name, user_id');
    if (error) console.error(error);
    else console.table(refs);

    console.log("Checking Match Officials:");
    const { data: offs, error: oErr } = await supabase.from('match_officials').select('id, user_id, role');
    if (oErr) console.error(oErr);
    else console.table(offs);
}

checkReferees();
