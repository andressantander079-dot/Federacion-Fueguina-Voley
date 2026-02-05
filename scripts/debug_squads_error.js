
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSquadsError() {
    console.log("--- Squads Inspection ---");
    // Try simple select first
    const { data: simple, error: simpleError } = await supabase.from('squads').select('*').limit(5);
    if (simpleError) {
        console.error("Simple Select Error:", simpleError);
    } else {
        console.log("Simple Select Count:", simple.length);
        if (simple.length > 0) console.log("Sample:", simple[0]);
    }

    // Try relation
    const { data: rel, error: relError } = await supabase.from('squads').select('*, category:categories(name)').limit(5);
    if (relError) {
        console.error("Relation Select Error:", relError);
    } else {
        console.log("Relation Select Success");
    }
}

inspectSquadsError();
