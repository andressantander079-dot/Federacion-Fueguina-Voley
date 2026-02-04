const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket(name) {
    const { data, error } = await supabase.storage.createBucket(name, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf']
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log(`Bucket '${name}' already exists.`);
        } else {
            console.error(`Error creating bucket '${name}':`, error.message);
        }
    } else {
        console.log(`Bucket '${name}' created successfully.`);
    }
}

async function main() {
    await createBucket('news-images');
    await createBucket('config-assets');
    await createBucket('message-attachments'); // Ensure this one exists too
}

main();
