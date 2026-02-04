
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log("Clearing bank data...");

    const { error } = await supabase
        .from('settings')
        .update({
            bank_name: null,
            bank_holder: null,
            bank_cbu: null,
            bank_alias: null,
            bank_cuit: null
        })
        .eq('singleton_key', true);

    if (error) console.error("Error clearing:", error);
    else console.log("Bank data cleared successfully.");
}

main();
