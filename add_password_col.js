const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPasswordColumn() {
    console.log("Intentando agregar columna 'password' a la tabla 'squads'...");

    // Using rpc to execute SQL if available, or just documenting that we need DDL.
    // However, in this environment, we might need to use a trick if rpc 'exec_sql' exists.
    // If not, I will inform the user.

    const { error } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE squads ADD COLUMN IF NOT EXISTS password TEXT;"
    });

    if (error) {
        console.error("Error al ejecutar SQL via RPC:", error);
        console.log("Nota: Si el RPC 'exec_sql' no existe, esto es esperado. En ese caso, la columna debe agregarse manualmente desde el Dashboard de Supabase.");
    } else {
        console.log("Columna 'password' agregada exitosamente (o ya existía).");
    }
}

addPasswordColumn();
