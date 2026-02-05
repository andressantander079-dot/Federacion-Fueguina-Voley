
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

async function inspectRawPlayers() {
    const { data, error } = await supabase.from('players').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        if (data.length > 0) console.log(Object.keys(data[0]));
        else console.log("Table 'players' is empty, can't infer columns easily.");
    }
}

inspectRawPlayers();
