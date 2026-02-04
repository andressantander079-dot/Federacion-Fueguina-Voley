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

async function inspectTournaments() {
    console.log("🔍 Inspecting Tournaments...");

    const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('id, name, gender, category:categories(id, name)')
        .limit(10);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Tournaments found:", tournaments.length);
        tournaments.forEach(t => {
            console.log(`- [${t.name}] Gender: ${t.gender}, Category:`, t.category);
        });
    }
}

inspectTournaments();
