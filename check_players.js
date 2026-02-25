const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: cols } = await supabase.rpc('get_columns', { table_name: 'players' }).catch(x => ({ data: [] }));
    const { data: p } = await supabase.from('players').select('*').limit(1);
    console.log("Player columns:", Object.keys(p?.[0] || {}));
}
check();
