
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // or SERVICE_ROLE_KEY if available

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPolicies() {
    // We can't query pg_policies directly via client usually due to permissions.
    // But we can try to insert and see the error?
    // Or check if we can query strictly via rpc if available.

    // Let's try to query match_lineups directly to see if we can read.
    const { data, error } = await supabase.from('match_lineups').select('*').limit(1);
    console.log('Read Test:', { data, error });

    // If we can't read, then RLS is blocking Select too.

    // Checking if we can authenticate as the user to reproduce?
    // Hard to do without their token.

    console.log('Done.');
}

inspectPolicies();
