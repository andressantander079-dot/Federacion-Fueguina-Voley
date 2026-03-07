import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data: p } = await supabase.from('profiles').select('*').limit(1);
    console.log('PROFILES:', p?.[0] ? Object.keys(p[0]) : 'None');

    const { data: mo } = await supabase.from('match_officials').select('*').limit(1);
    console.log('MATCH_OFFICIALS:', mo?.[0] ? Object.keys(mo[0]) : 'None');

    const { data: m } = await supabase.from('matches').select('*, home:teams!home_team_id(name), away:teams!away_team_id(name), tournament:tournaments(name, category:categories(name))').limit(1);
    console.log('MATCHES:', m?.[0]);
}
inspect();
