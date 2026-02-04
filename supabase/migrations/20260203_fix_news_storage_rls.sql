-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop potentially conflicting or incomplete policies
DROP POLICY IF EXISTS "Allow Authenticated Uploads News" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read News" ON storage.objects;
DROP POLICY IF EXISTS "News Images Access" ON storage.objects;

-- Comprehensive Policy for Authenticated Users (Insert, Update, Delete, Select)
CREATE POLICY "News Images Admin Access"
ON storage.objects
FOR ALL
TO authenticated
USING ( bucket_id = 'news-images' )
WITH CHECK ( bucket_id = 'news-images' );

-- Public Read Access
CREATE POLICY "News Images Public Read"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'news-images' );
