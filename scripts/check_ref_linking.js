
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

async function checkRefLinking() {
    const { data: refs, error } = await supabase.from('referees').select('*').limit(10);
    if (data) {
        console.log("Referees Data Sample:");
        data.forEach(r => {
            console.log(`- ID: ${r.id}, Name: ${r.first_name} ${r.last_name}, Email: ${r.email}, UserID: ${r.user_id}`);
        });
    } else {
        console.log("Error:", error);
    }
}

checkRefLinking();
