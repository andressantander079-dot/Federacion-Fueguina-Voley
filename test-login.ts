import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const email = '52175634@federacion.com';
  const pass = '466983';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });

  if (error) {
    console.error("Login failed:", error.message);
    return;
  }

  console.log("Logged in user:", data.user?.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user?.id)
    .single();

  if (profileError) {
    console.error("Profile fetch failed:", profileError.message);
  } else {
    console.log("Fetched profile:", profile);
  }
}

testLogin();
