import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
  console.log("Logging in as user...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: '52175634@federacion.com',
    password: '466983'
  });

  if (authError || !authData.user) {
    console.error("Login failed:", authError);
    return;
  }

  console.log("Logged in:", authData.user.id);

  console.log("Fetching profile for id:", authData.user.id);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  console.log("Profile Result:", profile);
  console.log("Profile Error:", profileError);
}

testRLS();
