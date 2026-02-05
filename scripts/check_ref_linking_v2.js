
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) process.env[k] = envConfig[k];
} catch (e) { }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABAS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data, error } = await supabase.from('referees').select('*').limit(5);
        if (error) {
            console.log("Error:", error.message);
            return;
        }
        console.log("Found referees:", data.length);
        if (data.length > 0) {
            // Log keys to see if email exists
            console.log("Keys:", Object.keys(data[0]));
            data.forEach(r => {
                console.log(`Ref: ${r.first_name} ${r.last_name} | UserID: ${r.user_id} | Email: ${r.email || 'N/A'}`);
            });
        }
    } catch (err) {
        console.log("Exception:", err.message);
    }
}

run();
