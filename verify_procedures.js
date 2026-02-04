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

async function verify() {
    console.log("🔍 Verifying Procedures Table...");

    // Check if table 'procedures' exists and get one row or just check for error
    const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .limit(1);

    if (error) {
        console.log(`❌ Table 'procedures' error: ${error.message} (${error.code})`);

        // Check if 'tramites' exists instead
        const { error: tError } = await supabase.from('tramites').select('count').limit(1);
        if (!tError) console.log("⚠️ Table 'tramites' STILL EXISTS.");
    } else {
        console.log("✅ Table 'procedures' EXISTS.");
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]).join(', '));
        } else {
            console.log("✅ Table is empty but exists.");
        }
    }
}

verify();
