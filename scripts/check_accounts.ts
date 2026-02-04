
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config(); // Load env vars

// Helper to create client with service role for admin access if needed, or anon
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using anon key as client would
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: accounts, error } = await supabase
        .from('treasury_accounts')
        .select('*');

    if (error) {
        console.error("Error fetching accounts:", error);
    } else {
        console.log("Treasury Accounts:", accounts);
    }
}

main();
