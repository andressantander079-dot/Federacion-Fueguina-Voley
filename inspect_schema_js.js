const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    // 1. Check Players Table (look for reason/comments)
    // We can't query information_schema directly with supabase-js easily unless we use rpc or just check data.
    // So we will insert a dummy row and see if it fails? No, that's risky.
    // We will just try to select 'rejection_reason' from players.
    const { data: pData, error: pError } = await supabase.from('players').select('rejection_reason').limit(1);

    console.log("Players 'rejection_reason' check:", pError ? "Column likely missing (" + pError.message + ")" : "Column exists");

    // 2. Check Settings (look for fee)
    const { data: sData, error: sError } = await supabase.from('settings').select('*').single();
    if (sError) console.error("Settings error:", sError);
    else console.log("Settings Data:", sData);
}

inspect();
