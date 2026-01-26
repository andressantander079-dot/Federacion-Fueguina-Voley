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
    console.log('\n--- LISTING ALL TABLES ---');
    // We cannot query information_schema easily via supabase-js client directly usually without rpc or specific permissions on some setups, 
    // but we can try listing a known set or just error handling.
    // ACTUALLY, let's try to just list what we can see. 
    // Since we can't query information_schema directly with supabase-js easily on anon key usually,
    // let's try to infer or just check common names.

    const candidates = ['organization_settings', 'settings', 'config', 'app_config', 'parameters'];

    for (const table of candidates) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        console.log(`Table '${table}':`, error ? `❌ ${error.message}` : `✅ FOUND (${data.length} rows)`);
    }
}

checkData();
