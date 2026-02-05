
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

async function inspectContent() {
    // Fetch officials
    const { data, error } = await supabase.from('match_officials').select('id, user_id, role, status').limit(10);
    if (data) {
        console.log("Match Officials Rows:", data.length);
        console.table(data);
    } else {
        console.log("Error:", error.message);
    }
}

inspectContent();
