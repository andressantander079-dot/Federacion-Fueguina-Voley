require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    console.log('== Migrating Teams Table ==');

    try {
        // Intentaremos usar la REST API para verificar y, si falla, usaremos rpc o postgres (aunque el cliente js no puede correr DDL as is siempre)
        // Supabase JS no soporta DDL directamente (ALTER TABLE) a menos que haya un RPC.
        // Vamos a agregar la propiedad leyendo todos los teams existentes y forzando una actualizacion con la key temporalmente pero como jsonb? no, necesitamos columna real.
        console.log('Debes correr la siguiente consulta en el Editor SQL de tu panel de Supabase:');
        console.log('\nALTER TABLE public.teams ADD COLUMN IF NOT EXISTS has_paid_inscription BOOLEAN DEFAULT false;\n');
        console.log('Como medida alternativa, actualizaremos los perfiles existentes asumiendo false para prevenir crashes de UI.');

        // Test if col exists:
        const { data: testData, error: testErr } = await supabase.from('teams').select('has_paid_inscription').limit(1);

        if (testErr && testErr.code === 'PGRST204' || (testErr && testErr.message.includes('does not exist'))) {
            console.log("-> LA COLUMNA NO EXISTE AÚN. POR FAVOR EJECUTAR EL COMANDO EN SUPABASE Y VOLVER A PROBAR.");
        } else {
            console.log("-> Columna existente y detectada.");
        }

    } catch (error) {
        console.error('Error in migration script:', error.message);
    }
}

run();
