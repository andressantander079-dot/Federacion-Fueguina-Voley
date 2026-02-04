const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    console.log("🔍 Listing Tables...");
    // Since we can't query information_schema easily with js client without rpc,
    // we will rely on a known list derived from previous context or try to inspect via a hack?
    // Actually, create-referee checked 'referees', 'profiles'.
    // Let's check common Spanish names we might expect based on the app:
    // tramites, solicitudes, partidos, equipos, etc.

    // A better way is to assume English is the goal and check what we have.
    // I will try to select 1 row from potential Spanish table names.
    const candidates = ['tramites', 'partidos', 'equipos', 'jugadores', 'canchas', 'sponsors', 'news', 'messages'];

    for (const table of candidates) {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (!error) {
            console.log(`⚠️ Potential Spanish Table Found: ${table}`);
        } else {
            // If error code is '42P01' (relation does not exist), it's good.
            if (error.code !== '42P01') {
                console.log(`✅ Table ${table}: Exists (or other error ${error.code})`);
            }
        }
    }
}

listTables();
