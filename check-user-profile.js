const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Manually read .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('--- DIAGNOSTIC SCRIPT ---');
const supabase = createClient(url, key);

async function checkData() {
    console.log('\n--- 1. PROFILES (JSON) ---');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error(pError);
    else console.log(JSON.stringify(profiles, null, 2));

    console.log('\n--- 2. TEAMS (JSON) ---');
    const { data: teams, error: tError } = await supabase.from('teams').select('id, name');
    if (tError) console.error(tError);
    else console.log(JSON.stringify(teams, null, 2));
}

checkData();
