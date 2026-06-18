const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envConfig = {};
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envConfig[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
} catch (e) {}

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Faltan variables en .env.local");
    process.exit(1);
}

// Inicializar cliente administrativo
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function initBucket() {
    console.log("Intentando crear el bucket 'match-signatures'...");
    
    // Crear el bucket
    const { data, error } = await supabase.storage.createBucket('match-signatures', {
        public: true,
        allowedMimeTypes: ['image/png'],
        fileSizeLimit: 1024 * 1024 * 2 // 2MB
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log("El bucket 'match-signatures' ya existe.");
        } else {
            console.error("Error al crear el bucket:", error);
        }
    } else {
        console.log("Bucket creado exitosamente:", data);
    }
}

initBucket();
