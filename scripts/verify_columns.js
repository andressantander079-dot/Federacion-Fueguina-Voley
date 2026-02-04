
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log("Checking columns...");

    // Try to select the new columns specifically
    const { data, error } = await supabase
        .from('settings')
        .select('id, bank_name, procedure_fees')
        .single();

    if (error) {
        console.error("ERROR:", error.message);
        if (error.code === 'PGRST100') console.log("HINT: Columns likely missing.");
    } else {
        console.log("SUCCESS: Columns found.");
        console.log("Data:", data);
    }
}

main();
