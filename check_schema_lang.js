const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("🔍 Inspecting Schema for Spanish terms...");

    // We can't easily query information_schema via JS client without raw SQL RPC, 
    // but we can try to infer from a sample of data from known tables.
    // Or better, just check the 'settings' table which often collects miscellaneous flags.

    // Tables to check:
    const tables = ['teams', 'profiles', 'referees', 'matches', 'news', 'sponsors', 'categories'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table}: Error - ${error.message}`);
        } else if (data && data.length > 0) {
            console.log(`✅ Table ${table}: Columns found:`, Object.keys(data[0]));
        } else {
            console.log(`⚠️ Table ${table}: Empty (cannot infer columns)`);
        }
    }
}

checkSchema();
