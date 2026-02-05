const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log("Checking squads columns...");

    const { data, error } = await supabase
        .from('squads')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        if (data.length === 0) {
            console.log("No rows in squads, but table exists.");
            // We can try to insert or just assume columns from error if we tried to select specific ones? 
            // Better: console log the keys if there is data.
        } else {
            console.log("Columns found via row inspection:", Object.keys(data[0]));
            console.log("Sample Data:", data[0]);
        }
    }
}

main();
