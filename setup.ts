import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function applyMigrations() {
    // 1. Alter Table
    const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;'
    });
    if (sqlError) console.log('SQL Error:', sqlError.message);
    else console.log('Column avatar_url added or already exists.');

    // 2. Create Storage Bucket
    const { data, error: storageError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
    });

    if (storageError) {
        if (storageError.message.includes('already exists') || storageError.message.includes('Duplicate')) {
            console.log('Bucket "avatars" already exists.');
        } else {
            console.log('Bucket Error:', storageError.message);
        }
    } else {
        console.log('Bucket "avatars" created successfully.');
    }
}

applyMigrations();
