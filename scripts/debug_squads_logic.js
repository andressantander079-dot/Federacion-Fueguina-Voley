
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSquadsLogic() {
    console.log("--- Categories ---");
    const { data: categories } = await supabase.from('categories').select('*');
    if (categories) {
        categories.forEach(c => console.log(`${c.id} | ${c.name} | min_year: ${c.min_year}`));
    }

    // Pick a category (e.g., Sub 16 or any existing)
    const sub16 = categories.find(c => c.name.includes('16') || c.name.includes('Mayores'));
    if (!sub16) {
        console.log("No Sub 16/Mayores found to test.");
    } else {
        console.log(`\nTesting logic for: ${sub16.name} (${sub16.min_year})`);
        // Logic: allow younger (year >= this.year)
        const valid = categories.filter(c => (c.min_year || 0) >= (sub16.min_year || 0));
        console.log("Valid categories (should be same or younger):", valid.map(c => c.name));
    }

    console.log("\n--- Squads ---");
    const { data: squads } = await supabase.from('squads').select('*, category:categories(name)').limit(10);
    console.log(squads);

    if (squads.length > 0) {
        console.log(`\n--- Players in Squad ${squads[0].name} (${squads[0].id}) ---`);
        const { data: players } = await supabase.from('squad_players').select('count').eq('squad_id', squads[0].id);
        console.log("Count:", players);
    }
}

inspectSquadsLogic();
