const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function inspect() {
  const { data: matches, error } = await supabase.from('matches').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else if (matches && matches[0]) {
    const row = { ...matches[0] };
    delete row.sheet_data; // Quitar el JSON grande para evitar truncado
    console.log("Columnas de matches:", Object.keys(matches[0]));
    console.log("Valores sin sheet_data:", row);
  }
}

inspect();
