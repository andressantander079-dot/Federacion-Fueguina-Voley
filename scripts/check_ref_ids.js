
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) process.env[k] = envConfig[k];
} catch (e) { }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABAS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRefIds() {
    const { data, error } = await supabase.from('referees').select('*');
    if (data) {
        console.log("Referees Count:", data.length);
        if (data.length > 0) {
            console.log("First Row ID:", data[0].id, "Type:", typeof data[0].id);
            console.log("Keys:", Object.keys(data[0]));
        }
    } else {
        console.log("Error:", error.message);
    }
}

checkRefIds();
