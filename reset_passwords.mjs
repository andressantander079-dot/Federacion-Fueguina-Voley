import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPasswords() {
    console.log("Starting password reset...");
    
    // Almagro-club@federacion.com id
    const { data: users, error: errorUsers } = await supabase.auth.admin.listUsers();
    if(errorUsers) {
        console.error(errorUsers);
        return;
    }

    const almagro = users.users.find(u => u.email === 'almagro-club@federacion.com');
    const huracan = users.users.find(u => u.email === 'huracan-club@federacion.com');

    if(almagro) {
        const { data, error } = await supabase.auth.admin.updateUserById(
            almagro.id,
            { password: 'password123' }
        );
        if(!error) console.log("Almagro password reset to password123");
    }

    if(huracan) {
        const { data, error } = await supabase.auth.admin.updateUserById(
            huracan.id,
            { password: 'password123' }
        );
        if(!error) console.log("Huracan password reset to password123");
    }

    console.log("Done.");
}

resetPasswords();
