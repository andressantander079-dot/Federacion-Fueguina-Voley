const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSettings() {
    console.log("🔍 Checking Settings Table Schema...");

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error fetching settings:", error);
    } else {
        if (data && data.length > 0) {
            console.log("✅ Settings row found.");
            console.log("--- Columns ---");
            const columns = Object.keys(data[0]);
            console.log(columns.join(', '));
            
            // enhanced check for specific columns
            const expected = ['bank_name', 'bank_holder', 'bank_cbu', 'bank_alias', 'bank_cuit', 'player_fee'];
            const missing = expected.filter(col => !columns.includes(col));
            
            if (missing.length > 0) {
                console.log("⚠️ MISSING COLUMNS:", missing.join(', '));
            } else {
                console.log("✅ All bank/fee columns present.");
            }
        } else {
            console.log("⚠️ Settings table empty (no rows).");
        }
    }
}

checkSettings();
