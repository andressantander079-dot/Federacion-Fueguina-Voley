require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching existing settings...");
    const { data: settingsData, error: fetchErr } = await supabase.from('settings').select('*').single();

    if (fetchErr) {
        console.error("Fetch Error:", fetchErr);
        return;
    }

    if (!settingsData || !settingsData.procedure_fees) {
        console.log("No procedure fees found in settings.");
        return;
    }

    let updatedFees = settingsData.procedure_fees;
    let modified = false;

    console.log(`Found ${updatedFees.length} fees. Updating base amounts...`);

    updatedFees = updatedFees.map(fee => {
        // If it's a small number, make it 25000 (realistic value)
        if (fee.amount < 1000 || fee.amount === 2500) {
            console.log(`Updating ${fee.name} from ${fee.amount} to 25000`);
            modified = true;
            return { ...fee, amount: 25000 };
        }
        return fee;
    });

    if (modified) {
        const { error: updateErr } = await supabase.from('settings').update({ procedure_fees: updatedFees }).eq('singleton_key', true);
        if (updateErr) {
            console.error("Failed to update settings:", updateErr);
        } else {
            console.log("Successfully updated procedure_fees in settings to 25000");
        }
    } else {
        console.log("No fees needed updating.");
    }
}

main();
