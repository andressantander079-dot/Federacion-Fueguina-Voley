import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('players').select('*').eq('dni', '54700700');
  console.log("Player Data:", data);
  
  const { data: pase } = await supabase.from('tramites_pases').select('*').eq('player_id', data?.[0]?.id);
  console.log("Pases:", pase);
}
check();
