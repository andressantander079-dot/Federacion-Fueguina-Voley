
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProfilesRLS() {
    console.log("--- Checking Profiles Table Permissions ---");
    // Try to fetch profiles as anonymously? No we need to emulate logic.
    // Let's just create a migration to Fix Profiles RLS to be sure.
    // Profile reading is essential for Login.

    // Check if we can Read.
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log("Service Role Read:", data ? "OK" : error);
}
checkProfilesRLS();
