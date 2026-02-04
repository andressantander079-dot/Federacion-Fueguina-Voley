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

async function checkReferees() {
    console.log("🔍 Checking Referees Data...");

    // 1. Get all from 'referees'
    const { data: refs, error: refError } = await supabase.from('referees').select('*');
    if (refError) console.error("Referees Error:", refError);
    else console.log(`Found ${refs.length} referee records.`);

    // 2. Get all profiles with role 'referee'
    const { data: profiles, error: profError } = await supabase.from('profiles').select('*').eq('role', 'referee');
    if (profError) console.error("Profiles Error:", profError);
    else console.log(`Found ${profiles.length} profiles with role 'referee'.`);

    // 3. Check for mismatches
    if (refs && profiles) {
        const refIds = refs.map(r => r.id);
        const proIds = profiles.map(p => p.id);

        const orphanedRefs = refIds.filter(id => !proIds.includes(id));
        const orphanedProfiles = proIds.filter(id => !refIds.includes(id));

        if (orphanedRefs.length > 0) console.log("⚠️ Referees without Profile (or wrong role):", orphanedRefs);
        if (orphanedProfiles.length > 0) console.log("⚠️ Referee Profiles without Referee Record:", orphanedProfiles);

        if (orphanedRefs.length === 0 && orphanedProfiles.length === 0) {
            console.log("✅ Data consistency looks good. IDs match.");
            // If consistency is good but list is empty, maybe the JOIN in the page is filtered strangely?
            // Page uses: supabase.from('referees').select('..., profile:profiles(...)')
            // This is a left join by default usually, unless !inner.
        }
    }
}

checkReferees();
