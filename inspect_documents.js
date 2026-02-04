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

async function inspectDocs() {
    console.log("🔍 Inspecting Documents Table...");

    // Check columns
    const { data: cols, error: colError } = await supabase
        .from('documents')
        .select('*')
        .limit(1);

    if (colError) console.error("Error/Empty:", colError);
    else if (cols.length > 0) console.log("Cols:", Object.keys(cols[0]));
    else console.log("Table exists but empty.");

    // Note: We can't easily check policies via JS client without specific RPCs usually.
    // relying on 'RLS violation' message from user is enough to know we need to ADD policies.
}

inspectDocs();
