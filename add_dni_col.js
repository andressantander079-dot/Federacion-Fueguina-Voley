const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function addCol() {
  console.log("Adding dni_url to players table via RPC exec_sql...");
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: 'ALTER TABLE public.players ADD COLUMN IF NOT EXISTS dni_url text;'
  });

  if (error) {
    console.error("RPC Error (Might not exist):", error);
    process.exit(1);
  }

  console.log("Success! Column dni_url added.");
}

addCol();
