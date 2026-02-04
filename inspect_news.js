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

async function inspect() {
    console.log("🔍 Inspecting News Table...");

    const { data, error } = await supabase
        .from('news')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching news:", error);
    } else if (data && data.length > 0) {
        console.log("✅ Columns found in 'news':");
        console.log(Object.keys(data[0]).join('\n'));
    } else {
        console.log("⚠️ News table is empty, cannot infer columns from data.");
        // Try inserting a dummy to see errors? No, dangerous.
    }
}

inspect();
