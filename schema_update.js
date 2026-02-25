const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Note: Schema updates via JS require postgres, but if we can't we can just do it via HTTP if possible. Actually supabase-js cannot do DDL directly easily unless we use an RPC.
// Let's see if we can use postgres connection string directly via pg?
