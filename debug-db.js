const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Manually read .env.local to avoid dependency on dotenv package
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
    }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('--- DEBUG INFO ---');
console.log('URL found:', url ? url.substring(0, 15) + '...' : 'UNDEFINED');
console.log('Key found:', key ? 'YES (Hidden)' : 'UNDEFINED');

if (!url || !key) {
    console.error('ERROR: Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
    console.log('\n1. Testing connection to "squads" table...');
    const { data, error } = await supabase.from('squads').select('*').limit(1);

    if (error) {
        console.error('❌ ERROR:', error.message);
        console.error('Details:', error);
    } else {
        console.log('✅ SUCCESS! Connection established.');
        console.log('Table "squads" found.');
        console.log('Data sample:', data);
    }
}

testConnection();
