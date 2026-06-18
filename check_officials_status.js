const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    const key = parts[0];
    const value = parts.slice(1).join('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStatus() {
    console.log("🔍 Fetching matches with team names containing 'Galicia' or 'Tolkeyen'...");
    const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select(`
            id,
            status,
            scheduled_time,
            home_team:teams!home_team_id(name),
            away_team:teams!away_team_id(name)
        `);
        
    if (matchErr) {
        console.error("Match error:", matchErr);
        return;
    }

    const targetMatch = matches.find(m => 
        (m.home_team?.name?.includes('Galicia') && m.away_team?.name?.includes('Tolkeyen')) ||
        (m.home_team?.name?.includes('Tolkeyen') && m.away_team?.name?.includes('Galicia'))
    );

    if (!targetMatch) {
        console.log("❌ Target match Galicia vs Tolkeyen not found.");
        return;
    }

    console.log("✅ Target Match Found:", targetMatch);

    console.log("🔍 Fetching officials for this match...");
    const { data: officials, error: offErr } = await supabase
        .from('match_officials')
        .select(`
            id,
            role,
            user_id,
            status,
            fee_amount
        `)
        .eq('match_id', targetMatch.id);

    if (offErr) {
        console.error("Officials error:", offErr);
        return;
    }

    console.log("Officials assignments:", officials);
}

checkStatus();
