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

async function checkNews() {
    console.log("🔍 Checking News Data...");

    // Check count of ALL news (admin view)
    const { count, error: countError } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });

    console.log(`Total News in DB: ${count} (Error: ${countError?.message || 'None'})`);

    // Check recent news
    const { data, error } = await supabase
        .from('news')
        .select('id, title, status, published_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching news:", error);
        return;
    }

    console.log("Recent News Items:");
    console.table(data);
}

checkNews();
