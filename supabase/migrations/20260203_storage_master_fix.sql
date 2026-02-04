-- 1. Ensure Buckets are Public
UPDATE storage.buckets SET public = true WHERE id IN ('player-photos', 'procedure-files', 'club-logos', 'news-images');

-- 2. Drop existing policies to avoid conflicts (clean slate for these buckets)
DROP POLICY IF EXISTS "Public View Player Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public View Procedure Files" ON storage.objects;
DROP POLICY IF EXISTS "Public View Club Logos" ON storage.objects;
DROP POLICY IF EXISTS "Public View News Images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Player Photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Procedure Files" ON storage.objects;

-- 3. Create Permissive SELECT Policies (Allow everyone to view)
CREATE POLICY "Public View Player Photos" ON storage.objects FOR SELECT USING (bucket_id = 'player-photos');
CREATE POLICY "Public View Procedure Files" ON storage.objects FOR SELECT USING (bucket_id = 'procedure-files');
CREATE POLICY "Public View Club Logos" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');
CREATE POLICY "Public View News Images" ON storage.objects FOR SELECT USING (bucket_id = 'news-images');

-- 4. Create Permissive INSERT/UPDATE/DELETE Policies (Authenticated Users)
-- (Adjust as needed, currently allowing authenticated users to manage files in these buckets)
CREATE POLICY "Allow Auth Manage Player Photos" ON storage.objects 
    FOR ALL 
    TO authenticated 
    USING (bucket_id = 'player-photos') 
    WITH CHECK (bucket_id = 'player-photos');

CREATE POLICY "Allow Auth Manage Procedure Files" ON storage.objects 
    FOR ALL 
    TO authenticated 
    USING (bucket_id = 'procedure-files') 
    WITH CHECK (bucket_id = 'procedure-files');

-- Force schema reload
NOTIFY pgrst, 'reload schema';
