
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use SERVICE ROLE key to create, but we want to test acting as a USER if possible, 
// OR we can test what policies exist. 
// Actually, I can't easily simulate a logged-in user with just an ID without their token.
// BUT, I can try to DELETE with the anon key and see if it fails (it should).
// The user is likely using the Dashboard which uses the authenticated user context.

// Standard client (simulating public/anon access, should fail if RLS is on unless policy allows)
// Note: To test 'authenticated' role, we'd need to sign in a dummy user.
// Let's rely on checking the DB state.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using admin to check state

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeletion() {
    console.log("1. Fetching all matches...");
    const { data: matches, error } = await supabase.from('matches').select('id, scheduled_time, status').limit(5);

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Found ${matches.length} matches.`);
    if (matches.length > 0) {
        console.log("Sample Match:", matches[0]);
        console.log("\n--- DIAGNOSTIC ---");
        console.log("I cannot simulate the specific User RLS failure without their token.");
        console.log("However, the symptom described (UI removes item, but DB retains it) is CLASSIC RLS Silent Failure.");
        console.log("It means the DELETE policy is returning '0 rows deleted' but no error.");
    }
}

checkDeletion();
