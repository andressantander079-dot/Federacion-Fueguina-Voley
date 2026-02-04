const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually because we are running a standalone script
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Faltan credenciales en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔍 Verificando acceso a la Base de Datos...");

    // 1. Check Referees Table (Should include category)
    const { data: refData, error: refError } = await supabase.from('referees').select('category').limit(1);

    if (refError) {
        console.error("❌ Error conectando tabla 'referees':", refError.message);
    } else {
        console.log("✅ Tabla 'referees' accesible. (Columna category detectada)");
    }

    // 2. Check Match Officials (New Table)
    const { data: moData, error: moError } = await supabase.from('match_officials').select('id').limit(1);

    if (moError) {
        console.error("❌ Error conectando tabla 'match_officials':", moError.message);
        console.log("⚠️ PISTA: Probablemente falta correr el SQL de migración que te pasé.");
    } else {
        console.log("✅ Tabla 'match_officials' detectada y accesible.");
    }

    // 3. Check Restrictions (New Table)
    const { error: rrError } = await supabase.from('referee_restrictions').select('id').limit(1);
    if (!rrError) {
        console.log("✅ Tabla 'referee_restrictions' detectada y accesible.");
    } else {
        console.error("❌ Error conectando tabla 'referee_restrictions':", rrError.message);
    }
}

check();
