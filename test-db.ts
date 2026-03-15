import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPases() {
  const dni = '52175634';
  const { data, error } = await supabase
    .from('tramites_pases')
    .select('*')
    .eq('temp_user', dni);

  if (error) {
    console.error("Query Error:", error.message);
  } else {
    console.log("Pases found:", data);
  }
}

checkPases();
