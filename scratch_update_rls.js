const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function updateRLS() {
  console.log("Actualizando políticas RLS para match-signatures...");
  
  const sql = `
    DROP POLICY IF EXISTS "Inserción de firmas por árbitros" ON storage.objects;
    DROP POLICY IF EXISTS "Edición de firmas por árbitros" ON storage.objects;
    DROP POLICY IF EXISTS "Inserción pública de firmas" ON storage.objects;
    DROP POLICY IF EXISTS "Edición pública de firmas" ON storage.objects;

    CREATE POLICY "Inserción pública de firmas"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'match-signatures' );

    CREATE POLICY "Edición pública de firmas"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'match-signatures' );
  `;

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: sql
  });

  if (error) {
    console.error("Error al ejecutar el SQL mediante RPC:", error);
    process.exit(1);
  }

  console.log("¡Políticas RLS actualizadas con éxito!");
}

updateRLS();
