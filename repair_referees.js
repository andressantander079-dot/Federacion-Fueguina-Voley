const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function repair() {
    console.log("🛠️ Iniciando Reparación Automática de Árbitros...");

    // 1. Obtener Perfiles con rol 'referee'
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'referee');

    if (pError) return console.error("Error obteniendo perfiles:", pError);

    // 2. Obtener Árbitros existentes
    const { data: referees, error: rError } = await supabase
        .from('referees')
        .select('id');

    if (rError) return console.error("Error obteniendo árbitros:", rError);

    const existingIds = new Set(referees.map(r => r.id));
    const missing = profiles.filter(p => !existingIds.has(p.id));

    console.log(`🔍 Se encontraron ${missing.length} perfiles huérfanos.`);

    // 3. Insertar faltantes
    for (const p of missing) {
        const parts = (p.full_name || '').trim().split(' ');
        const first = parts[0] || '-';
        const last = parts.slice(1).join(' ') || '-';

        const { error } = await supabase
            .from('referees')
            .insert({
                id: p.id,
                first_name: first,
                last_name: last,
                category: 'Provincial'
            });

        if (error) console.error(`❌ Falló reparación de ${p.full_name}:`, error.message);
        else console.log(`✅ Reparado: ${p.full_name}`);
    }
    console.log("🚀 Reparación Completa.");
}

repair();
