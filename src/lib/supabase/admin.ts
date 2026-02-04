import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // DEBUG: Ver qué variables están cargadas
    const loadedKeys = Object.keys(process.env).filter(key => key.includes('SUPABASE'));
    console.log("DEBUG ENV: Keys loaded related to Supabase:", loadedKeys);

    if (!supabaseUrl) {
        throw new Error("ADMIN CLIENT ERROR: Missing NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!serviceRoleKey) {
        throw new Error(`ADMIN CLIENT ERROR: Missing SUPABASE_SERVICE_ROLE_KEY. Keys found: ${loadedKeys.join(', ')}`);
    }

    return createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
